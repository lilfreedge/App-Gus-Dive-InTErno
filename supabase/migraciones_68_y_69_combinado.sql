-- =====================================================================
-- migraciones_68_y_69_combinado.sql -- migration_68.sql (Compresores
-- vacío) y migration_69.sql (acceso a Viajes/Buceos), una detrás de la
-- otra. Si ya corriste la 68, no pasa nada: las dos se pueden correr más
-- de una vez.
-- =====================================================================

-- =====================================================================
-- migration_68.sql -- Arreglo: Equipos › Compresores sale vacío. Se puede
-- correr sola y más de una vez sin problema. No hace falta instalar
-- código nuevo.
--
-- Problema (reportado 23-oct-2026, con foto; ya había pasado el 21-oct):
-- "acabo de registrar uno y no me aparece, entonces si voy a registrarlo
-- otra vez me dice que ese código existe". O sea, el compresor SÍ se
-- guarda, pero la pantalla no lo muestra.
--
-- Causa más probable: a la tabla de compresores le falta la columna
-- "proxima_inspeccion" (migration_15.sql, que parece que no se corrió).
-- La pantalla de Compresores pide esa columna; si no existe, la consulta
-- falla y la pantalla dice "Todavía no hay compresores registrados",
-- aunque sí los haya. Registrar uno nuevo no usa esa columna, por eso sí
-- se guarda. Por si acaso, también se vuelve a poner el permiso de ver
-- compresores.
--
-- Los compresores que se habían registrado antes NO se perdieron: con
-- esto vuelven a salir.
-- =====================================================================

alter table public.compresores add column if not exists proxima_inspeccion date;

drop policy if exists "Los usuarios logueados ven compresores" on public.compresores;
create policy "Los usuarios logueados ven compresores"
  on public.compresores for select
  to authenticated
  using (true);

-- Resumen: los compresores que hay guardados.
select
  count(*) as compresores_guardados,
  string_agg(codigo || case when activo then '' else ' (inactivo)' end, ', ' order by codigo) as codigos
from public.compresores;

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
