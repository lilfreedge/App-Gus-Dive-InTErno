-- Migration 26 (23-sep-2026): rediseño de "Envío a" / "En espera" +
-- Prueba hidrostática independiente + Autorización del cliente, todo
-- pedido explícito el mismo día:
--
-- "boton de 'en espera' ponerlo dentro de 'envio a'. 'envio a' cambiar
-- por 'status' y dentro estará: 'En espera', 'Reparación'... Prueba
-- hidrostatica no debe de estar. Si al momento de registrar equipo se le
-- pone prueba hidrostatica pues por default cuando se abra el
-- seguimiento debe de aparecer 'Fecha de envio', cambiar fecha de envio
-- por 'fecha de envio a prueba hidrostatica'"
--
-- Y, en el mismo hilo, un pedido nuevo (autorización del cliente para
-- cambios no solicitados de entrada, ej. cambiar una manguera de
-- regulador): "hay casos que... nuestra recomendacion es cambiarla pero
-- para nosotros hacer eso necesitamos autorizacion de cliente...".

-- ============================================================
-- 1) Prueba hidrostática, independiente de "envio_a"/"Status" -- se
--    activa sola según el servicio de la orden (que_se_hara), no por
--    selección manual. Columna nueva para su propia fecha de envío;
--    sigue compartiendo fecha_retorno_tienda con "Reparación" (un
--    pedido no cubre las dos cosas a la vez en la práctica).
-- ============================================================
alter table public.ordenes_equipos add column if not exists fecha_envio_hidrostatica date;

-- Backfill: órdenes que ya tenían envio_a = 'Prueba hidrostática'
-- guardado (valor que dejó de ser válido para ese campo) -- se copia su
-- fecha_envio a la columna nueva, sin borrar fecha_envio (se deja tal
-- cual, solo deja de leerse para esas filas), y se limpia envio_a para
-- que no aparezcan por error bajo "Status: Reparación".
update public.ordenes_equipos
  set fecha_envio_hidrostatica = coalesce(fecha_envio_hidrostatica, fecha_envio)
  where envio_a = 'Prueba hidrostática';

update public.ordenes_equipos
  set envio_a = null
  where envio_a = 'Prueba hidrostática';

-- ============================================================
-- 2) Autorización del cliente, al registrar la orden -- select con
--    2 opciones + notas libres para el detalle (formato elegido por el
--    usuario entre varias opciones presentadas).
-- ============================================================
alter table public.ordenes_equipos add column if not exists autorizacion_cliente text;
alter table public.ordenes_equipos add column if not exists autorizacion_notas text;

-- ============================================================
-- 2b) Notificaciones al cliente, como lista (fecha + medio) en vez de
--     una sola fecha -- pedido explícito: "que se te ocurre para cuando
--     por ejemplo notifiquemos a un mismo cliente 2 veces? agrega
--     también via de notificacion al cliente para uno saber". Se deja
--     fecha_notificacion_cliente como estaba (se sigue llenando con la
--     más reciente, por compatibilidad) -- la fuente real pasa a ser
--     esta columna nueva.
-- ============================================================
alter table public.ordenes_equipos add column if not exists notificaciones_cliente jsonb not null default '[]'::jsonb;

update public.ordenes_equipos
  set notificaciones_cliente = jsonb_build_array(jsonb_build_object('fecha', fecha_notificacion_cliente, 'medio', 'Otro'))
  where fecha_notificacion_cliente is not null and notificaciones_cliente = '[]'::jsonb;

-- ============================================================
-- 2c) Accesos directos opcionales del menú de App Equipos de clientes
--     (pedido explícito: "agrega boton opcional (asi como esta en app
--     interno) para que la gente puedan ver shortcut de reportes en su
--     menú") -- mismo mecanismo que profiles.menu_personalizado de App
--     Interno, columna aparte para no pisarla.
-- ============================================================
alter table public.profiles add column if not exists menu_personalizado_clientes jsonb;

-- ============================================================
-- 3) Recrea la vista ordenes_equipos_con_nombre para que tome las
--    columnas nuevas -- mismo gotcha de Postgres ya documentado en
--    migration_23.sql y migration_25.sql (una vista con "select o.*" no
--    expone columnas nuevas de la tabla de abajo sin recrearse).
-- ============================================================
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;
