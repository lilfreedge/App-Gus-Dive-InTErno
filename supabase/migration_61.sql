-- migration_61.sql  (V31, entregada con v60)
-- Administración › Roles, en cada app.
--
-- Pedido del usuario: "Creame una seccion en administracion para crear roles
-- y yo poner cuales seran sus accesos. para futuros roles". Acordado:
-- - cada app tiene sus propios roles ('interno' / 'clientes'); el único rol
--   que cubre las dos apps es Administrador (is_admin, no cambia);
-- - un rol = nombre + accesos por sección; en App Interno además "pantalla
--   de inicio: normal / solo llenados";
-- - el rol manda: quien tiene un rol tiene exactamente sus accesos (sin
--   permisos sueltos extra); cambiar el rol cambia a todos los que lo
--   tienen (se copian los accesos del rol a profiles.permisos, así las
--   políticas RLS de siempre siguen funcionando igual);
-- - editar y anular siguen siendo solo de Administrador (no van en un rol);
-- - los roles no se borran (se pueden renombrar y cambiar);
-- - "Operativo" pasa a ser un rol más de App Interno, editable.
--
-- Además: profiles ahora protege permisos/rol/aprobación -- solo el Titular
-- los puede cambiar (antes la política dejaba que cada quien editara su
-- propio perfil completo, incluidos sus permisos, si lo hacía por fuera de
-- la app).

create table if not exists public.roles_app (
  id uuid primary key default gen_random_uuid(),
  app text not null check (app in ('interno', 'clientes')),
  nombre text not null check (length(trim(nombre)) > 0),
  permisos jsonb not null default '{}'::jsonb,
  inicio text not null default 'normal' check (inicio in ('normal', 'llenados')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists roles_app_nombre_unico on public.roles_app (app, lower(trim(nombre)));

alter table public.roles_app enable row level security;

drop policy if exists "Logueados ven roles" on public.roles_app;
create policy "Logueados ven roles"
  on public.roles_app for select
  to authenticated
  using (true);

drop policy if exists "Titular crea roles" on public.roles_app;
create policy "Titular crea roles"
  on public.roles_app for insert
  to authenticated
  with check (public.is_titular());

drop policy if exists "Titular edita roles" on public.roles_app;
create policy "Titular edita roles"
  on public.roles_app for update
  to authenticated
  using (public.is_titular())
  with check (public.is_titular());
-- Sin política de borrado: los roles no se borran.

grant select, insert, update on public.roles_app to authenticated;

alter table public.profiles add column if not exists rol_interno_id uuid references public.roles_app(id) on delete set null;
alter table public.profiles add column if not exists rol_clientes_id uuid references public.roles_app(id) on delete set null;

-- Accesos efectivos de un rol: en App Interno, "solo llenados" siempre
-- lleva el permiso de registrar llenados (lo exige la base de datos para
-- guardarlo) y marca rol_operativo (la pantalla de Inicio de llenados).
create or replace function public.permisos_de_rol(r public.roles_app)
returns jsonb
language sql
immutable
as $$
  select case
    when r.app = 'interno' then
      r.permisos
      || jsonb_build_object('rol_operativo', r.inicio = 'llenados')
      || case when r.inicio = 'llenados'
           then jsonb_build_object('registrar_llenado', true, 'acceso_app_interno', true)
           else '{}'::jsonb end
    else r.permisos
  end;
$$;

-- Al asignarle un rol a alguien (o cambiárselo), se le copian sus accesos.
-- Al quitárselo (vuelve a Usuario), se le quita "solo llenados" y conserva
-- los accesos que tenía, ya como permisos sueltos editables.
create or replace function public.aplicar_rol_a_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.roles_app;
begin
  if tg_op = 'INSERT' or new.rol_interno_id is distinct from old.rol_interno_id then
    if new.rol_interno_id is not null then
      select * into r from public.roles_app where id = new.rol_interno_id and app = 'interno';
      if found then
        new.permisos := coalesce(new.permisos, '{}'::jsonb) || public.permisos_de_rol(r);
      else
        new.rol_interno_id := null;
      end if;
    elsif tg_op = 'UPDATE' then
      new.permisos := coalesce(new.permisos, '{}'::jsonb) || jsonb_build_object('rol_operativo', false);
    end if;
  end if;

  if tg_op = 'INSERT' or new.rol_clientes_id is distinct from old.rol_clientes_id then
    if new.rol_clientes_id is not null then
      select * into r from public.roles_app where id = new.rol_clientes_id and app = 'clientes';
      if found then
        new.permisos := coalesce(new.permisos, '{}'::jsonb) || public.permisos_de_rol(r);
      else
        new.rol_clientes_id := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists aplicar_rol_a_perfil on public.profiles;
create trigger aplicar_rol_a_perfil
  before insert or update of rol_interno_id, rol_clientes_id on public.profiles
  for each row execute function public.aplicar_rol_a_perfil();

-- Al cambiar un rol, se actualiza a todos los que lo tienen.
create or replace function public.propagar_rol()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.app = 'interno' then
    update public.profiles
      set permisos = coalesce(permisos, '{}'::jsonb) || public.permisos_de_rol(new)
      where rol_interno_id = new.id and not es_titular and not is_admin;
  else
    update public.profiles
      set permisos = coalesce(permisos, '{}'::jsonb) || public.permisos_de_rol(new)
      where rol_clientes_id = new.id and not es_titular and not is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists propagar_rol on public.roles_app;
create trigger propagar_rol
  before update on public.roles_app
  for each row execute function public.propagar_rol();

-- Solo el Titular cambia permisos, rol, administrador, titular y aprobación.
-- (Los procesos internos -- registro de cuentas nuevas, triggers -- corren
-- sin sesión de usuario, auth.uid() vacío, y no se frenan.)
create or replace function public.proteger_permisos_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_titular() and (
       new.permisos is distinct from old.permisos
    or new.is_admin is distinct from old.is_admin
    or new.es_titular is distinct from old.es_titular
    or new.aprobado is distinct from old.aprobado
    or new.rol_interno_id is distinct from old.rol_interno_id
    or new.rol_clientes_id is distinct from old.rol_clientes_id
  ) then
    raise exception 'Solo el Titular puede cambiar permisos, roles o aprobaciones.';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_permisos_perfil on public.profiles;
create trigger proteger_permisos_perfil
  before update on public.profiles
  for each row execute function public.proteger_permisos_perfil();

-- "Operativo" pasa a ser un rol de App Interno: se crea con sus accesos de
-- siempre (solo llenados) y se les asigna a quienes ya lo tenían. Sus
-- otros permisos guardados "sin efecto" (V30) quedan en falso, porque
-- ahora el rol manda.
insert into public.roles_app (app, nombre, inicio, permisos)
select 'interno', 'Operativo', 'llenados', jsonb_build_object(
  'registrar_salida', false, 'registrar_llenado', true, 'facturacion', false,
  'registrar_inspeccion', false, 'registrar_hidrostatica', false, 'registrar_mantenimiento', false,
  'compresores', false, 'registrar_compresor', false, 'movimientos', false,
  'catalogo', false, 'catalogo_codigo', false, 'catalogo_regulador', false, 'catalogo_tanque', false,
  'proximos_vencimientos', false, 'reportes', false, 'correos_semanales', false,
  'solicitudes_almacen', false, 'historial', false, 'changelog', false, 'manual', false
)
where not exists (select 1 from public.roles_app where app = 'interno' and lower(trim(nombre)) = 'operativo');

update public.profiles p
  set rol_interno_id = r.id
  from public.roles_app r
  where r.app = 'interno' and lower(trim(r.nombre)) = 'operativo'
    and coalesce((p.permisos->>'rol_operativo')::boolean, false)
    and not p.es_titular
    and p.rol_interno_id is null;
