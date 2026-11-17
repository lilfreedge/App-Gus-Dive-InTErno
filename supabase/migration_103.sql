-- migration_103 (V98): el detalle de cada presupuesto pedido queda guardado en
-- la fecha del curso (cuándo, quién, cuántos estudiantes, el total y la hoja),
-- para verlo después en la tarjeta Presupuesto. Los presupuestos
-- predeterminados de cada curso van en est_cursos.info (no necesitan SQL).
-- Se puede correr más de una vez. No borra datos.
alter table public.est_fechas add column if not exists presupuesto_detalle jsonb not null default '[]'::jsonb;
