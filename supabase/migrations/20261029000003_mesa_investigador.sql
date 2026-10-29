-- Mesa del investigador (motor 4): expedientes cifrados en el navegador.
-- El servidor guarda solo texto cifrado (AES-GCM) y las claves de datos envueltas con la clave del investigador
-- y con su código de recuperación (PBKDF2). Nadie más que el investigador puede leer el contenido.

create table public.bovedas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  marca text not null check (length(marca) between 2 and 160),           -- nombre de la consultora en actas e informes
  iteraciones integer not null check (iteraciones >= 310000),
  sal text not null check (length(sal) <= 64),
  iv text not null check (length(iv) <= 32),
  dek_c text not null check (length(dek_c) <= 200),
  sal_rec text not null check (length(sal_rec) <= 64),
  iv_rec text not null check (length(iv_rec) <= 32),
  dek_rec_c text not null check (length(dek_rec_c) <= 200),
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create table public.expedientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  iv text not null check (length(iv) <= 32),
  datos text not null check (length(datos) <= 6000000),
  version integer not null default 1,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index on public.expedientes (user_id, actualizado_en desc);

alter table public.bovedas enable row level security;
alter table public.expedientes enable row level security;
revoke all on public.bovedas, public.expedientes from anon, authenticated;
grant select, insert, update on public.bovedas to authenticated;
grant select, insert, delete on public.expedientes to authenticated;
grant update (iv, datos) on public.expedientes to authenticated;

create policy bovedas_propia on public.bovedas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy expedientes_propios on public.expedientes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Versión y fecha las fija el servidor: el cliente actualiza solo si conoce la versión vigente (evita pisar cambios de otra pestaña).
create or replace function public.versionar_expediente() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.actualizado_en := now();
  return new;
end $$;
create trigger expedientes_version before update on public.expedientes for each row execute function public.versionar_expediente();

create or replace function public.tocar_boveda() returns trigger
language plpgsql set search_path = '' as $$
begin new.actualizada_en := now(); return new; end $$;
create trigger bovedas_fecha before update on public.bovedas for each row execute function public.tocar_boveda();

revoke execute on function public.versionar_expediente(), public.tocar_boveda() from public, anon, authenticated;
