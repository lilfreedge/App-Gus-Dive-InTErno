-- Reiniciar los folios de Inspecciones visuales, Salidas y Solicitudes al
-- almacén (App Interno). PASO 1: solo mirar, no cambia nada. Enseña el
-- número de hoy y el nuevo de cada uno.
-- Pedido (nota "App Gus interno", 31-oct-2026): "Necesito reiniciar folio de
-- inspecciones visuales. Realmente esa es la #1", "reiniciar folio de
-- salidas", "reiniciar folio de solicitudes".
-- Si hay solicitudes de prueba que quieras quitar, bórralas primero con el
-- basurero (Más › Solicitudes al almacén) y después corre esto.
select 'Inspección visual' as que, folio as folio_hoy,
       row_number() over (order by created_at, id) as folio_nuevo,
       tanque_codigo_snapshot as detalle, created_at
  from public.inspecciones_visuales
union all
select 'Salida', folio, row_number() over (order by created_at, id), articulo, created_at
  from public.salidas
union all
select 'Solicitud', folio, row_number() over (order by created_at, id), coalesce(nombre_usuario_snapshot, ''), created_at
  from public.solicitudes_almacen
order by 1, 5;
