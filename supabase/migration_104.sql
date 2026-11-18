-- migration_104 (V100, maqueta V102: "56. me gusta la C pero agrégale la
-- casilla obligatoria que tiene la B"): el itinerario de cada curso (cada
-- fecha abierta), con sus fechas y horas, y cuándo se confirmó.
-- Sin correrlo, todo sigue saliendo como antes (el itinerario del Catálogo).
-- Se puede correr más de una vez. No borra datos.
alter table public.est_fechas add column if not exists itinerario jsonb;
alter table public.est_fechas add column if not exists itinerario_confirmado_en timestamptz;
