-- =====================================================================
-- migration_74.sql -- App Interno: Profundímetro en los reguladores de
-- alquiler (V49). Se puede correr más de una vez. No borra ni cambia nada:
-- solo agrega la columna.
--
-- Pedido explícito (nota "App Gus interno", 28-oct-2026): "En app interno,
-- al editar o agregar un equipo de alquiler, incluye la parte de
-- profundímetro".
-- =====================================================================
alter table public.reguladores_alquiler add column if not exists profundimetro text;
