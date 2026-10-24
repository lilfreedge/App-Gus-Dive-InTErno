-- =====================================================================
-- migration_67.sql -- Arreglo: facturar llenados de tanque. Se puede correr
-- sola, antes o después de la 66, y más de una vez sin problema. No hace
-- falta instalar código nuevo: el arreglo funciona con la versión que ya
-- está instalada.
--
-- Problema (reportado 23-oct-2026, con foto de Equipos › Llenados de
-- tanque): "solamente me funciona a mí el botón de facturar los llenados.
-- Intenté con otros usuarios y no funciona, o sea, deja escribir pero no se
-- guarda."
--
-- Causa: desde migration_02.sql, la base de datos solo deja cambiar un
-- llenado a los Administradores ("Solo administradores editan llenados").
-- El permiso "Facturación de llenado" mostraba el botón, pero nunca se le
-- dio permiso en la base de datos para guardar (migration_06.sql lo dejó
-- anotado y no lo hizo). Al guardar, la base de datos no cambiaba nada y
-- tampoco avisaba, así que parecía que guardaba.
--
-- Arreglo: quien tiene "Facturación de llenado" puede marcar un llenado
-- como facturado (o quitarlo) y poner su No. de factura. Solo eso: si
-- intenta cambiar cualquier otra cosa del llenado (cantidad, gas, nota...),
-- la base de datos no lo deja. Editar y anular siguen siendo del Titular y
-- los Administradores.
-- =====================================================================

drop policy if exists "Permiso facturacion factura llenados" on public.llenados_tanques;
create policy "Permiso facturacion factura llenados"
  on public.llenados_tanques for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'facturacion')::boolean from public.profiles where id = auth.uid()), false)
  );

-- Quien no es Titular ni Administrador solo puede cambiar la facturación.
create or replace function public.llenado_solo_facturacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_titular() or public.is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - 'facturado' - 'factura_no') is distinct from (to_jsonb(old) - 'facturado' - 'factura_no') then
    raise exception 'Solo puedes cambiar la facturación de este llenado (facturado y No. de factura).';
  end if;
  return new;
end;
$$;

drop trigger if exists llenado_solo_facturacion on public.llenados_tanques;
create trigger llenado_solo_facturacion
  before update on public.llenados_tanques
  for each row execute function public.llenado_solo_facturacion();

-- Resumen (el SQL Editor de Supabase no muestra los avisos).
select
  (select count(*) from public.profiles where coalesce((permisos->>'facturacion')::boolean, false)) as personas_con_facturacion,
  (select count(*) from public.llenados_tanques where not facturado) as llenados_por_facturar;
