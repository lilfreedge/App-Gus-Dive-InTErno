-- Prohibir seriales repetidos, a nivel de base de datos (feedback en vivo,
-- 29-sep-2026, pedido explícito: "prohibir rotundamente la posibilidad de
-- registrar seriales repetidos, ya sean de tanques reguladores o lo que
-- sea. prohibido registrar seriales repetidos"). La app ya valida esto
-- antes de guardar en los 3 lugares donde se crea/edita un equipo (ver
-- lib/equipos.js, serieYaRegistrada) y muestra un mensaje claro -- este
-- índice único es el respaldo real a nivel de base de datos, por si dos
-- personas guardan al mismo tiempo (la validación de la app por sí sola no
-- alcanza a cubrir esa carrera) o se inserta directo sin pasar por la app.
--
-- Validado GLOBAL (entre todos los clientes), no solo dentro de un mismo
-- cliente -- un No. de serie lo asigna el fabricante, así que el mismo
-- serial en dos equipos de clientes distintos también sería un error de
-- captura casi siempre. Si se prefiere acotarlo por cliente en vez de
-- global, avisar para ajustar esto (cambiaría el índice a
-- (cliente_id, lower(serie))).
--
-- OJO: si ya existen seriales duplicados cargados de antes, este índice va
-- a fallar al crearse -- si da error al correr esta migración, avisar para
-- revisar juntos cuáles son los duplicados existentes antes de aplicarla.
create unique index if not exists equipos_del_cliente_serie_unica
  on public.equipos_del_cliente (lower(serie))
  where serie is not null and serie <> '';
