-- =====================================================================
-- PASO 2 (15-nov) -- BORRA. Corre primero el paso 1 para ver la lista.
-- Pedido explícito: "dame un código supabase para borrar todos estos
-- buzos en buceos" y "... todos estos clientes en alquiler".
--   A. Alquiler: todos los alquileres (sus artículos se van con ellos).
--   B. Buceos: todos los buzos que no son staff ni estudiantes, con sus
--      inscripciones en buceos (y sus pagos).
-- Todo va junto: si algo falla, no se borra nada. Queda anotado en la
-- bitácora de Alquiler y en la de Buceos.
-- =====================================================================
begin;

insert into public.alq_bitacora (nombre, texto, antes, despues)
select 'Supabase (SQL)', 'Borró todos los alquileres de prueba', count(*) || ' alquileres', 'Borrados'
from public.alq_alquileres
having count(*) > 0;

insert into public.viajes_bitacora (quien, texto, antes, despues)
select 'Supabase (SQL)', 'Borró ' || count(*) || ' buzos de prueba', string_agg(b.nombre, ', ' order by b.nombre), 'Borrados'
from public.viajes_buzos b
where not b.es_staff
  and not exists (select 1 from public.est_estudiantes e where e.buzo_id = b.id)
having count(*) > 0;

-- A. Alquiler
delete from public.alq_alquileres where true;

-- B. Buceos
delete from public.viajes_inscripciones i
using public.viajes_buzos b
where i.buzo_id = b.id
  and not b.es_staff
  and not exists (select 1 from public.est_estudiantes e where e.buzo_id = b.id);

delete from public.viajes_buzos b
where not b.es_staff
  and not exists (select 1 from public.est_estudiantes e where e.buzo_id = b.id);

commit;

-- Lo que quedó (staff y estudiantes):
select b.nombre, case when b.es_staff then 'Staff' else 'Estudiante' end as por_que_se_quedo
from public.viajes_buzos b
order by b.nombre;
