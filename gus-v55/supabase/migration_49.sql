-- Migration 49 (5-oct-2026) -- "Ver bitácora de la orden" pasa de ser
-- exclusivo de Titular/Administrador (hardcodeado) a un permiso granular
-- más, igual que "Historial de anulaciones y ediciones" y "Bitácora
-- movimientos en órdenes" -- pedido explícito, tras preguntar por qué
-- convenía tener algo que solo el Titular podía ver cuando el otro
-- acceso (Historial de ediciones de esta orden) es "casi igual" y sí se
-- puede otorgar: "no me hace sentido... porque querria tener algo que
-- solo yo pueda verlo, cuando el otro es casi igual y puedo dar ese
-- acceso?". Con esto, el Titular puede darle este acceso a cualquier
-- usuario (no solo a Administradores) desde Permisos > General -- y, al
-- ya incluir Bitácora todo lo que mostraba el link separado "Ver
-- historial de ediciones de esta orden" (ediciones) más holds resueltos y
-- repuestos autorizados eliminados, ese link se quita de la ficha de la
-- orden (ver app/app-clientes/ordenes/[id]/page.js) -- ya no hacía falta
-- tener los dos.
--
-- IMPORTANTE (mismo criterio que acceso_app_interno, migration_28.sql):
-- hoy TODOS los Administradores ya pueden ver la Bitácora de cualquier
-- orden sin que nadie se lo tuviera que dar (estaba hardcodeado). Si este
-- permiso naciera en `false` para todo el mundo, cada Administrador que
-- ya la estuviera usando se quedaría afuera de golpe. Este UPDATE le
-- pone el permiso en `true` a todos los perfiles que YA son
-- Administradores -- de aquí en adelante, un Administrador nuevo (o
-- cualquier otro usuario) nace sin este acceso hasta que el Titular se
-- lo dé desde Permisos. No toca ninguna otra llave de profiles.permisos.
update public.profiles
  set permisos = coalesce(permisos, '{}'::jsonb) || '{"equipos_clientes_bitacora_orden": true}'::jsonb
  where is_admin = true
    and not (coalesce(permisos, '{}'::jsonb) ? 'equipos_clientes_bitacora_orden');
