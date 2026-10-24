-- =====================================================================
-- migraciones_65_a_67_combinado.sql -- migration_65.sql (V33),
-- migration_66.sql (V34) y migration_67.sql (arreglo de facturar), una
-- detrás de la otra. Si ya corriste alguna, no pasa nada: las tres se
-- pueden correr más de una vez.
-- =====================================================================

-- =====================================================================
-- migration_65.sql -- V33. Correr después de migration_63.sql y
-- migration_64.sql. Se puede correr más de una vez sin problema.
--
-- "Registrar regreso de varios" (pedido explícito: "aquí necesito que se
-- puedan recibir varios tanques, no de uno en uno así como está"; maqueta
-- V33 sección 4, "ok"): una sola llamada registra el regreso de varios
-- tanques que estaban afuera en prueba hidrostática. La fecha de regreso y
-- el mes/año de la prueba son los mismos para todos; el resultado y la
-- nota son de cada tanque.
--
-- Todo o nada: si uno falla (por ejemplo, alguien ya le registró el
-- regreso), no se guarda ninguno. Cada tanque pasa por
-- registrar_prueba_hidrostatica() (migration_63.sql), así que hace lo mismo
-- que el regreso de uno en uno: anota la prueba, cierra el envío, anota la
-- inspección visual si sale aprobada, y si sale rechazada el tanque se
-- inactiva solo.
--
-- p_items: [{"envio_id": "...", "resultado": "Aprobado"|"Rechazado", "nota": "..."}]
-- =====================================================================

create or replace function public.registrar_regresos_hidrostatica(
  p_fecha_regreso date,
  p_fecha_prueba date,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_envio public.envios_hidrostatica;
  v_n integer := 0;
begin
  if auth.uid() is null or not public.puede_registrar_hidrostatica() then
    raise exception 'No tienes permiso para registrar pruebas hidrostáticas.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Marca al menos un tanque.';
  end if;
  if p_fecha_regreso is null or p_fecha_prueba is null then
    raise exception 'Falta la fecha de regreso o la de la prueba.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_envio from public.envios_hidrostatica where id = (v_item->>'envio_id')::uuid;
    if v_envio.id is null then
      raise exception 'Uno de los envíos ya no existe. Vuelve a abrir la pantalla.';
    end if;
    if v_envio.fecha_regreso is not null then
      raise exception 'El tanque % ya tiene registrado su regreso. Vuelve a abrir la pantalla.', v_envio.tanque_codigo_snapshot;
    end if;
    perform public.registrar_prueba_hidrostatica(
      v_envio.tanque_id,
      p_fecha_prueba,
      v_item->>'resultado',
      nullif(trim(coalesce(v_item->>'nota', '')), ''),
      v_envio.id,
      p_fecha_regreso
    );
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

grant execute on function public.registrar_regresos_hidrostatica(date, date, jsonb) to authenticated;

-- =====================================================================
-- migration_66.sql -- V34. Correr después de migration_65.sql. Se puede
-- correr más de una vez sin problema.
--
-- Maquetas aprobadas: maqueta-v34.html, maqueta-v34-2.html y
-- maqueta-v34-3.html (22-oct-2026).
--
-- (1) Rol "Técnico" en App Equipos de clientes: "Pantalla de inicio" en
--     los roles de esa app (Normal / Mis órdenes asignadas). El rol
--     "Técnico" se deja creado; se edita en Administración › Roles.
-- (2) Asignar órdenes: técnico asignado en cada orden, con quién y cuándo
--     la asignó, y su entrada en la Bitácora de la orden. Permiso nuevo
--     "Asignar órdenes" (el Titular siempre).
-- (3) "Notificaciones al cliente" y "Cerrar orden" pasan a ser permisos
--     aparte ("eso le corresponde a la tienda"). Se encienden solos a
--     quienes hoy tienen "Actualizar estado de orden" ("1. si"), para que
--     nadie pierda nada. La base de datos también lo revisa.
-- (1b) Roles vinculados entre las dos apps: los dos "Técnico" quedan
--     vinculados; se le pone a alguien en una app y le sale en las dos.
-- (4) Compresores separado como reguladores ("ok sí, créame ese acceso
--     separado"): "Compresores" = ver; "Registrar mantenimiento de
--     compresor" (nuevo, encendido a quien hoy tiene Compresores: "2. si");
--     "Registrar y editar compresor" (el "Registrar compresor" de siempre,
--     que ahora también es el que deja cambiar los datos).
-- =====================================================================

-- (0) ------------------------------------------------------------------
-- ¿La persona que está usando la app tiene este permiso? (sin contar al
-- Titular: eso se revisa aparte con is_titular()).
create or replace function public.tiene_permiso(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (permisos->>p_clave)::boolean from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.tiene_permiso(text) to authenticated;

-- (1) ------------------------------------------------------------------
-- Pantallas de inicio de un rol: App Interno = normal / llenados (el
-- operario) / equipos; App Equipos de clientes = normal / asignadas (el
-- técnico).
alter table public.roles_app drop constraint if exists roles_app_inicio_check;
alter table public.roles_app
  add constraint roles_app_inicio_check check (inicio in ('normal', 'llenados', 'equipos', 'asignadas'));

-- Accesos efectivos de un rol. Igual que antes, más: en App Equipos de
-- clientes, "Mis órdenes asignadas" marca rol_tecnico; en App Interno,
-- "Equipos" marca rol_equipos.
create or replace function public.permisos_de_rol(r public.roles_app)
returns jsonb
language sql
immutable
as $$
  select case
    when r.app = 'interno' then
      r.permisos
      || jsonb_build_object('rol_operativo', r.inicio = 'llenados', 'rol_equipos', r.inicio = 'equipos')
      || case when r.inicio = 'llenados'
           then jsonb_build_object('registrar_llenado', true, 'acceso_app_interno', true)
           else '{}'::jsonb end
    else
      r.permisos || jsonb_build_object('rol_tecnico', r.inicio = 'asignadas')
  end;
$$;

-- Roles vinculados entre las dos apps (pedido explícito: "Debe de haber una
-- manera de que esos roles estén vinculados a través de ambos espacios";
-- maqueta-v34-4.html, "bien"): un rol de App Interno y uno de App Equipos
-- de clientes pueden quedar vinculados. Al ponerle uno a alguien se le pone
-- también el otro; al quitárselo, se le quita en las dos. Cada parte se
-- edita en el Roles de su app. Para entrar a una app igual hace falta su
-- acceso en Accesos a apps (el rol no lo da).
alter table public.roles_app add column if not exists vinculado_id uuid references public.roles_app(id) on delete set null;

-- Vincular (o desvincular, con p_otro vacío) un rol con uno de la otra app.
-- Solo el Titular. Deja el vínculo en los dos roles y suelta los vínculos
-- que tuvieran antes.
create or replace function public.vincular_rol(p_rol uuid, p_otro uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.roles_app;
  o public.roles_app;
begin
  if auth.uid() is not null and not public.is_titular() then
    raise exception 'Solo el Titular puede vincular roles.';
  end if;
  select * into r from public.roles_app where id = p_rol;
  if r.id is null then
    raise exception 'Ese rol ya no existe. Vuelve a abrir la pantalla.';
  end if;
  if p_otro is not null then
    select * into o from public.roles_app where id = p_otro;
    if o.id is null then
      raise exception 'Ese rol ya no existe. Vuelve a abrir la pantalla.';
    end if;
    if o.app = r.app then
      raise exception 'Solo se puede vincular con un rol de la otra app.';
    end if;
  end if;

  -- Suelta los vínculos de antes (de los dos lados).
  update public.roles_app set vinculado_id = null
   where vinculado_id in (p_rol, coalesce(p_otro, p_rol)) or id in (p_rol, coalesce(p_otro, p_rol));

  if p_otro is not null then
    update public.roles_app set vinculado_id = p_otro where id = p_rol;
    update public.roles_app set vinculado_id = p_rol where id = p_otro;
  end if;
end;
$$;

grant execute on function public.vincular_rol(uuid, uuid) to authenticated;

-- Al asignarle un rol a alguien (o cambiárselo), se le copian sus accesos.
-- V34: si el rol está vinculado con uno de la otra app, se le pone también
-- ese; si se le quita (o se le cambia) un rol vinculado, se le quita
-- también el de la otra app. Al quitarle el rol a alguien (vuelve a
-- Usuario) se le quita también su pantalla de inicio especial; conserva los
-- demás accesos como permisos sueltos, igual que antes.
create or replace function public.aplicar_rol_a_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.roles_app;
  v_viejo_vinc uuid;
  v_nuevo_vinc uuid;
  cambio_int boolean := tg_op = 'INSERT' or new.rol_interno_id is distinct from old.rol_interno_id;
  cambio_cli boolean := tg_op = 'INSERT' or new.rol_clientes_id is distinct from old.rol_clientes_id;
begin
  -- Roles vinculados: lo que se cambió en una app arrastra a la otra.
  if cambio_cli and not cambio_int then
    v_viejo_vinc := null;
    v_nuevo_vinc := null;
    if tg_op = 'UPDATE' and old.rol_clientes_id is not null then
      select vinculado_id into v_viejo_vinc from public.roles_app where id = old.rol_clientes_id;
    end if;
    if new.rol_clientes_id is not null then
      select vinculado_id into v_nuevo_vinc from public.roles_app where id = new.rol_clientes_id;
    end if;
    if v_nuevo_vinc is not null then
      new.rol_interno_id := v_nuevo_vinc;
    elsif v_viejo_vinc is not null and new.rol_interno_id is not distinct from v_viejo_vinc then
      new.rol_interno_id := null;
    end if;
    cambio_int := tg_op = 'INSERT' or new.rol_interno_id is distinct from old.rol_interno_id;
  elsif cambio_int and not cambio_cli then
    v_viejo_vinc := null;
    v_nuevo_vinc := null;
    if tg_op = 'UPDATE' and old.rol_interno_id is not null then
      select vinculado_id into v_viejo_vinc from public.roles_app where id = old.rol_interno_id;
    end if;
    if new.rol_interno_id is not null then
      select vinculado_id into v_nuevo_vinc from public.roles_app where id = new.rol_interno_id;
    end if;
    if v_nuevo_vinc is not null then
      new.rol_clientes_id := v_nuevo_vinc;
    elsif v_viejo_vinc is not null and new.rol_clientes_id is not distinct from v_viejo_vinc then
      new.rol_clientes_id := null;
    end if;
    cambio_cli := tg_op = 'INSERT' or new.rol_clientes_id is distinct from old.rol_clientes_id;
  end if;

  if cambio_int then
    if new.rol_interno_id is not null then
      select * into r from public.roles_app where id = new.rol_interno_id and app = 'interno';
      if found then
        new.permisos := coalesce(new.permisos, '{}'::jsonb) || public.permisos_de_rol(r);
      else
        new.rol_interno_id := null;
      end if;
    elsif tg_op = 'UPDATE' then
      new.permisos := coalesce(new.permisos, '{}'::jsonb) || jsonb_build_object('rol_operativo', false, 'rol_equipos', false);
    end if;
  end if;

  if cambio_cli then
    if new.rol_clientes_id is not null then
      select * into r from public.roles_app where id = new.rol_clientes_id and app = 'clientes';
      if found then
        new.permisos := coalesce(new.permisos, '{}'::jsonb) || public.permisos_de_rol(r);
      else
        new.rol_clientes_id := null;
      end if;
    elsif tg_op = 'UPDATE' then
      new.permisos := coalesce(new.permisos, '{}'::jsonb) || jsonb_build_object('rol_tecnico', false);
    end if;
  end if;

  return new;
end;
$$;

-- (2) ------------------------------------------------------------------
alter table public.ordenes_equipos add column if not exists tecnico_asignado_id uuid references public.profiles(id) on delete set null;
alter table public.ordenes_equipos add column if not exists asignada_en timestamptz;
alter table public.ordenes_equipos add column if not exists asignada_por uuid references public.profiles(id) on delete set null;
create index if not exists ordenes_equipos_tecnico_asignado_idx on public.ordenes_equipos (tecnico_asignado_id);

-- La vista se vuelve a crear (Postgres congela las columnas de un
-- "select *" al crear la vista): así trae las columnas nuevas, más el
-- nombre del técnico y de quien asignó.
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*,
         coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name,
         c.telefono as cliente_telefono,
         t.full_name as tecnico_nombre,
         ap.full_name as asignada_por_nombre
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  left join public.profiles t on t.id = o.tecnico_asignado_id
  left join public.profiles ap on ap.id = o.asignada_por
  order by o.created_at desc;

grant select on public.ordenes_equipos_con_nombre to authenticated;

-- Asignar (o quitar, con p_tecnico vacío) el técnico de una orden. Solo el
-- Titular o quien tenga "Asignar órdenes". Queda en la Bitácora de la orden.
-- La asignación dice de quién es el trabajo, pero no bloquea a nadie:
-- cualquiera con "Actualizar estado de orden" la puede seguir actualizando.
create or replace function public.asignar_orden(p_orden uuid, p_tecnico uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden public.ordenes_equipos;
  v_yo text;
  v_antes text;
  v_nuevo text;
  v_entrada jsonb;
begin
  if auth.uid() is null or not (public.is_titular() or public.tiene_permiso('equipos_clientes_asignar')) then
    raise exception 'No tienes permiso para asignar órdenes.';
  end if;

  select * into v_orden from public.ordenes_equipos where id = p_orden;
  if v_orden.id is null then
    raise exception 'Esa orden ya no existe. Vuelve a abrir la pantalla.';
  end if;
  if v_orden.estado = 'Entregado' then
    raise exception 'Esta orden ya se entregó: no se puede asignar.';
  end if;
  if v_orden.tecnico_asignado_id is not distinct from p_tecnico then
    return;
  end if;

  if p_tecnico is not null then
    select full_name into v_nuevo from public.profiles where id = p_tecnico and eliminado_en is null;
    if not found then
      raise exception 'Esa persona ya no está disponible. Vuelve a abrir la pantalla.';
    end if;
  end if;

  select full_name into v_yo from public.profiles where id = auth.uid();
  select full_name into v_antes from public.profiles where id = v_orden.tecnico_asignado_id;

  v_entrada := jsonb_build_object(
    'fecha', to_char(now() at time zone 'America/Santo_Domingo', 'YYYY-MM-DD'),
    'tipo', 'asignacion',
    'texto', case
               when p_tecnico is null then 'Se quitó la asignación'
               when v_orden.tecnico_asignado_id is null then 'Asignada a ' || coalesce(v_nuevo, '—')
               else 'Reasignada a ' || coalesce(v_nuevo, '—')
             end,
    'usuario', v_yo
  );
  if v_orden.tecnico_asignado_id is not null then
    v_entrada := v_entrada || jsonb_build_object(
      'detalle', case when p_tecnico is null then 'Estaba asignada a ' else 'Antes: ' end || coalesce(v_antes, '—')
    );
  end if;

  update public.ordenes_equipos
     set tecnico_asignado_id = p_tecnico,
         asignada_en = case when p_tecnico is null then null else now() end,
         asignada_por = case when p_tecnico is null then null else auth.uid() end,
         bitacora_orden = jsonb_build_array(v_entrada) || coalesce(bitacora_orden, '[]'::jsonb)
   where id = p_orden;
end;
$$;

grant execute on function public.asignar_orden(uuid, uuid) to authenticated;

-- (3) ------------------------------------------------------------------
-- La base de datos también frena a quien no tenga el permiso (por si se
-- intenta por fuera de la app). El Titular siempre puede. Los procesos
-- internos (sin sesión de usuario) no se frenan.
create or replace function public.proteger_cierre_orden()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_titular() then
    return new;
  end if;
  if (new.fecha_entrega_cliente, new.nombre_recibe, new.factura)
       is distinct from (old.fecha_entrega_cliente, old.nombre_recibe, old.factura)
     and not public.tiene_permiso('equipos_clientes_cerrar_orden') then
    raise exception 'No tienes permiso para cerrar la orden (eso le toca a la tienda).';
  end if;
  if new.notificaciones_cliente is distinct from old.notificaciones_cliente
     and not public.tiene_permiso('equipos_clientes_notificar') then
    raise exception 'No tienes permiso para anotar notificaciones al cliente (eso le toca a la tienda).';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_cierre_orden on public.ordenes_equipos;
create trigger proteger_cierre_orden
  before update on public.ordenes_equipos
  for each row execute function public.proteger_cierre_orden();

-- Backfill: a quienes hoy tienen "Actualizar estado de orden" se les
-- encienden "Notificaciones al cliente" y "Cerrar orden". Solo la primera
-- vez (si ya tiene la clave, no se toca: así correrla otra vez no vuelve a
-- encender algo que el Titular apagó).
update public.profiles
   set permisos = permisos || jsonb_build_object('equipos_clientes_notificar', true, 'equipos_clientes_cerrar_orden', true)
 where coalesce((permisos->>'equipos_clientes_actualizar_estado')::boolean, false)
   and not (permisos ? 'equipos_clientes_cerrar_orden');

update public.roles_app
   set permisos = permisos || jsonb_build_object('equipos_clientes_notificar', true, 'equipos_clientes_cerrar_orden', true)
 where app = 'clientes'
   and coalesce((permisos->>'equipos_clientes_actualizar_estado')::boolean, false)
   and not (permisos ? 'equipos_clientes_cerrar_orden');

-- Los roles de esta app que no lo tenían, quedan con las claves en falso
-- (el rol manda: así se ven en Roles y se pueden encender).
update public.roles_app
   set permisos = jsonb_build_object('equipos_clientes_notificar', false, 'equipos_clientes_cerrar_orden', false, 'equipos_clientes_asignar', false) || permisos
 where app = 'clientes';

-- (4) ------------------------------------------------------------------
update public.profiles
   set permisos = permisos || jsonb_build_object('compresor_mantenimiento_registrar', true)
 where coalesce((permisos->>'compresores')::boolean, false)
   and not (permisos ? 'compresor_mantenimiento_registrar');

update public.roles_app
   set permisos = permisos || jsonb_build_object('compresor_mantenimiento_registrar', true)
 where app = 'interno'
   and coalesce((permisos->>'compresores')::boolean, false)
   and not (permisos ? 'compresor_mantenimiento_registrar');

update public.roles_app
   set permisos = jsonb_build_object('compresor_mantenimiento_registrar', false) || permisos
 where app = 'interno';

drop policy if exists "Permiso compresores agrega compresores" on public.compresores;
drop policy if exists "Permiso registrar_compresor agrega compresores" on public.compresores;
create policy "Permiso registrar_compresor agrega compresores"
  on public.compresores for insert
  to authenticated
  with check (public.is_titular() or public.is_admin() or public.tiene_permiso('registrar_compresor'));

drop policy if exists "Permiso compresores edita compresores" on public.compresores;
drop policy if exists "Permiso registrar_compresor edita compresores" on public.compresores;
create policy "Permiso registrar_compresor edita compresores"
  on public.compresores for update
  to authenticated
  using (public.is_titular() or public.is_admin() or public.tiene_permiso('registrar_compresor'));

drop policy if exists "Permiso compresores inserta mantenimientos" on public.mantenimientos_compresores;
drop policy if exists "Permiso compresor_mantenimiento_registrar inserta" on public.mantenimientos_compresores;
create policy "Permiso compresor_mantenimiento_registrar inserta"
  on public.mantenimientos_compresores for insert
  to authenticated
  with check (public.is_titular() or public.is_admin() or public.tiene_permiso('compresor_mantenimiento_registrar'));

-- La próxima inspección del compresor (+14 días) la pone ahora la base de
-- datos al registrar una Inspección (antes la ponía la app, y quien solo
-- registra mantenimientos ya no puede cambiar los datos del compresor).
create or replace function public.compresor_proxima_inspeccion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo_mantenimiento = 'Inspección' and new.compresor_id is not null then
    update public.compresores
       set proxima_inspeccion = new.fecha + 14
     where id = new.compresor_id;
  end if;
  return new;
end;
$$;

drop trigger if exists compresor_proxima_inspeccion on public.mantenimientos_compresores;
create trigger compresor_proxima_inspeccion
  after insert on public.mantenimientos_compresores
  for each row execute function public.compresor_proxima_inspeccion();

-- (5) ------------------------------------------------------------------
-- El rol "Técnico" de App Equipos de clientes, ya creado (si no existe
-- uno con ese nombre). Ve el Historial de órdenes, actualiza el estado y
-- hace el Informe de mantenimiento. Notificaciones, Cierre y Asignar,
-- apagados. Se edita en Administración › Roles.
insert into public.roles_app (app, nombre, inicio, permisos)
select 'clientes', 'Técnico', 'asignadas', jsonb_build_object(
  'equipos_clientes_listado_ordenes', true,
  'equipos_clientes_registrar', false,
  'equipos_clientes_actualizar_estado', true,
  'equipos_clientes_notificar', false,
  'equipos_clientes_cerrar_orden', false,
  'equipos_clientes_asignar', false,
  'equipos_clientes_listado_clientes', false,
  'equipos_clientes_agregar_cliente', false,
  'equipos_clientes_agregar_equipo', false,
  'equipos_clientes_informe_mantenimiento', true,
  'equipos_clientes_catalogo', false,
  'equipos_clientes_agregar_codigo', false,
  'equipos_clientes_registrar_servicio', false,
  'equipos_clientes_reportes', false,
  'equipos_clientes_contactar', false
)
where not exists (
  select 1 from public.roles_app
   where app = 'clientes' and lower(translate(trim(nombre), 'é', 'e')) = 'tecnico'
);

-- El rol "Técnico" de App Interno, ya creado (decidido: "pantalla de inicio:
-- ok", con el nombre "Equipos (para rol técnico)"). Entra directo a
-- Equipos; registra mantenimientos de reguladores y de compresores. Para
-- que entre a App Interno igual hay que darle App Interno en Accesos a
-- apps (este rol no lo da solo).
insert into public.roles_app (app, nombre, inicio, permisos)
select 'interno', 'Técnico', 'equipos', jsonb_build_object(
  'registrar_salida', false, 'registrar_llenado', false, 'facturacion', false,
  'registrar_inspeccion', false, 'inspeccion_registrar', false,
  'registrar_hidrostatica', false, 'hidrostatica_registrar', false,
  'registrar_mantenimiento', true, 'mantenimiento_registrar', true,
  'compresores', true, 'compresor_mantenimiento_registrar', true, 'registrar_compresor', false,
  'movimientos', false, 'catalogo', false, 'catalogo_codigo', false, 'catalogo_regulador', false,
  'catalogo_tanque', false, 'proximos_vencimientos', false, 'reportes', false, 'correos_semanales', false,
  'solicitudes_almacen', false, 'historial', false, 'changelog', false, 'manual', false
)
where not exists (
  select 1 from public.roles_app
   where app = 'interno' and lower(translate(trim(nombre), 'é', 'e')) = 'tecnico'
);

-- Los dos "Técnico" quedan vinculados (si ninguno está vinculado todavía).
do $$
declare
  v_cli uuid;
  v_int uuid;
begin
  select id into v_cli from public.roles_app
   where app = 'clientes' and lower(translate(trim(nombre), 'é', 'e')) = 'tecnico' and vinculado_id is null limit 1;
  select id into v_int from public.roles_app
   where app = 'interno' and lower(translate(trim(nombre), 'é', 'e')) = 'tecnico' and vinculado_id is null limit 1;
  if v_cli is not null and v_int is not null then
    update public.roles_app set vinculado_id = v_int where id = v_cli;
    update public.roles_app set vinculado_id = v_cli where id = v_int;
  end if;
end;
$$;

-- Resumen (el SQL Editor de Supabase no muestra los avisos, así que se
-- muestra esta tabla al final).
select
  (select count(*) from public.profiles where coalesce((permisos->>'equipos_clientes_cerrar_orden')::boolean, false)) as personas_con_cerrar_orden,
  (select count(*) from public.profiles where coalesce((permisos->>'compresor_mantenimiento_registrar')::boolean, false)) as personas_con_mant_compresor,
  (select string_agg(nombre || ' (' || inicio || case when vinculado_id is not null then ', vinculado' else '' end || ')', ', ') from public.roles_app where app = 'clientes') as roles_equipos_clientes,
  (select string_agg(nombre || ' (' || inicio || case when vinculado_id is not null then ', vinculado' else '' end || ')', ', ') from public.roles_app where app = 'interno') as roles_app_interno;

-- =====================================================================
-- migration_67.sql -- Arreglo: facturar llenados de tanque. Se puede correr
-- sola, antes o después de la 66, y más de una vez sin problema. No hace
-- falta instalar código nuevo: el arreglo funciona con la versión que ya
-- está instalada.
--
-- Problema (reportado 23-oct-2026, con foto de Equipos › Llenados de
-- tanque): "solamente me funciona a mí el botón de facturar los llenados.
-- Intenté con otros usuarios y no funciona, o sea, deja escribir pero no se
-- guarda."
--
-- Causa: desde migration_02.sql, la base de datos solo deja cambiar un
-- llenado a los Administradores ("Solo administradores editan llenados").
-- El permiso "Facturación de llenado" mostraba el botón, pero nunca se le
-- dio permiso en la base de datos para guardar (migration_06.sql lo dejó
-- anotado y no lo hizo). Al guardar, la base de datos no cambiaba nada y
-- tampoco avisaba, así que parecía que guardaba.
--
-- Arreglo: quien tiene "Facturación de llenado" puede marcar un llenado
-- como facturado (o quitarlo) y poner su No. de factura. Solo eso: si
-- intenta cambiar cualquier otra cosa del llenado (cantidad, gas, nota...),
-- la base de datos no lo deja. Editar y anular siguen siendo del Titular y
-- los Administradores.
-- =====================================================================

drop policy if exists "Permiso facturacion factura llenados" on public.llenados_tanques;
create policy "Permiso facturacion factura llenados"
  on public.llenados_tanques for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'facturacion')::boolean from public.profiles where id = auth.uid()), false)
  );

-- Quien no es Titular ni Administrador solo puede cambiar la facturación.
create or replace function public.llenado_solo_facturacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_titular() or public.is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - 'facturado' - 'factura_no') is distinct from (to_jsonb(old) - 'facturado' - 'factura_no') then
    raise exception 'Solo puedes cambiar la facturación de este llenado (facturado y No. de factura).';
  end if;
  return new;
end;
$$;

drop trigger if exists llenado_solo_facturacion on public.llenados_tanques;
create trigger llenado_solo_facturacion
  before update on public.llenados_tanques
  for each row execute function public.llenado_solo_facturacion();

-- Resumen (el SQL Editor de Supabase no muestra los avisos).
select
  (select count(*) from public.profiles where coalesce((permisos->>'facturacion')::boolean, false)) as personas_con_facturacion,
  (select count(*) from public.llenados_tanques where not facturado) as llenados_por_facturar;
