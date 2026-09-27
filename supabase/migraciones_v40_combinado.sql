-- Combinado para v40/V15: migration_33.sql + migration_34.sql + migration_35.sql + migration_36.sql
-- Corren en cualquier orden entre ellas; este archivo las junta solo por comodidad.

-- ===== migration_33.sql =====
-- Migration 33 (27-sep-2026) -- v40: nuevo tipo de equipo "Compresor" en
-- App Equipos de clientes (item explícito de la ronda grande de feedback:
-- agregar Compresor al listado de tipo_equipo, junto con un permiso
-- separado "editar mantenimiento de compresor" para las órdenes de ese
-- tipo -- ver lib/roles.js). No se creó catálogo ni tabla aparte para
-- Compresor (pedido explícito: no construir eso por ahora) -- se guarda
-- igual que Tanques/Reguladores/BC/Computadora/Otro, como texto en
-- ordenes_equipos.tipo_equipo y equipos_del_cliente.tipo_equipo.

-- 1) Ambos checks se definieron sin nombre explícito en su momento
--    (migration_16.sql y migration_17.sql), así que Postgres les puso el
--    nombre por default "<tabla>_<columna>_check" -- se botan y se vuelven
--    a crear con "Compresor" agregado a la lista.
alter table public.ordenes_equipos
  drop constraint if exists ordenes_equipos_tipo_equipo_check;
alter table public.ordenes_equipos
  add constraint ordenes_equipos_tipo_equipo_check
  check (tipo_equipo in ('Tanques', 'Reguladores', 'BC', 'Computadora', 'Otro', 'Compresor'));

alter table public.equipos_del_cliente
  drop constraint if exists equipos_del_cliente_tipo_equipo_check;
alter table public.equipos_del_cliente
  add constraint equipos_del_cliente_tipo_equipo_check
  check (tipo_equipo in ('Tanques', 'Reguladores', 'BC', 'Computadora', 'Otro', 'Compresor'));

-- 2) Dos servicios nuevos en el Catálogo de servicios, ya tageados para
--    Compresor (columna tipos_equipo, text[], agregada en migration_29) --
--    así el desplegable de "Servicio a realizar" no queda vacío para
--    Compresor en cuanto se pueda elegir ese tipo de equipo. Si ya
--    existían con ese nombre exacto (de otro tipo de equipo), se les
--    agrega Compresor a su arreglo en vez de duplicar la fila.
insert into public.servicios_catalogo (nombre, tipos_equipo)
select v.nombre, array['Compresor']
from (values ('Mantenimiento'), ('Reparación')) as v(nombre)
where not exists (
  select 1 from public.servicios_catalogo s where s.nombre = v.nombre
);

update public.servicios_catalogo
  set tipos_equipo = array(select distinct unnest(tipos_equipo || array['Compresor']))
  where nombre in ('Mantenimiento', 'Reparación')
    and not ('Compresor' = any(tipos_equipo));

-- Nota: no hace falta recrear ordenes_equipos_con_nombre en esta
-- migración -- no se agregó ninguna columna nueva a la tabla, solo se
-- cambió un check constraint, así que el gotcha de "select o.*" no aplica
-- acá (ver migration_32.sql para el caso donde sí aplicó).

-- ===== migration_34.sql =====
-- Migration 34 (27-sep-2026) -- v40: cuentas nuevas nacen con acceso a
-- las 2 apps, pero con todos los demás permisos apagados (pedido
-- explícito: "pon que cuando alguien se cree una cuenta nueva tenga
-- acceso a los 2 apps pero que en los permisos tengan todo desactivado").
--
-- "Acceso a las 2 apps" = permisos.acceso_app_interno y
-- permisos.equipos_clientes (los dos checks que gatean poder ENTRAR a
-- cada app -- ver /espacio/accesos y lib/roles.js). El resto de los
-- permisos granulares (registrar orden, agregar equipo, editar equipo,
-- reportes, etc.) NO se tocan acá -- ya nacen apagados porque no están
-- en este default ni en PERMISOS_DEFAULT (lib/roles.js), que sigue
-- siendo el que rellena cualquier llave que falte al leer el perfil.
--
-- Solo se cambia el DEFAULT de la columna (se usa cuando
-- handle_new_user() inserta la fila sin especificar permisos, ver
-- schema.sql) -- los perfiles YA existentes no se tocan, cada uno se
-- queda con su propio permisos guardado, igual que se hizo con
-- acceso_app_interno en migration_28.sql.
alter table public.profiles alter column permisos set default
  '{"reportes":false,"catalogo":true,"historial":false,"changelog":false,"acceso_app_interno":true,"equipos_clientes":true}'::jsonb;

-- ===== migration_35.sql =====
-- Migration 35 (27-sep-2026) -- v40: políticas RLS de cambios_historial
-- para los permisos granulares nuevos de la ronda grande de feedback.
--
-- migration_24.sql había dejado el SELECT de cambios_historial en
-- 'ordenes_equipos'/'equipos_del_cliente' exclusivo del Titular (ni
-- siquiera Administradores podían verlo) -- correcto en su momento
-- ("eso que solamente lo pueda ver yo como titular, por el momento"),
-- pero con el permiso nuevo `equipos_clientes_historial` (gatea la
-- pantalla Historial de App Clientes, ver lib/roles.js) alguien SIN ser
-- Titular ya puede entrar a esa pantalla -- sin este cambio, entraría y
-- vería la lista vacía (RLS se lo escondería igual), pareciendo un bug.
--
-- También se suma 'clientes_equipos' a ambas políticas -- tabla nueva
-- para el historial de ediciones de "Editar cliente" (nombre/teléfono),
-- feature nueva de esta misma entrega (permiso equipos_clientes_editar_cliente).
drop policy if exists "Solo administradores ven el historial de cambios" on public.cambios_historial;
create policy "Solo administradores ven el historial de cambios"
  on public.cambios_historial for select
  to authenticated
  using (
    public.is_titular()
    or (public.is_admin() and tabla not in ('ordenes_equipos', 'equipos_del_cliente', 'clientes_equipos'))
    or (
      tabla in ('ordenes_equipos', 'equipos_del_cliente', 'clientes_equipos')
      and coalesce((select (permisos->>'equipos_clientes_historial')::boolean from public.profiles where id = auth.uid()), false)
    )
  );

drop policy if exists "Solo administradores registran cambios" on public.cambios_historial;
create policy "Solo administradores registran cambios"
  on public.cambios_historial for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      tabla = 'ordenes_equipos'
      and coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
    )
    or (
      tabla = 'equipos_del_cliente'
      and coalesce((select (permisos->>'equipos_clientes_editar_equipo')::boolean from public.profiles where id = auth.uid()), false)
    )
    or (
      tabla = 'clientes_equipos'
      and coalesce((select (permisos->>'equipos_clientes_editar_cliente')::boolean from public.profiles where id = auth.uid()), false)
    )
  );

-- ===== migration_36.sql =====
-- Informe de mantenimiento para Reguladores (item 36, nueva feature,
-- ronda grande de feedback, 27-sep-2026) -- mockup aprobado Informe.dc.html.
--
-- 1) Datos de INTAKE, capturados al registrar la orden (solo Reguladores
--    -- el mockup los muestra de solo lectura en el Informe con la nota
--    "Se anota al registrar la orden -- no se edita aquí"):
--    - regulador_componentes: qué piezas trajo el cliente (chips en el
--      mockup: primera etapa, segunda etapa, octopus, mangueras,
--      manómetro, otro).
--    - regulador_danos_visibles / regulador_problemas_reportados: estado
--      inicial del equipo, texto libre.
--
-- 2) informe_mantenimiento: lo que llena el técnico en la pantalla nueva
--    "Informe de mantenimiento" (marca/modelo/serie que confirma o
--    corrige para este servicio, trabajo realizado, presión ajustada,
--    observación, aprobado/no aprobado, técnico). Guardado aparte del
--    equipo/orden para no pisar el registro maestro del equipo del
--    cliente con lo que se escriba acá.
alter table public.ordenes_equipos
  add column if not exists regulador_componentes jsonb not null default '{}'::jsonb,
  add column if not exists regulador_danos_visibles text,
  add column if not exists regulador_problemas_reportados text,
  add column if not exists informe_mantenimiento jsonb;

-- Recrea la vista para que exponga las columnas nuevas -- mismo gotcha de
-- Postgres de siempre ("select o.*" no ve columnas nuevas de la tabla de
-- abajo sin recrearse; "create or replace view" falla con 42P16 porque se
-- insertarían en medio de las que ya hay, no al final -- ver
-- migration_31.sql/migration_32.sql para el mismo caso).
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;
