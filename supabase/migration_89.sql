-- =====================================================================
-- migration_89.sql  (V62, 8-nov-2026)
-- Link del estudiante: "Registrar a un menor de edad" ("229").
-- En la ficha del menor se guarda quién lo registró (nombre, documento,
-- celular y parentesco). Se puede correr más de una vez. No borra nada.
-- =====================================================================

alter table public.viajes_buzos add column if not exists tutor jsonb;
