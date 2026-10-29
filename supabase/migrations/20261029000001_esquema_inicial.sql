-- Plataforma Karin · Ruiz & Morales
-- Esquema inicial: empresas, miembros, denuncias, identidad reservada, bitácora y mensajes.
-- Regla general: cada empresa ve solo lo suyo (RLS). La identidad de las personas afectadas y denunciantes
-- se guarda aparte y solo la ven los miembros autorizados. El público solo puede crear una denuncia y
-- consultarla con su código y su clave, mediante funciones que no exponen nada más.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tablas ----------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(nombre) between 2 and 160),
  rut text check (rut is null or length(rut) <= 15),
  correo_contacto text check (correo_contacto is null or length(correo_contacto) <= 160),
  slug text not null unique default encode(extensions.gen_random_bytes(9), 'hex'),
  inhabiles_extra date[] not null default '{}',
  creada_en timestamptz not null default now(),
  creada_por uuid references auth.users(id) on delete set null
);

create table public.miembros (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null default 'encargado' check (rol in ('administrador', 'encargado')),
  ve_identidad boolean not null default true,
  agregado_en timestamptz not null default now(),
  primary key (empresa_id, user_id)
);
create index on public.miembros (user_id);

create table public.denuncias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folio integer not null,
  recibida_en timestamptz not null default now(),
  via text not null default 'canal' check (via in ('canal', 'verbal', 'escrita', 'correo', 'otra')),
  tipos text[] not null check (tipos <@ array['acoso_laboral', 'acoso_sexual', 'violencia_trabajo']::text[] and cardinality(tipos) > 0),
  denunciados jsonb not null default '[]' check (jsonb_typeof(denunciados) = 'array' and length(denunciados::text) <= 4000),
  vinculo text check (vinculo is null or length(vinculo) <= 1000),
  hechos text not null check (length(hechos) between 20 and 20000),
  testigos text check (testigos is null or length(testigos) <= 4000),
  solicita_derivacion boolean not null default false,
  contra_representante boolean not null default false,
  -- Seguimiento por parte de quien denuncia: el código se muestra; de la clave solo se guarda el hash.
  codigo text not null unique,
  clave_hash text not null,
  -- Hitos que registra la empresa (fechas en hora de Chile)
  estado text not null default 'recibida' check (estado in ('recibida', 'en_investigacion', 'derivada_dt', 'informe_remitido', 'pronunciamiento', 'cerrada')),
  medidas_resguardo text check (medidas_resguardo is null or length(medidas_resguardo) <= 4000),
  medidas_resguardo_en date,
  decision text check (decision in ('investigacion_interna', 'derivada_dt')),
  dt_informada_en date,
  decision_comunicada_en date,
  investigador text check (investigador is null or length(investigador) <= 200),
  investigacion_cerrada_en date,
  informe_remitido_en date,
  pronunciamiento_notificado_en date,
  medidas_aplicadas_en date,
  notas text check (notas is null or length(notas) <= 8000),
  unique (empresa_id, folio)
);
create index on public.denuncias (empresa_id, recibida_en desc);

-- Identidad reservada (DS 21/2024, art. 11 a): se separa para limitar quién la ve.
create table public.denuncia_identidad (
  denuncia_id uuid primary key references public.denuncias(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  afectado_nombre text not null check (length(afectado_nombre) between 2 and 160),
  afectado_rut text not null check (length(afectado_rut) between 3 and 15),
  afectado_correo text not null check (length(afectado_correo) between 3 and 160),
  afectado_telefono text check (afectado_telefono is null or length(afectado_telefono) <= 40),
  afectado_cargo text check (afectado_cargo is null or length(afectado_cargo) <= 160),
  denunciante_distinto boolean not null default false,
  denunciante_nombre text check (denunciante_nombre is null or length(denunciante_nombre) <= 160),
  denunciante_rut text check (denunciante_rut is null or length(denunciante_rut) <= 15),
  denunciante_correo text check (denunciante_correo is null or length(denunciante_correo) <= 160),
  representacion text check (representacion is null or length(representacion) <= 400)
);

create table public.eventos (
  id bigint generated always as identity primary key,
  denuncia_id uuid not null references public.denuncias(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null check (length(tipo) <= 60),
  detalle text check (detalle is null or length(detalle) <= 2000),
  autor uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);
create index on public.eventos (denuncia_id, creado_en);

create table public.mensajes (
  id bigint generated always as identity primary key,
  denuncia_id uuid not null references public.denuncias(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  autor text not null check (autor in ('denunciante', 'empresa')),
  user_id uuid references auth.users(id) on delete set null,
  texto text not null check (length(texto) between 1 and 4000),
  creado_en timestamptz not null default now()
);
create index on public.mensajes (denuncia_id, creado_en);

-- ---------- Funciones auxiliares (sin exponer datos) ----------
create or replace function public.es_miembro(e uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros m where m.empresa_id = e and m.user_id = (select auth.uid()));
$$;

create or replace function public.es_admin(e uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros m where m.empresa_id = e and m.user_id = (select auth.uid()) and m.rol = 'administrador');
$$;

create or replace function public.ve_identidad(e uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros m where m.empresa_id = e and m.user_id = (select auth.uid()) and m.ve_identidad);
$$;

-- ---------- Seguridad por fila ----------
alter table public.empresas enable row level security;
alter table public.miembros enable row level security;
alter table public.denuncias enable row level security;
alter table public.denuncia_identidad enable row level security;
alter table public.eventos enable row level security;
alter table public.mensajes enable row level security;

revoke all on public.empresas, public.miembros, public.denuncias, public.denuncia_identidad, public.eventos, public.mensajes from anon, authenticated;

grant select on public.empresas, public.miembros, public.denuncias, public.eventos, public.mensajes to authenticated;
grant select, insert, update on public.denuncia_identidad to authenticated;
grant update (nombre, rut, correo_contacto, inhabiles_extra) on public.empresas to authenticated;
grant update (estado, medidas_resguardo, medidas_resguardo_en, decision, dt_informada_en, decision_comunicada_en, investigador,
  investigacion_cerrada_en, informe_remitido_en, pronunciamiento_notificado_en, medidas_aplicadas_en, notas, contra_representante)
  on public.denuncias to authenticated;
grant insert (denuncia_id, empresa_id, tipo, detalle) on public.eventos to authenticated;
grant insert (denuncia_id, empresa_id, autor, texto) on public.mensajes to authenticated;

create policy empresas_ver on public.empresas for select to authenticated using (public.es_miembro(id));
create policy empresas_editar on public.empresas for update to authenticated using (public.es_admin(id)) with check (public.es_admin(id));

create policy miembros_ver on public.miembros for select to authenticated using (public.es_miembro(empresa_id));

create policy denuncias_ver on public.denuncias for select to authenticated using (public.es_miembro(empresa_id));
create policy denuncias_editar on public.denuncias for update to authenticated using (public.es_miembro(empresa_id)) with check (public.es_miembro(empresa_id));

create policy identidad_ver on public.denuncia_identidad for select to authenticated using (public.ve_identidad(empresa_id));
create policy identidad_crear on public.denuncia_identidad for insert to authenticated
  with check (public.ve_identidad(empresa_id) and exists (select 1 from public.denuncias d where d.id = denuncia_id and d.empresa_id = denuncia_identidad.empresa_id));
create policy identidad_editar on public.denuncia_identidad for update to authenticated using (public.ve_identidad(empresa_id)) with check (public.ve_identidad(empresa_id));

create policy eventos_ver on public.eventos for select to authenticated using (public.es_miembro(empresa_id));
create policy eventos_crear on public.eventos for insert to authenticated
  with check (public.es_miembro(empresa_id) and exists (select 1 from public.denuncias d where d.id = denuncia_id and d.empresa_id = eventos.empresa_id));

create policy mensajes_ver on public.mensajes for select to authenticated using (public.es_miembro(empresa_id));
create policy mensajes_crear on public.mensajes for insert to authenticated
  with check (autor = 'empresa' and public.es_miembro(empresa_id) and exists (select 1 from public.denuncias d where d.id = denuncia_id and d.empresa_id = mensajes.empresa_id));

-- El autor de eventos y mensajes lo fija el servidor, no el cliente.
create or replace function public.fijar_autor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'eventos' then new.autor := (select auth.uid());
  else new.user_id := (select auth.uid()); end if;
  return new;
end $$;
create trigger eventos_autor before insert on public.eventos for each row when (current_user = 'authenticated') execute function public.fijar_autor();
create trigger mensajes_autor before insert on public.mensajes for each row when (current_user = 'authenticated') execute function public.fijar_autor();

-- Bitácora automática de los cambios de hitos (quién y cuándo).
create or replace function public.registrar_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cambios text[] := '{}'; c text;
begin
  foreach c in array array['estado','medidas_resguardo_en','decision','dt_informada_en','decision_comunicada_en','investigador',
    'investigacion_cerrada_en','informe_remitido_en','pronunciamiento_notificado_en','medidas_aplicadas_en','contra_representante'] loop
    if (to_jsonb(new) -> c) is distinct from (to_jsonb(old) -> c) then
      cambios := cambios || (c || ': ' || coalesce(to_jsonb(new) ->> c, '—'));
    end if;
  end loop;
  if cardinality(cambios) > 0 then
    insert into public.eventos (denuncia_id, empresa_id, tipo, detalle, autor)
    values (new.id, new.empresa_id, 'hitos', array_to_string(cambios, ' · '), (select auth.uid()));
  end if;
  return new;
end $$;
create trigger denuncias_bitacora after update on public.denuncias for each row execute function public.registrar_cambio();

-- ---------- Funciones para personas autenticadas ----------
create or replace function public.crear_empresa(p_nombre text, p_rut text default null, p_correo text default null)
returns public.empresas
language plpgsql security definer set search_path = '' as $$
declare e public.empresas;
begin
  if (select auth.uid()) is null then raise exception 'Debe iniciar sesión.'; end if;
  if (select count(*) from public.miembros where user_id = (select auth.uid()) and rol = 'administrador') >= 5 then
    raise exception 'Alcanzó el máximo de empresas por cuenta.';
  end if;
  insert into public.empresas (nombre, rut, correo_contacto, creada_por)
  values (trim(p_nombre), nullif(trim(p_rut), ''), nullif(trim(p_correo), ''), (select auth.uid())) returning * into e;
  insert into public.miembros (empresa_id, user_id, rol, ve_identidad) values (e.id, (select auth.uid()), 'administrador', true);
  return e;
end $$;

-- Genera el código de seguimiento y la clave. Devuelve la clave en claro una sola vez.
create or replace function public._nueva_credencial(out codigo text, out clave text)
language plpgsql set search_path = '' as $$
declare alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea; i int;
begin
  loop
    b := extensions.gen_random_bytes(8); codigo := 'K-';
    for i in 0..7 loop codigo := codigo || substr(alfabeto, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.denuncias d where d.codigo = _nueva_credencial.codigo);
  end loop;
  b := extensions.gen_random_bytes(15); clave := '';
  for i in 0..14 loop clave := clave || substr(alfabeto, (get_byte(b, i) % 32) + 1, 1); if i in (4, 9) then clave := clave || '-'; end if; end loop;
end $$;

create or replace function public._insertar_denuncia(p_empresa uuid, p_via text, d jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cred record; nueva public.denuncias; f int; afectado jsonb := coalesce(d -> 'afectado', '{}'); den jsonb := d -> 'denunciante';
begin
  perform pg_advisory_xact_lock(hashtext(p_empresa::text));
  select coalesce(max(folio), 0) + 1 into f from public.denuncias where empresa_id = p_empresa;
  select * into cred from public._nueva_credencial();
  insert into public.denuncias (empresa_id, folio, via, tipos, denunciados, vinculo, hechos, testigos, solicita_derivacion, contra_representante, codigo, clave_hash)
  values (p_empresa, f, p_via,
    array(select jsonb_array_elements_text(coalesce(d -> 'tipos', '[]'))),
    coalesce(d -> 'denunciados', '[]'), nullif(trim(d ->> 'vinculo'), ''), trim(d ->> 'hechos'), nullif(trim(d ->> 'testigos'), ''),
    coalesce((d ->> 'solicita_derivacion')::boolean, false), coalesce((d ->> 'contra_representante')::boolean, false),
    cred.codigo, encode(extensions.digest(replace(cred.clave, '-', ''), 'sha256'), 'hex'))
  returning * into nueva;
  insert into public.denuncia_identidad (denuncia_id, empresa_id, afectado_nombre, afectado_rut, afectado_correo, afectado_telefono, afectado_cargo,
    denunciante_distinto, denunciante_nombre, denunciante_rut, denunciante_correo, representacion)
  values (nueva.id, p_empresa, trim(afectado ->> 'nombre'), trim(afectado ->> 'rut'), trim(afectado ->> 'correo'), nullif(trim(afectado ->> 'telefono'), ''),
    nullif(trim(afectado ->> 'cargo'), ''), den is not null, nullif(trim(den ->> 'nombre'), ''), nullif(trim(den ->> 'rut'), ''),
    nullif(trim(den ->> 'correo'), ''), nullif(trim(den ->> 'representacion'), ''));
  insert into public.eventos (denuncia_id, empresa_id, tipo, detalle, autor)
  values (nueva.id, p_empresa, 'recepcion', 'Denuncia recibida por ' || p_via, (select auth.uid()));
  return jsonb_build_object('id', nueva.id, 'folio', nueva.folio, 'recibida_en', nueva.recibida_en, 'codigo', cred.codigo, 'clave', cred.clave);
end $$;

-- Registro de una denuncia recibida fuera del canal (verbal con acta, escrita o por correo).
create or replace function public.registrar_denuncia(p_empresa uuid, p_via text, p_datos jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.ve_identidad(p_empresa) then raise exception 'No tiene permiso para registrar denuncias en esta empresa.'; end if;
  if p_via not in ('verbal', 'escrita', 'correo', 'otra') then raise exception 'Vía no válida.'; end if;
  return public._insertar_denuncia(p_empresa, p_via, p_datos);
end $$;

-- ---------- Funciones públicas (canal de denuncias y seguimiento) ----------
create or replace function public.empresa_publica(p_slug text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('nombre', e.nombre) from public.empresas e where e.slug = p_slug;
$$;

create or replace function public.crear_denuncia(p_slug text, p_datos jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e public.empresas; r jsonb;
begin
  if length(p_datos::text) > 40000 then raise exception 'La denuncia es demasiado extensa.'; end if;
  select * into e from public.empresas where slug = p_slug;
  if e.id is null then raise exception 'Canal no encontrado.'; end if;
  -- Freno simple contra envíos masivos: máximo 30 denuncias por hora en cada canal.
  if (select count(*) from public.denuncias where empresa_id = e.id and recibida_en > now() - interval '1 hour') >= 30 then
    raise exception 'El canal recibió demasiadas denuncias en la última hora. Intente más tarde o use otra vía.';
  end if;
  r := public._insertar_denuncia(e.id, 'canal', p_datos);
  return r || jsonb_build_object('empresa', e.nombre);
end $$;

-- Acepta el código y la clave con o sin guiones, en mayúsculas o minúsculas.
create or replace function public._denuncia_por_credencial(p_codigo text, p_clave text)
returns public.denuncias
language sql stable security definer set search_path = '' as $$
  select d.* from public.denuncias d
  where d.codigo = 'K-' || substr(regexp_replace(upper(coalesce(p_codigo, '')), '[^A-Z0-9]', '', 'g'), 2)
    and d.clave_hash = encode(extensions.digest(regexp_replace(upper(coalesce(p_clave, '')), '[^A-Z0-9]', '', 'g'), 'sha256'), 'hex');
$$;

create or replace function public.consultar_denuncia(p_codigo text, p_clave text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.denuncias;
begin
  select * into d from public._denuncia_por_credencial(p_codigo, p_clave);
  if d.id is null then perform pg_sleep(0.5); return null; end if;
  return jsonb_build_object(
    'empresa', (select nombre from public.empresas where id = d.empresa_id),
    'folio', d.folio, 'recibida_en', d.recibida_en, 'estado', d.estado, 'decision', d.decision,
    'decision_comunicada_en', d.decision_comunicada_en,
    'mensajes', coalesce((select jsonb_agg(jsonb_build_object('autor', m.autor, 'texto', m.texto, 'creado_en', m.creado_en) order by m.creado_en)
                          from public.mensajes m where m.denuncia_id = d.id), '[]'));
end $$;

create or replace function public.mensaje_denunciante(p_codigo text, p_clave text, p_texto text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare d public.denuncias;
begin
  select * into d from public._denuncia_por_credencial(p_codigo, p_clave);
  if d.id is null then perform pg_sleep(0.5); return false; end if;
  if (select count(*) from public.mensajes where denuncia_id = d.id and autor = 'denunciante' and creado_en > now() - interval '1 hour') >= 20 then
    raise exception 'Demasiados mensajes en la última hora.';
  end if;
  insert into public.mensajes (denuncia_id, empresa_id, autor, texto) values (d.id, d.empresa_id, 'denunciante', trim(p_texto));
  return true;
end $$;

-- Permisos de ejecución: solo lo necesario.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.empresa_publica(text), public.crear_denuncia(text, jsonb),
  public.consultar_denuncia(text, text), public.mensaje_denunciante(text, text, text) to anon, authenticated;
grant execute on function public.crear_empresa(text, text, text), public.registrar_denuncia(uuid, text, jsonb),
  public.es_miembro(uuid), public.es_admin(uuid), public.ve_identidad(uuid) to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
