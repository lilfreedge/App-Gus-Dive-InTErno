-- =====================================================================
-- migration_81.sql -- V57. Solo cambia un texto. Se puede correr más de
-- una vez. No borra nada.
--
-- Buceos: en la inscripción, el aviso amarillo del equipo decía "Este buceo
-- no incluye alquiler de equipo. ¿Te falta algo? En Gus tenemos equipos para
-- alquilar." Pedido (2-nov): "quitar '¿Te falta algo? En Gus tenemos equipos
-- para alquilar.' déjalo solo en la parte de abajo" (abajo ya dice "¿Te hace
-- falta equipo? Avísanos y te lo apartamos").
-- Se quita esa frase del Catálogo y de los buceos ya creados. El resto del
-- aviso se queda igual (por ejemplo "No olvides tu linterna.").
-- =====================================================================

with cat as (
  update public.viajes_catalogo
     set datos = jsonb_set(datos, '{equipo,nota}',
                 to_jsonb(btrim(replace(datos->'equipo'->>'nota', '¿Te falta algo? En Gus tenemos equipos para alquilar.', ''))))
   where datos->'equipo'->>'nota' like '%¿Te falta algo? En Gus tenemos equipos para alquilar.%'
  returning id
),
via as (
  update public.viajes
     set datos = jsonb_set(datos, '{equipo,nota}',
                 to_jsonb(btrim(replace(datos->'equipo'->>'nota', '¿Te falta algo? En Gus tenemos equipos para alquilar.', ''))))
   where datos->'equipo'->>'nota' like '%¿Te falta algo? En Gus tenemos equipos para alquilar.%'
  returning id
)
select (select count(*) from cat) as buceos_del_catalogo_cambiados,
       (select count(*) from via) as buceos_creados_cambiados;

-- ---------------------------------------------------------------------
-- La Caleta ("133"): "Parque Nacional" -> "entrada al Parque Nacional", y
-- un "No incluye" (solo si todavía no tiene uno). Es la propuesta de texto;
-- se puede cambiar cuando quieras en Buceos > Catálogo > La Caleta (y en
-- cada buceo ya creado, en su pestaña Info).
-- ---------------------------------------------------------------------
with cat as (
  update public.viajes_catalogo
     set datos = case when coalesce(datos->>'noIncluye', '') = ''
                      then jsonb_set(replace(datos::text, 'guía y Parque Nacional', 'guía y entrada al Parque Nacional')::jsonb,
                                     '{noIncluye}', to_jsonb(E'Transporte al Parque Nacional\nPropina para los ayudantes del parque'::text))
                      else replace(datos::text, 'guía y Parque Nacional', 'guía y entrada al Parque Nacional')::jsonb end
   where nombre = 'La Caleta'
     and (datos::text like '%guía y Parque Nacional%' or coalesce(datos->>'noIncluye', '') = '')
  returning id
),
via as (
  update public.viajes
     set datos = case when coalesce(datos->>'noIncluye', '') = ''
                      then jsonb_set(replace(datos::text, 'guía y Parque Nacional', 'guía y entrada al Parque Nacional')::jsonb,
                                     '{noIncluye}', to_jsonb(E'Transporte al Parque Nacional\nPropina para los ayudantes del parque'::text))
                      else replace(datos::text, 'guía y Parque Nacional', 'guía y entrada al Parque Nacional')::jsonb end
   where nombre = 'La Caleta' and estado in ('abierto', 'cerrado_insc')
     and (datos::text like '%guía y Parque Nacional%' or coalesce(datos->>'noIncluye', '') = '')
  returning id
)
select (select count(*) from cat) as la_caleta_catalogo, (select count(*) from via) as la_caleta_buceos_abiertos;
