-- migration_55.sql
-- Amplía formatear_registros (App Interno) para incluir inspección visual,
-- pruebas hidrostáticas, mantenimiento de reguladores y compresores
-- (13-oct-2026, pedido explícito).

create or replace function public.formatear_registros(
  p_borrar_salidas       boolean default false,
  p_borrar_llenados      boolean default false,
  p_borrar_inspecciones  boolean default false,
  p_borrar_hidrostaticas boolean default false,
  p_borrar_mantenimientos boolean default false,
  p_borrar_compresores   boolean default false
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

  if p_borrar_inspecciones then
    delete from public.inspecciones_visuales where true;
  end if;

  if p_borrar_hidrostaticas then
    delete from public.pruebas_hidrostaticas where true;
  end if;

  if p_borrar_mantenimientos then
    delete from public.mantenimientos_reguladores where true;
  end if;

  if p_borrar_compresores then
    delete from public.mantenimientos_compresores where true;
  end if;
end;
$$;
