-- =====================================================================
-- migration_73.sql -- Viajes/Buceos: textos del aviso del equipo (V45).
-- Se puede correr más de una vez sin problema. No borra nada.
--
-- Cambia SOLO el aviso del equipo ("nota") del catálogo y de los viajes
-- ya creados, y solo si el texto sigue exactamente como lo cargó
-- migration_71.sql. Si alguien ya lo había cambiado a mano, no se toca.
--
-- Pedido explícito (27-oct-2026): quitar los dos puntos, decir "buceo" en
-- vez de "viaje", "Si te hace falta equipo en Gus contamos con equipos para
-- alquilar", y los textos nuevos de Tiburones y de "Buzo + equipo".
-- =====================================================================

-- (1) La Caleta y Salinas
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('Este buceo no incluye alquiler de equipo. ¿Te falta algo? En Gus tenemos equipos para alquilar.'::text))
 where datos->'equipo'->>'nota' = 'Este viaje no incluye alquiler de equipo: trae tu equipo completo.';
update public.viajes
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('Este buceo no incluye alquiler de equipo. ¿Te falta algo? En Gus tenemos equipos para alquilar.'::text))
 where datos->'equipo'->>'nota' = 'Este viaje no incluye alquiler de equipo: trae tu equipo completo.';

-- (2) La Caleta Nocturno
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('Este buceo no incluye alquiler de equipo. No olvides tu linterna. ¿Te falta algo? En Gus tenemos equipos para alquilar.'::text))
 where datos->'equipo'->>'nota' = 'Este viaje no incluye alquiler de equipo: trae tu equipo completo (y tu linterna).';
update public.viajes
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('Este buceo no incluye alquiler de equipo. No olvides tu linterna. ¿Te falta algo? En Gus tenemos equipos para alquilar.'::text))
 where datos->'equipo'->>'nota' = 'Este viaje no incluye alquiler de equipo: trae tu equipo completo (y tu linterna).';

-- (3) Tiburones
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('No incluye equipo. Puedes alquilarlo en la tienda o pagar US$35 adicional para alquilarlo directo en el punto de buceo. Los tanques y pesas se entregan allá.'::text))
 where datos->'equipo'->>'nota' = 'No incluye equipo: se alquila en la tienda o allá directo (US$35). Los tanques y pesas se entregan en el punto de buceo.';
update public.viajes
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('No incluye equipo. Puedes alquilarlo en la tienda o pagar US$35 adicional para alquilarlo directo en el punto de buceo. Los tanques y pesas se entregan allá.'::text))
 where datos->'equipo'->>'nota' = 'No incluye equipo: se alquila en la tienda o allá directo (US$35). Los tanques y pesas se entregan en el punto de buceo.';

-- (4) Bayahibe, Bayahibe Avanzado e Isla Catalina
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('No incluye equipo. Si te falta equipo, elige “Buzo + equipo” (US$10 adicional).'::text))
 where datos->'equipo'->>'nota' = 'No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más).';
update public.viajes
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('No incluye equipo. Si te falta equipo, elige “Buzo + equipo” (US$10 adicional).'::text))
 where datos->'equipo'->>'nota' = 'No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más).';

-- Para revisar (sale abajo después de correrlo): cuántos quedaron con el
-- texto nuevo y cuántos todavía tienen el viejo (debería ser 0).
select
  (select count(*) from public.viajes_catalogo where datos->'equipo'->>'nota' in ('Este buceo no incluye alquiler de equipo. ¿Te falta algo? En Gus tenemos equipos para alquilar.', 'Este buceo no incluye alquiler de equipo. No olvides tu linterna. ¿Te falta algo? En Gus tenemos equipos para alquilar.', 'No incluye equipo. Puedes alquilarlo en la tienda o pagar US$35 adicional para alquilarlo directo en el punto de buceo. Los tanques y pesas se entregan allá.', 'No incluye equipo. Si te falta equipo, elige “Buzo + equipo” (US$10 adicional).')) as catalogo_nuevo,
  (select count(*) from public.viajes          where datos->'equipo'->>'nota' in ('Este buceo no incluye alquiler de equipo. ¿Te falta algo? En Gus tenemos equipos para alquilar.', 'Este buceo no incluye alquiler de equipo. No olvides tu linterna. ¿Te falta algo? En Gus tenemos equipos para alquilar.', 'No incluye equipo. Puedes alquilarlo en la tienda o pagar US$35 adicional para alquilarlo directo en el punto de buceo. Los tanques y pesas se entregan allá.', 'No incluye equipo. Si te falta equipo, elige “Buzo + equipo” (US$10 adicional).')) as viajes_nuevo,
  (select count(*) from public.viajes_catalogo where datos->'equipo'->>'nota' in ('Este viaje no incluye alquiler de equipo: trae tu equipo completo.', 'Este viaje no incluye alquiler de equipo: trae tu equipo completo (y tu linterna).', 'No incluye equipo: se alquila en la tienda o allá directo (US$35). Los tanques y pesas se entregan en el punto de buceo.', 'No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más).'))
  + (select count(*) from public.viajes        where datos->'equipo'->>'nota' in ('Este viaje no incluye alquiler de equipo: trae tu equipo completo.', 'Este viaje no incluye alquiler de equipo: trae tu equipo completo (y tu linterna).', 'No incluye equipo: se alquila en la tienda o allá directo (US$35). Los tanques y pesas se entregan en el punto de buceo.', 'No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más).')) as todavia_viejo;
