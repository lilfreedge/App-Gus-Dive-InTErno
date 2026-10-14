-- migraciones_59_a_62_combinado.sql  (V31, entregadas con v60)
-- Las 4 migraciones nuevas de esta entrega, en orden. Se puede correr completo
-- de una vez en Supabase > SQL Editor (también se puede correr más de una vez).

-- ================================================================
-- migration_59.sql  (V31, entregada con v60)
-- Arreglo de migration_57.sql.
--
-- migration_57.sql (v57) cambiaba presion_intermedia (boolean -> text) y
-- o_rings (text -> jsonb) en mantenimientos_reguladores, pero falla en
-- Postgres con "cannot alter type of a column used by a view or rule":
-- la vista mantenimientos_con_nombre (select m.*) depende de esas columnas.
-- Como el SQL Editor de Supabase corre todo junto, si salió ese error no
-- se aplicó nada y la pantalla de mantenimiento de reguladores no puede
-- guardar la presión escrita ("135 psi") ni los o-rings nuevos.
--
-- Esta migración hace lo mismo que la 57, pero bien: quita la vista,
-- cambia los tipos SOLO si todavía no se cambiaron (se puede correr
-- aunque la 57 sí haya funcionado) y vuelve a crear la vista igual que
-- en migration_51.sql (drop + create, nunca create or replace).

drop view if exists public.mantenimientos_con_nombre;

do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'mantenimientos_reguladores'
        and column_name = 'presion_intermedia') = 'boolean' then
    alter table public.mantenimientos_reguladores alter column presion_intermedia drop default;
    alter table public.mantenimientos_reguladores alter column presion_intermedia drop not null;
    alter table public.mantenimientos_reguladores
      alter column presion_intermedia type text
      using case when presion_intermedia = true then 'Sí' else null end;
  end if;

  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'mantenimientos_reguladores'
        and column_name = 'o_rings') = 'text' then
    alter table public.mantenimientos_reguladores
      alter column o_rings type jsonb
      using case
        when o_rings is null or trim(o_rings) = '' then null::jsonb
        else jsonb_build_array(jsonb_build_object('descripcion', trim(o_rings), 'parte', ''))
      end;
  end if;
end $$;

create view public.mantenimientos_con_nombre
  with (security_invoker = on) as
  select m.*, coalesce(m.nombre_usuario_snapshot, p.full_name) as full_name
  from public.mantenimientos_reguladores m
  join public.profiles p on p.id = m.user_id
  order by m.created_at desc;

grant select on public.mantenimientos_con_nombre to authenticated;

-- ================================================================
-- migration_60.sql  (V31, entregada con v60)
-- Seguimiento de avisos en "Clientes por contactar" (App Equipos de clientes).
--
-- Pedido del usuario: "si le notificamos a un cliente que venga por 3ra vez
-- pues descartarlo de esa lista". Cada toque de "Notificar vía WhatsApp"
-- queda anotado aquí (fecha y quién). Las reglas (3 avisos, 15 días entre
-- uno y otro, descartado por 1 año, el conteo vuelve a empezar si el
-- cliente registra una orden) las aplica la pantalla leyendo esta tabla.
-- "Deshacer" borra el aviso.

create table if not exists public.avisos_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_equipos(id) on delete cascade,
  motivo text not null default 'mantenimiento' check (motivo in ('mantenimiento', 'sin_visita')),
  user_id uuid references auth.users(id) on delete set null,
  nombre_usuario_snapshot text,
  created_at timestamptz not null default now()
);

create index if not exists avisos_clientes_cliente_idx on public.avisos_clientes (cliente_id, created_at);

alter table public.avisos_clientes enable row level security;

create or replace function public.puede_contactar_clientes()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_titular()
    or coalesce((select (permisos->>'equipos_clientes_contactar')::boolean
                 from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "Contactar clientes ve avisos" on public.avisos_clientes;
create policy "Contactar clientes ve avisos"
  on public.avisos_clientes for select
  to authenticated
  using (public.puede_contactar_clientes());

drop policy if exists "Contactar clientes anota avisos" on public.avisos_clientes;
create policy "Contactar clientes anota avisos"
  on public.avisos_clientes for insert
  to authenticated
  with check (public.puede_contactar_clientes() and user_id = auth.uid());

drop policy if exists "Contactar clientes deshace avisos" on public.avisos_clientes;
create policy "Contactar clientes deshace avisos"
  on public.avisos_clientes for delete
  to authenticated
  using (public.puede_contactar_clientes());

grant select, insert, delete on public.avisos_clientes to authenticated;

-- ================================================================
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

-- ================================================================
-- migration_62.sql  (V31, entregada con v60)
-- Tres cosas, independientes entre sí:
--
-- (1) Eliminar cuentas desde la app (pedido explícito: "para poder borrar
--     cuentas directamente desde el app en vez de ir a supabase"; decidido:
--     borrar la cuenta y CONSERVAR todo lo que registró, con su nombre).
--     Hasta ahora casi todas las tablas apuntaban a auth.users sin
--     "on delete", así que Supabase no dejaba borrar a nadie con actividad
--     ("Database error deleting user"). Ahora apuntan a public.profiles, y
--     el perfil ya no se borra junto con la cuenta: queda marcado como
--     eliminado (eliminado_en) para que sus registros sigan mostrando su
--     nombre. La cuenta de acceso (auth.users) sí se borra: esa persona ya
--     no puede entrar.
--
-- (2) Limpieza de ediciones vacías (pedido explícito: "borra si, así tenemos
--     menos cargada la base de datos"): borra de cambios_historial las
--     ediciones guardadas sin ningún cambio real (Antes y Después iguales).
--     Son todas de antes del 6-oct-2026: desde v53 la app ya no las guarda,
--     solo las ocultaba. Mismo criterio exacto que lib/cambios.js
--     (hayCambioReal). Las anulaciones y las ediciones reales no se tocan.
--
-- (3) Quita la columna clientes_equipos.numero (migration_58.sql, "número de
--     cliente"): el usuario decidió no usarla ("lo único que me interesa es
--     el número de contacto"). La app ya no la muestra desde v59. Se pierde
--     lo que se haya escrito ahí.

-- (1) ------------------------------------------------------------------
alter table public.profiles add column if not exists eliminado_en timestamptz;

do $$
declare
  c record;
  cols text;
begin
  for c in
    select con.oid, con.conname, con.conrelid::regclass as tabla
    from pg_constraint con
    join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = con.conrelid)
    where con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
      and n.nspname = 'public'
  loop
    select string_agg(quote_ident(a.attname), ', ' order by k.ord)
      into cols
      from unnest((select conkey from pg_constraint where oid = c.oid)) with ordinality as k(attnum, ord)
      join pg_attribute a on a.attrelid = c.tabla and a.attnum = k.attnum;

    execute format('alter table %s drop constraint %I', c.tabla, c.conname);

    -- El perfil (profiles.id) no lleva llave hacia sí mismo.
    if c.tabla::text <> 'profiles' then
      execute format(
        'alter table %s add constraint %I foreign key (%s) references public.profiles(id) not valid',
        c.tabla, c.conname, cols
      );
    end if;
  end loop;
end $$;

-- (2) ------------------------------------------------------------------
create or replace function public.normalizar_valor_cambio(v jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  t text;
  out_obj jsonb := '{}'::jsonb;
  out_arr jsonb := '[]'::jsonb;
  k text;
  n jsonb;
  e jsonb;
begin
  if v is null or v = 'null'::jsonb or v = 'false'::jsonb then
    return null;
  end if;
  case jsonb_typeof(v)
    when 'string' then
      t := btrim(v #>> '{}');
      return case when t = '' then null else to_jsonb(t) end;
    when 'array' then
      if jsonb_array_length(v) = 0 then return null; end if;
      for e in select value from jsonb_array_elements(v) loop
        out_arr := out_arr || jsonb_build_array(coalesce(public.normalizar_valor_cambio(e), 'null'::jsonb));
      end loop;
      return out_arr;
    when 'object' then
      for k in select key from jsonb_object_keys(v) as key loop
        if k in ('updated_at', 'created_at', 'actualizado_en') then continue; end if;
        n := public.normalizar_valor_cambio(v -> k);
        if n is not null then out_obj := out_obj || jsonb_build_object(k, n); end if;
      end loop;
      return case when out_obj = '{}'::jsonb then null else out_obj end;
    else
      return v;
  end case;
end;
$$;

create or replace function public.hay_cambio_real(antes jsonb, despues jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
begin
  if despues is null or jsonb_typeof(despues) <> 'object' then return true; end if;
  for k in select key from jsonb_object_keys(despues) as key loop
    if k in ('updated_at', 'created_at', 'actualizado_en') then continue; end if;
    if public.normalizar_valor_cambio(coalesce(antes, '{}'::jsonb) -> k)
       is distinct from public.normalizar_valor_cambio(despues -> k) then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

delete from public.cambios_historial
  where accion = 'editar'
    and datos_nuevos is not null
    and not public.hay_cambio_real(datos_anteriores, datos_nuevos);

-- (3) ------------------------------------------------------------------
alter table public.clientes_equipos drop column if exists numero;
