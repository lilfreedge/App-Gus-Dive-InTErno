-- Reiniciar el folio de "Mantenimiento de reguladores" (App Interno).
-- PASO 1: solo mirar, no cambia nada. Enseña el número de hoy y el nuevo.
-- Pedido (nota "App Gus interno", 28-oct-2026): "Necesito reiniciar folio de
-- mantenimiento de reguladores. Dame código supabase".
select folio as folio_hoy,
       row_number() over (order by created_at, id) as folio_nuevo,
       regulador_codigo_snapshot as regulador,
       created_at
  from public.mantenimientos_reguladores
 order by created_at, id;
