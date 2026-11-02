-- =====================================================================
-- migration_84.sql -- V58. Solo cambia un texto. Se puede correr más de
-- una vez. No borra nada.
--
-- Buceos, La Caleta: en "No incluye" quitar "(cuidan los carros y ayudan
-- con los tanques)" (nota del 2-nov: "Quitar 'cuidan los carros'"). Queda
-- "Propina para los ayudantes del parque". En el Catálogo y en los buceos
-- ya creados.
-- =====================================================================
with cat as (
  update public.viajes_catalogo
     set datos = jsonb_set(datos, '{noIncluye}', to_jsonb(replace(datos->>'noIncluye', ' (cuidan los carros y ayudan con los tanques)', '')))
   where datos->>'noIncluye' like '%(cuidan los carros y ayudan con los tanques)%'
  returning id
),
via as (
  update public.viajes
     set datos = jsonb_set(datos, '{noIncluye}', to_jsonb(replace(datos->>'noIncluye', ' (cuidan los carros y ayudan con los tanques)', '')))
   where datos->>'noIncluye' like '%(cuidan los carros y ayudan con los tanques)%'
  returning id
)
select (select count(*) from cat) as catalogo_cambiado, (select count(*) from via) as buceos_cambiados;
