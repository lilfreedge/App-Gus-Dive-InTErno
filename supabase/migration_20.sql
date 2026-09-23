-- Migration 20: "No. de orden" del talonario físico (pedido explícito,
-- 23-sep-2026: "es un numero de una secuencia que tenemos de un
-- talonario fisico, donde se registraran las ordenes por primera vez")
-- -- número que Pipe anota a mano en el talonario de papel al recibir el
-- equipo del cliente. Es distinto del folio digital (se genera solo,
-- ver migration_16.sql): este viene de afuera de la app, así que se
-- guarda como texto y se pide en el formulario, no se calcula.
alter table public.ordenes_equipos add column if not exists no_orden_fisico text;
