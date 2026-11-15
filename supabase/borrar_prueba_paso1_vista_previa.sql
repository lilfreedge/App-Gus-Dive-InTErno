-- =====================================================================
-- PASO 1 (15-nov) -- VISTA PREVIA. No borra nada, solo enseña.
-- Para borrar los buzos de prueba de Buceos y los clientes de Alquiler.
--
-- Qué hará el paso 2:
--   * Alquiler: borra TODOS los alquileres (con sus artículos). Los
--     equipos que salían "afuera" vuelven a quedar disponibles.
--   * Buceos: borra a todos los buzos (no al staff) con sus inscripciones
--     en buceos. Los que son estudiantes en Control Estudiantes se quedan
--     (son la misma persona); si también los quieres fuera, bórralos
--     primero en Control Estudiantes y vuelve a correr el paso 2.
-- =====================================================================
select
  b.nombre,
  case when b.es_staff then 'Staff' else 'Buzo' end as tipo,
  (select count(*) from public.viajes_inscripciones i where i.buzo_id = b.id) as buceos,
  (select count(*) from public.alq_alquileres a where a.buzo_id = b.id) as alquileres_se_borran,
  (select count(*) from public.est_estudiantes e where e.buzo_id = b.id) as cursos,
  case
    when b.es_staff then 'La persona se queda (staff)'
    when exists (select 1 from public.est_estudiantes e where e.buzo_id = b.id) then 'La persona se queda (es estudiante)'
    else 'Se borra'
  end as que_pasa
from public.viajes_buzos b
where not b.es_staff
   or exists (select 1 from public.alq_alquileres a where a.buzo_id = b.id)
order by que_pasa desc, b.nombre;
