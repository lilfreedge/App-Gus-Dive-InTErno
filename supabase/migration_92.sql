-- =====================================================================
-- migration_92.sql  (V64, 9-nov-2026)
-- 1) Perfil del buzo y "Mis documentos" (275, 279, 281):
--    - cel_cambiado_en: cuándo cambió su celular por el link (una vez al mes).
--    - cert_foto: la imagen de su certificación (captura o foto), y
--      cert_revisada_en / cert_revisada_por: "Revisada por Gus".
-- 2) Ficha del estudiante (282): el No. de factura del pago del curso.
-- 3) Cursos nuevos (285): BLS, OXY, BLS + OXY y especialidades, con el
--    itinerario vacío. Solo se agregan si no existen (por el nombre).
-- Se puede correr más de una vez. No borra ni cambia datos que ya existan.
-- =====================================================================

alter table public.viajes_buzos add column if not exists cel_cambiado_en timestamptz;
alter table public.viajes_buzos add column if not exists cert_foto text;
alter table public.viajes_buzos add column if not exists cert_revisada_en timestamptz;
alter table public.viajes_buzos add column if not exists cert_revisada_por text;

alter table public.est_estudiantes add column if not exists factura text;

-- Para ordenar el link por grupos (cursos, primeros auxilios, especialidades).
alter table public.est_cursos add column if not exists grupo text;

insert into public.est_cursos (nombre, escuelas, pasos, lleva_examen, orden, grupo)
select v.nombre, v.escuelas::jsonb, v.pasos::jsonb, v.examen, v.orden, v.grupo
  from (values
    ('BLS', '["SNSI"]', '["teoria1","record","identificacion","foto"]', true, 20, 'primeros_auxilios'),
    ('OXY', '["SNSI"]', '["teoria1","record","identificacion","foto"]', true, 21, 'primeros_auxilios'),
    ('BLS + OXY', '["SNSI"]', '["teoria1","record","identificacion","foto"]', true, 22, 'primeros_auxilios'),
    ('Flotabilidad (Hovering Diver / Trim)', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 30, 'especialidad'),
    ('Navegación subacuática', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 31, 'especialidad'),
    ('Buceo nocturno', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 32, 'especialidad'),
    ('Buceo desde barco y con corriente (Boat & Drift Diver)', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 33, 'especialidad'),
    ('Buceo profundo (Deep Diver)', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 34, 'especialidad')
  ) as v(nombre, escuelas, pasos, examen, orden, grupo)
 where not exists (select 1 from public.est_cursos c where lower(c.nombre) = lower(v.nombre));
