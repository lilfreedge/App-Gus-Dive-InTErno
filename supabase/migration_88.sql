-- =====================================================================
-- migration_88.sql  (V62, 8-nov-2026)
-- Control Estudiantes > Interesados con seguimiento ("245. ok").
-- Cada interesado guarda su historia: qué se le dijo, qué contestó y
-- cuándo volver a escribirle. Se guarda en una columna nueva (lista).
-- Se puede correr más de una vez. No borra nada.
-- =====================================================================

alter table public.est_interesados add column if not exists seguimiento jsonb not null default '[]'::jsonb;
