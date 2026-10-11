-- =====================================================================
-- Agenda Clínica — esquema inicial
-- Principios:
--  * RLS activada en TODAS las tablas: cada fila pertenece a un único owner_id.
--  * Los campos de texto clínico libre (*_enc) se almacenan CIFRADOS desde el
--    servidor (AES-256-GCM, ver src/lib/crypto.ts). La base nunca ve el texto plano.
--  * Los campos necesarios para buscar/filtrar (nombre, estado) quedan en claro,
--    protegidos por RLS y por el cifrado en reposo de Supabase.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
create type patient_status as enum ('activo', 'en_pausa', 'alta');
create type session_status as enum ('programada', 'realizada', 'cancelada', 'no_asistio');
create type alert_kind     as enum ('riesgo', 'seguimiento', 'tarea_control', 'cumpleanos', 'hito', 'recordatorio_sesion');

-- ---------- Perfil de la profesional ----------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  notify_email   text not null default 'ps.rominapazrr@gmail.com',
  calendar_id    text not null default 'ps.rominapazrr@gmail.com',
  reminder_days  int  not null default 2 check (reminder_days between 0 and 14),
  ics_token      text not null default encode(gen_random_bytes(24), 'hex'),
  created_at     timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Pacientes ----------
create table public.patients (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name        text not null,
  birth_date       date,
  email            text,
  phone            text,
  status           patient_status not null default 'activo',
  -- Campos clínicos cifrados
  reason_enc       text,   -- motivo de consulta
  history_enc      text,   -- antecedentes relevantes
  key_notes_enc    text,   -- NOTAS CLAVE / insights (lo primero que se lee antes de cada sesión)
  -- Riesgo
  risk_high        boolean not null default false,
  risk_note_enc    text,
  risk_marked_at   timestamptz,
  -- Seguimiento: días máximos sin sesión. NULL = sin alerta (si es riesgo alto, se asume 7)
  followup_days    int check (followup_days between 1 and 365),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index patients_owner_status_idx on public.patients (owner_id, status);
create index patients_owner_risk_idx   on public.patients (owner_id) where risk_high;
create index patients_name_idx         on public.patients (owner_id, lower(full_name));

-- ---------- Sesiones (agenda + nota estructurada) ----------
create table public.sessions (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  patient_id          uuid not null references public.patients(id) on delete cascade,
  scheduled_at        timestamptz not null,
  duration_min        int not null default 50 check (duration_min between 10 and 240),
  status              session_status not null default 'programada',
  -- Nota de sesión cifrada
  symptoms_enc        text,   -- síntomas reportados
  intervention_enc    text,   -- intervención realizada
  next_tasks_enc      text,   -- tareas / acuerdos para la próxima sesión
  -- Integraciones
  google_event_id     text,
  reminder_sent_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index sessions_owner_date_idx   on public.sessions (owner_id, scheduled_at);
create index sessions_patient_date_idx on public.sessions (patient_id, scheduled_at desc);

-- ---------- Notas rápidas (bandeja por procesar) ----------
create table public.quick_notes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  patient_id    uuid references public.patients(id) on delete set null,
  body_enc      text not null,
  processed     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index quick_notes_pending_idx on public.quick_notes (owner_id) where not processed;

-- ---------- Hitos terapéuticos ----------
create table public.milestones (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  patient_id   uuid not null references public.patients(id) on delete cascade,
  title_enc    text not null,
  due_date     date not null,
  done         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index milestones_due_idx on public.milestones (owner_id, due_date) where not done;

-- ---------- Alertas persistidas (las genera el cron diario) ----------
create table public.alerts (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  patient_id   uuid references public.patients(id) on delete cascade,
  kind         alert_kind not null,
  message      text not null,           -- sin datos clínicos: solo referencias genéricas
  dedupe_key   text not null,           -- evita duplicados (p. ej. 'seguimiento:<paciente>:2026-10-11')
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (owner_id, dedupe_key)
);
create index alerts_open_idx on public.alerts (owner_id, created_at desc) where not resolved;

-- ---------- Bitácora de auditoría (HIPAA: quién accedió a qué) ----------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action      text not null,         -- 'ver_ficha', 'editar_nota', 'marcar_riesgo', ...
  entity      text not null,
  entity_id   uuid,
  created_at  timestamptz not null default now()
);
create index audit_owner_idx on public.audit_log (owner_id, created_at desc);

-- ---------- updated_at automático ----------
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger patients_touch before update on public.patients for each row execute function public.touch_updated_at();
create trigger sessions_touch before update on public.sessions for each row execute function public.touch_updated_at();

-- ---------- Integridad: la sesión debe pertenecer a un paciente del mismo owner ----------
create function public.check_same_owner() returns trigger language plpgsql as $$
begin
  if new.patient_id is not null and not exists (
    select 1 from public.patients p where p.id = new.patient_id and p.owner_id = new.owner_id
  ) then
    raise exception 'El paciente no pertenece al usuario';
  end if;
  return new;
end $$;

create trigger sessions_same_owner   before insert or update on public.sessions    for each row execute function public.check_same_owner();
create trigger quick_notes_same_owner before insert or update on public.quick_notes for each row execute function public.check_same_owner();
create trigger milestones_same_owner  before insert or update on public.milestones  for each row execute function public.check_same_owner();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles    enable row level security;
alter table public.patients    enable row level security;
alter table public.sessions    enable row level security;
alter table public.quick_notes enable row level security;
alter table public.milestones  enable row level security;
alter table public.alerts      enable row level security;
alter table public.audit_log   enable row level security;

create policy "perfil propio" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "pacientes propios"   on public.patients    for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "sesiones propias"    on public.sessions    for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "notas rapidas"       on public.quick_notes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "hitos propios"       on public.milestones  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "alertas propias"     on public.alerts      for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- La bitácora es de solo inserción y lectura: nadie puede modificarla ni borrarla.
create policy "auditoria insertar" on public.audit_log for insert with check (owner_id = auth.uid());
create policy "auditoria leer"     on public.audit_log for select using (owner_id = auth.uid());
