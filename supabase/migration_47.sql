-- No. de orden único, a nivel de base de datos (feedback en vivo,
-- 1-oct-2026, pedido explícito: "No permita que numeros sean repetidos en
-- Numeros de orden, esto debe de ser un numero unico"). La app ya valida
-- esto antes de guardar (ver lib/ordenes.js, noOrdenYaRegistrado, usado en
-- Registrar orden y en Editar datos de la orden) -- este índice único es
-- el respaldo real a nivel de base de datos, mismo patrón ya usado para
-- seriales repetidos (migration_44.sql).
--
-- OJO: si ya existen No. de orden duplicados cargados de antes, este
-- índice va a fallar al crearse -- si da error al correr esta migración,
-- avisar para revisar juntos cuáles son los duplicados existentes antes
-- de aplicarla.
create unique index if not exists ordenes_equipos_no_orden_fisico_unico
  on public.ordenes_equipos (lower(no_orden_fisico))
  where no_orden_fisico is not null and no_orden_fisico <> '';
