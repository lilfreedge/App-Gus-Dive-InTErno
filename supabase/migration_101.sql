-- migration_101 (V91): confirmación de entrega del presupuesto al instructor (QR).
-- Se puede correr más de una vez. No borra datos.
alter table public.est_fechas add column if not exists presupuesto_entregado_en timestamptz;
alter table public.est_fechas add column if not exists presupuesto_entregado_info text;
