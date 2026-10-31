-- Reiniciar los folios de Inspecciones visuales, Salidas y Solicitudes al
-- almacén (App Interno). PASO 2: cambia los números. No borra nada:
-- renumera cada lista desde el #1, en el orden en que se registraron, y el
-- próximo de cada una sale con el número que sigue.
begin;

-- Inspecciones visuales (primero en negativo, para que no choquen)
update public.inspecciones_visuales set folio = -folio;
with orden as (select id, row_number() over (order by created_at, id) as n from public.inspecciones_visuales)
update public.inspecciones_visuales t set folio = o.n from orden o where o.id = t.id;
select setval('public.inspecciones_folio_seq', coalesce((select max(folio) from public.inspecciones_visuales), 0) + 1, false) as proxima_inspeccion;

-- Salidas
update public.salidas set folio = -folio;
with orden as (select id, row_number() over (order by created_at, id) as n from public.salidas)
update public.salidas t set folio = o.n from orden o where o.id = t.id;
select setval('public.salidas_folio_seq', coalesce((select max(folio) from public.salidas), 0) + 1, false) as proxima_salida;

-- Solicitudes al almacén
update public.solicitudes_almacen set folio = -folio;
with orden as (select id, row_number() over (order by created_at, id) as n from public.solicitudes_almacen)
update public.solicitudes_almacen t set folio = o.n from orden o where o.id = t.id;
select setval('public.solicitudes_almacen_folio_seq', coalesce((select max(folio) from public.solicitudes_almacen), 0) + 1, false) as proxima_solicitud;

commit;
