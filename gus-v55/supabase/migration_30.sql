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
