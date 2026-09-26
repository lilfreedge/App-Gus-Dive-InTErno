-- Migration 27 (25-sep-2026): corrige "Formatear registros" de App
-- Clientes, reportado en vivo con el error:
--   "No se pudo formatear: DELETE requires a WHERE clause"
--
-- Causa: Supabase exige que todo DELETE/UPDATE tenga una cláusula WHERE
-- para el rol con el que se conecta la app (protección estándar contra
-- borrados accidentales de toda una tabla) -- incluso dentro de una
-- función "security definer" como esta. Los DELETE sin condición de
-- migration_24.sql ("borra toda la tabla") chocan con esa regla.
--
-- Arreglo: agregar "where true" a cada DELETE sin condición -- sigue
-- borrando la tabla completa igual que antes, solo cumple con la
-- sintaxis que exige Supabase. Se corrige tanto la función de App
-- Clientes (la reportada) como la de App Interno (mismo patrón, para
-- que no le pase lo mismo el día que se use).

create or replace function public.formatear_registros_clientes(
  p_borrar_ordenes boolean default false,
  p_borrar_piezas boolean default false,
  p_borrar_servicios boolean default false,
  p_borrar_clientes boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_titular() then
    raise exception 'Solo el Titular puede formatear los registros.';
  end if;

  if p_borrar_ordenes or p_borrar_clientes then
    delete from public.ordenes_equipos where true;
    alter sequence public.ordenes_equipos_folio_seq restart with 1;
  end if;

  if p_borrar_clientes then
    delete from public.equipos_del_cliente where true;
    delete from public.clientes_equipos where true;
  end if;

  if p_borrar_piezas then
    delete from public.piezas_catalogo where true;
  end if;

  if p_borrar_servicios then
    delete from public.servicios_catalogo where true;
  end if;
end;
$$;

create or replace function public.formatear_registros(
  p_borrar_salidas boolean default false,
  p_borrar_llenados boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_titular() then
    raise exception 'Solo el Titular puede formatear los registros.';
  end if;

  if p_borrar_salidas then
    delete from public.salidas where true;
    alter sequence public.salidas_folio_seq restart with 1;
  end if;

  if p_borrar_llenados then
    delete from public.llenados_tanques where true;
    alter sequence public.llenados_folio_seq restart with 1;
  end if;
end;
$$;
