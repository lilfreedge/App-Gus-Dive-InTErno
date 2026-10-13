-- ============================================================
-- Migraciones combinadas: migration_27.sql a migration_36.sql
-- (armado el 27-sep-2026, a pedido de Freedge, para correr en
-- una sola vuelta en el SQL Editor de Supabase)
--
-- Cubre todo lo pendiente desde v33 (25-sep) hasta v40/V15
-- (27-sep). Se revisó cada migración de este rango y las 10 son
-- IDEMPOTENTES: usan "if not exists" / "if exists" / updates con
-- condición que ya excluye lo ya migrado -- así que es seguro
-- correr este archivo completo en una sola vuelta AUNQUE ya
-- hayas corrido antes una o varias de estas migraciones por
-- separado (las partes ya aplicadas simplemente no hacen nada la
-- segunda vez). No hace falta confirmar cuál fue la última que
-- corriste.
--
-- Orden interno (no cambiarlo): 27, 28, 29, 30, 31, 32, 33, 34,
-- 35, 36 -- algunas dependen de que la anterior ya haya corrido
-- dentro de este mismo archivo (ej. 33 usa la columna
-- tipos_equipo que agrega la 29).
-- ============================================================


-- ==================== migration_27.sql ====================
-- Migration 27 (25-sep-2026): corrige "Formatear registros" de App
-- Clientes, reportado en vivo con el error:
--   "No se pudo formatear: DELETE requires a WHERE clause"
--
-- Causa: Supabase exige que todo DELETE/UPDATE tenga una cláusula WHERE
-- para el rol con el que se conecta la app (protección estándar contra
-- borrados accidentales de toda una tabla) -- incluso dentro de una
-- función "security definer" como esta. Los DELETE sin condición de
-- migration_24.sql ("borra toda la tabla") chocan con esa regla.
--
-- Arreglo: agregar "where true" a cada DELETE sin condición -- sigue
-- borrando la tabla completa igual que antes, solo cumple con la
-- sintaxis que exige Supabase. Se corrige tanto la función de App
-- Clientes (la reportada) como la de App Interno (mismo patrón, para
-- que no le pase lo mismo el día que se use).

create or replace function public.formatear_registros_clientes(
  p_borrar_ordenes boolean default false,
  p_borrar_piezas boolean default false,
  p_borrar_servicios boolean default false,
  p_borrar_clientes boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_titular() then
    raise exception 'Solo el Titular puede formatear los registros.';
  end if;

  if p_borrar_ordenes or p_borrar_clientes then
    delete from public.ordenes_equipos where true;
    alter sequence public.ordenes_equipos_folio_seq restart with 1;
  end if;

  if p_borrar_clientes then
    delete from public.equipos_del_cliente where true;
    delete from public.clientes_equipos where true;
  end if;

  if p_borrar_piezas then
    delete from public.piezas_catalogo where true;
  end if;

  if p_borrar_servicios then
    delete from public.servicios_catalogo where true;
  end if;
end;
$$;

create or replace function public.formatear_registros(
  p_borrar_salidas boolean default false,
  p_borrar_llenados boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_titular() then
    raise exception 'Solo el Titular puede formatear los registros.';
  end if;

  if p_borrar_salidas then
    delete from public.salidas where true;
    alter sequence public.salidas_folio_seq restart with 1;
  end if;

  if p_borrar_llenados then
    delete from public.llenados_tanques where true;
    alter sequence public.llenados_folio_seq restart with 1;
  end if;
end;
$$;


-- ==================== migration_28.sql ====================
-- Migration 28 (26-sep-2026) -- v33: batería grande de ajustes a App
-- Equipos de clientes decidida en una ronda larga de feedback (quitar
-- "Status", Reparación auto-detectada como ya pasaba con Prueba
-- hidrostática, notas del técnico sobre el regulador, y la nueva
-- pantalla "Accesos a apps" desde /espacio).

-- 1) Notas del técnico sobre el regulador (item 12, pedido explícito:
--    "abajo de lo repuestos, agrega una seccion para que el tecnico
--    ponga notas del regulador... para que el buzo lo tenga pendiente"
--    -- visible en la ficha de la orden y en el reporte).
alter table public.ordenes_equipos add column if not exists notas_tecnico_regulador text;

-- 2) Acceso a App Interno como permiso propio (item 9, pedido explícito:
--    nueva pantalla "Accesos a apps" desde /espacio, con un check para
--    App Equipos de clientes -- ya existía, es profiles.permisos.
--    equipos_clientes -- y uno nuevo para App Interno).
--
--    IMPORTANTE (avisado antes de hacer esto): /dashboard nunca había
--    tenido un gate propio -- cualquiera con sesión podía entrar. Si
--    este permiso naciera en `false` para todo el mundo, la primera vez
--    que alguien que no sea el Titular entre a /dashboard después de
--    esta actualización se quedaría afuera de golpe. Este UPDATE le pone
--    el permiso en `true` a TODOS los perfiles que ya existen hoy, para
--    que nadie que ya estuviera usando App Interno pierda el acceso --
--    de aquí en adelante, un perfil nuevo nace sin este acceso hasta que
--    el Titular se lo dé desde /espacio/accesos. No borra ni cambia
--    ningún otro dato de profiles.permisos -- solo le agrega esta llave
--    si todavía no la tiene.
update public.profiles
  set permisos = coalesce(permisos, '{}'::jsonb) || '{"acceso_app_interno": true}'::jsonb
  where not (coalesce(permisos, '{}'::jsonb) ? 'acceso_app_interno');

-- 3) Recrea la vista ordenes_equipos_con_nombre para que exponga
--    notas_tecnico_regulador -- mismo gotcha de Postgres de siempre
--    (una vista con "select o.*" no ve columnas nuevas de la tabla de
--    abajo sin recrearse).
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;


-- ==================== migration_29.sql ====================
-- Migration 29 (26-sep-2026) -- v36: tipos_equipo en servicios_catalogo
-- (item 21, pedido explícito: "que el servicio a realizar en registrar
-- orden se filtre segun el tipo de equipo" -- y en "editar orden", item
-- 22 relacionado: "Autorización del cliente" solo debe verse para
-- Reguladores).
--
-- text[] (no una tabla aparte) porque un servicio puede aplicar a más de
-- un tipo de Equipo a la vez (ej. "Reparación" sirve para Reguladores,
-- BC y Computadora). Se backfillea por nombre para no dejar huérfano
-- ningún servicio ya existente en el catálogo -- cualquier servicio que
-- no calce con los nombres conocidos (incluido cualquier servicio
-- personalizado que el usuario ya haya agregado a mano) se marca para
-- los 4 tipos, para no desaparecer de golpe de ningún desplegable; el
-- usuario puede ajustarlo desde Catálogo de servicios, que ahora tiene
-- checkboxes para esto.
alter table public.servicios_catalogo
  add column if not exists tipos_equipo text[] not null default '{}';

-- Comparación sin tildes/mayúsculas (mismo criterio que quitarTildes()
-- en lib/ordenes-estado.js, ver el bug del item 27) -- para que "Prueba
-- Hidrostática", "prueba hidrostatica", etc. hagan match igual sin
-- importar acentos.
update public.servicios_catalogo
  set tipos_equipo = array['Tanques']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%inspeccion visual%';

update public.servicios_catalogo
  set tipos_equipo = array['Tanques']
  where tipos_equipo = '{}'
    and (
      translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%limpieza%'
      or translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%hidrostat%'
    );

update public.servicios_catalogo
  set tipos_equipo = array['Reguladores']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%mantenimiento%';

update public.servicios_catalogo
  set tipos_equipo = array['BC']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%chequeo%';

update public.servicios_catalogo
  set tipos_equipo = array['Computadora']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%flasheo%';

update public.servicios_catalogo
  set tipos_equipo = array['Reguladores', 'BC', 'Computadora']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%reparacion%';

-- Cualquier servicio que no calzó con lo anterior (personalizado, o un
-- nombre que no se pudo adivinar) se deja disponible para los 4 tipos,
-- para no ocultarlo de golpe -- el usuario lo puede afinar a mano desde
-- Catálogo de servicios.
update public.servicios_catalogo
  set tipos_equipo = array['Tanques', 'Reguladores', 'BC', 'Computadora']
  where tipos_equipo = '{}';


-- ==================== migration_30.sql ====================
-- Migration 30 (26-sep-2026) -- v36: datos_nuevos en cambios_historial
-- (item 20, pedido explícito: "que en las ediciones aparezca el before
-- and after").
--
-- Hasta ahora registrarCambio() (lib/audit-client.js) solo guardaba el
-- "antes" (datos_anteriores) de un registro editado. Con esta columna
-- puede guardar también el "después", y Historial (App Equipos de
-- clientes) muestra ambos lado a lado. Columna opcional (jsonb, sin
-- "not null") -- queda en null en todo lo ya guardado antes de esta
-- versión, y también en cualquier otra tabla/pantalla de la app que siga
-- llamando a registrarCambio() sin pasar datosNuevos (no se tocó nada
-- fuera de App Equipos de clientes en este cambio).
alter table public.cambios_historial
  add column if not exists datos_nuevos jsonb;


-- ==================== migration_31.sql ====================
-- Migration 31 (27-sep-2026) -- v37: accesos directos opcionales en
-- Inicio de App Equipos de clientes (item 4, pedido explícito: "Shortcuts
-- de botones opcionales en 'mi perfil' para que aparezcan en INICIO. por
-- ahora solo tendremos 'registro de ordenes'").
--
-- Mismo patrón que profiles.menu_personalizado_clientes (accesos
-- opcionales del menú de arriba) -- columna aparte para no pisar esa, un
-- jsonb con {clave: true/false} por atajo (ver ATAJOS_INICIO_CLIENTES en
-- lib/nav-clientes.js). Nace vacía para todos -- nadie ve el atajo nuevo
-- hasta que lo active desde "Personalizar mi menú".
alter table public.profiles
  add column if not exists atajos_inicio_clientes jsonb;

-- Fix: historial_con_nombre no exponía datos_nuevos (ni motivo) --------
-- migration_30.sql agregó cambios_historial.datos_nuevos (y antes,
-- migration_04.sql ya había agregado motivo) DESPUÉS de que la vista
-- historial_con_nombre se creó en migration_02.sql con "select h.*,
-- p.full_name" -- una vista con "select *" congela su lista de columnas
-- al momento de crearse y no recoge columnas nuevas de la tabla de
-- forma automática. Resultado: el before/after de Historial (item 20,
-- v36) no estaba llegando en realidad ni a App Equipos de clientes ni
-- (una vez que se agregue) a App Interno, porque la vista de la que
-- ambas leen seguía sin esa columna -- ni siquiera tenía "motivo".
--
-- Un primer intento de este fix usaba "create or replace view" (pensando
-- que alcanzaba con agregar una columna al final), pero falló en
-- Supabase con "cannot change name of view column 'full_name' to
-- 'motivo'": como la vista termina en "..., p.full_name", cualquier
-- columna nueva de cambios_historial (motivo, datos_nuevos) se inserta
-- ANTES de full_name en la lista de salida, no al final -- así que para
-- Postgres eso es "mover"/renombrar una columna existente, no solo
-- agregar una nueva, y "create or replace view" no lo permite. Mismo
-- gotcha que ya se resolvió para ordenes_equipos_con_nombre en
-- migration_22.sql/migration_23.sql -- se corrige igual, con
-- "drop view" + "create view".
drop view if exists public.historial_con_nombre;

create view public.historial_con_nombre
  with (security_invoker = on) as
  select h.*, p.full_name
  from public.cambios_historial h
  join public.profiles p on p.id = h.user_id
  order by h.created_at desc;


-- ==================== migration_32.sql ====================
-- Migration 32 (27-sep-2026) -- feature "Hold" para App Equipos de
-- clientes, reemplaza el check simple "En espera" (diseñado en una ronda
-- larga de feedback: ver lib/holds.js para la forma completa de un hold).
-- Incluye también repuestos utilizados con "origen" (manual/autorizado)
-- y una Bitácora de la orden, visible a cualquiera con acceso a la app
-- ("que la pueda ver quien sea por ahora") -- mismo patrón que
-- notificaciones_cliente: jsonb en la propia fila, sin tabla ni política
-- RLS aparte.

-- 1) Hold: historial completo (incluye el activo, si hay uno) de "en
--    espera" con motivo, fecha de inicio y decisión del cliente.
alter table public.ordenes_equipos
  add column if not exists holds jsonb not null default '[]'::jsonb;

-- 2) Repuestos utilizados con origen -- para saber cuáles vinieron de un
--    Hold autorizado por el cliente (esos, al querer quitarlos, van a
--    pedir motivo -- ver form-client.js) y cuáles se escribieron a mano
--    (esos se quitan libremente, como siempre). ordenes_equipos.
--    repuestos_usados (texto separado por comas) NO se toca -- sigue
--    siendo la fuente para la ficha, el reporte y el historial de
--    ediciones; esta columna nueva es solo el detalle que necesita la UI.
alter table public.ordenes_equipos
  add column if not exists repuestos_usados_detalle jsonb not null default '[]'::jsonb;

-- 3) Bitácora de la orden: un renglón por cada Hold resuelto (motivo +
--    decisión del cliente) y por cada repuesto "autorizado" que se quitó
--    (con su motivo) -- pedido explícito: "que la pueda ver quien sea por
--    ahora", así que vive en la misma fila, no en cambios_historial (esa
--    sigue reservada a Titular).
alter table public.ordenes_equipos
  add column if not exists bitacora_orden jsonb not null default '[]'::jsonb;

-- 4) Migra las órdenes que ya estaban en_espera (con el check viejo) a un
--    hold "otro" activo, para no perder ese estado ni el motivo ya
--    escrito -- sin esto, al pasar a leer el Hold en vez del check crudo,
--    esas órdenes se verían de golpe como que ya no están en espera.
update public.ordenes_equipos
  set holds = jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'tipo', 'otro',
      'componente', null,
      'motivo', coalesce(motivo_espera, 'En espera (migrado del check anterior)'),
      'fecha_inicio', coalesce(fecha::text, created_at::date::text),
      'fecha_resolucion', null,
      'decision', null,
      'decision_nota', null,
      'activo', true
    )
  )
  where en_espera = true
    and (holds is null or holds = '[]'::jsonb);

-- 5) Recrea la vista ordenes_equipos_con_nombre para que exponga las 3
--    columnas nuevas -- mismo gotcha de Postgres de siempre (una vista
--    con "select o.*" no ve columnas nuevas de la tabla de abajo sin
--    recrearse; "create or replace view" falla con 42P16 en este caso
--    porque las columnas nuevas se insertarían en medio de las que ya
--    hay, no al final -- ver migration_31.sql para el mismo caso con
--    historial_con_nombre).
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;


-- ==================== migration_33.sql ====================
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


-- ==================== migration_34.sql ====================
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


-- ==================== migration_35.sql ====================
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


-- ==================== migration_36.sql ====================
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

