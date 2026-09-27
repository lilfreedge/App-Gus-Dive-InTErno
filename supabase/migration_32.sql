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
