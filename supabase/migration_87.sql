-- =====================================================================
-- migration_87.sql -- V61. Alquiler. Se puede correr más de una vez. No
-- borra nada.
--
-- 1. Número de factura de la mora (nota del 2-nov: "cuando los artículos
--    cogen mora, debería haber una opción para poner número de factura").
-- 2. "Estudiante OWD": alquiler a un estudiante, con el equipo incluido en
--    su curso (nota del 2-nov).
-- 3. Etiqueta "Alquilado" en App Interno: quien ve los tanques y los
--    reguladores puede saber cuáles están afuera, aunque no tenga Alquiler
--    (solo los códigos, nada del cliente).
-- 4. Borrar clientes desde Alquiler (Titular). La base no deja borrar a
--    alguien que tenga alquileres, buceos o cursos.
-- 5. Borrar alquileres: el Titular o un administrador.
-- =====================================================================
alter table public.alq_alquileres add column if not exists factura_mora text;
alter table public.alq_alquileres add column if not exists estudiante text;

create or replace function public.equipos_alquilados()
returns table (codigo text, numero bigint, devolver date)
language sql
stable
security definer
set search_path = public
as $$
  select upper(i.codigo), a.numero, a.devolver
    from public.alq_items i
    join public.alq_alquileres a on a.id = i.alquiler_id
   where i.devuelto_en is null;
$$;
grant execute on function public.equipos_alquilados() to authenticated;

drop policy if exists "viajes_buzos borrar (alquiler)" on public.viajes_buzos;
create policy "viajes_buzos borrar (alquiler)" on public.viajes_buzos for delete to authenticated using (public.is_titular());

drop policy if exists "alq_alquileres borrar" on public.alq_alquileres;
create policy "alq_alquileres borrar" on public.alq_alquileres for delete to authenticated using (public.is_titular() or public.is_admin());
