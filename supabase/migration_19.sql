-- Migration 19: agrega "Fecha de envío" al seguimiento de la orden
-- (pedido explícito, 23-sep-2026: "cuando se ponga en prueba
-- hidrostatica o reparacion, ademas de tener fecha de retorno, poder
-- poner fecha de envio") -- antes solo existía "Fecha de retorno a
-- tienda" (cuándo vuelve), faltaba cuándo se mandó. La vista
-- ordenes_equipos_con_nombre usa "select o.*" (ver migration_17.sql),
-- así que recoge esta columna nueva sin tocarla.
alter table public.ordenes_equipos add column if not exists fecha_envio date;
