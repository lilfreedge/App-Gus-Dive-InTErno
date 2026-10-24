-- =====================================================================
-- migration_69.sql -- Acceso a la app de Viajes/Buceos en "Accesos a apps"
-- (pedido explícito, 23-oct-2026: "NECESITO AGREGAR AQUÍ EL ACCESO AL APP
-- DE VIAJES"; maqueta-acceso-viajes.html, "ok cámbialo"). Se puede correr
-- más de una vez sin problema.
--
-- Hasta ahora la tarjeta de Viajes/Buceos le salía a todo el mundo. Desde
-- esta versión solo le sale a quien tenga el acceso (el Titular siempre).
-- Para no quitársela a nadie de golpe, se le enciende a todas las cuentas
-- que ya existen (igual que se hizo con el acceso a App Interno en
-- migration_28.sql); las cuentas nuevas nacen sin él. Se quita o se da en
-- "Accesos a apps".
-- =====================================================================

update public.profiles
   set permisos = coalesce(permisos, '{}'::jsonb) || jsonb_build_object('acceso_viajes', true)
 where not (coalesce(permisos, '{}'::jsonb) ? 'acceso_viajes');

-- Resumen.
select
  (select count(*) from public.profiles where not es_titular and eliminado_en is null) as cuentas,
  (select count(*) from public.profiles where not es_titular and eliminado_en is null
     and coalesce((permisos->>'acceso_viajes')::boolean, false)) as con_acceso_a_viajes;
