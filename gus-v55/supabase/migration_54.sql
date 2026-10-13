-- migration_54.sql  (V30, notas del 8-oct-2026)
--
-- 1) Permiso nuevo "Salidas" (registrar_salida). Hasta ahora no existía:
--    cualquiera con App Interno veía y registraba salidas. Pedido
--    explícito: "si alguien no tiene permiso de registrar salida ni
--    tanque, que no aparezcan esos botones en inicio". Para no quitarle
--    nada a nadie de golpe ("2. ok"), se le activa a todos los que ya
--    tienen App Interno -- el Titular se lo quita a quien no deba. La base
--    de datos ahora también lo exige para guardar una salida (antes
--    bastaba con estar logueado).
--
-- 2) Pruebas hidrostáticas solo con mes y año (pedido explícito: "en la
--    fecha que solo pida mes y año, el día no es necesario"). El app
--    guarda el día 1 de ese mes; la próxima prueba vence el ÚLTIMO día de
--    ese mes, 5 años después (prueba 07/2021 -> vence 31/07/2026). Se
--    recalcula la de todos los tanques que ya tienen pruebas. Las fechas
--    de prueba ya guardadas no se tocan.
--
-- 3) App Equipos de clientes:
--    a) "Registrar servicio en base de datos" (equipos_clientes_registrar_
--       servicio, pedido explícito: "Ahora mismo cualquiera puede
--       registrar servicios") y "Editar servicio" (equipos_clientes_
--       editar_servicio, "queda solo para administradores y yo"). Antes
--       los dos los daba el permiso de ver Base de datos. Nadie los tiene
--       al empezar: el Titular se los da a quien corresponda.
--    b) "Clientes por contactar" con permiso propio
--       (equipos_clientes_contactar, "Ponme para dar acceso de esto").
--       Antes usaba el de Reportes: se le activa a quien ya lo tenía, para
--       que nadie pierda la pantalla de golpe.
--
-- Independiente de las anteriores (la 2 necesita migration_53.sql, ya
-- entregada). Se puede correr más de una vez.

-- 1) Salidas ---------------------------------------------------------
update public.profiles
  set permisos = coalesce(permisos, '{}'::jsonb) || jsonb_build_object('registrar_salida', true)
  where coalesce((permisos->>'acceso_app_interno')::boolean, false)
    and not (coalesce(permisos, '{}'::jsonb) ? 'registrar_salida');

drop policy if exists "Los usuarios logueados pueden registrar salidas" on public.salidas;
drop policy if exists "Permiso registrar_salida registra salidas" on public.salidas;
create policy "Permiso registrar_salida registra salidas"
  on public.salidas for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or (
      auth.uid() = user_id
      and coalesce((select (permisos->>'registrar_salida')::boolean from public.profiles where id = auth.uid()), false)
    )
  );

-- 2) Hidrostáticas: vence el último día del mes, 5 años después --------
create or replace function public.recalcular_proxima_hidrostatica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  v_ids := array_remove(array[
    case when tg_op <> 'INSERT' then old.tanque_id end,
    case when tg_op <> 'DELETE' then new.tanque_id end
  ], null);
  update public.tanques_alquiler t
    set proxima_hidrostatica = (
      select (date_trunc('month', max(h.fecha_prueba)) + interval '5 years 1 month' - interval '1 day')::date
      from public.pruebas_hidrostaticas h
      where h.tanque_id = t.id
    )
    where t.id = any(v_ids);
  return null;
end;
$$;

update public.tanques_alquiler t
  set proxima_hidrostatica = (
    select (date_trunc('month', max(h.fecha_prueba)) + interval '5 years 1 month' - interval '1 day')::date
    from public.pruebas_hidrostaticas h
    where h.tanque_id = t.id
  )
  where exists (select 1 from public.pruebas_hidrostaticas h where h.tanque_id = t.id);

-- 3a) Servicios del catálogo de App Clientes ---------------------------
drop policy if exists "Permiso equipos_clientes agrega servicios" on public.servicios_catalogo;
drop policy if exists "Permiso equipos_clientes_catalogo agrega servicios" on public.servicios_catalogo;
drop policy if exists "Permiso registrar_servicio agrega servicios" on public.servicios_catalogo;
create policy "Permiso registrar_servicio agrega servicios"
  on public.servicios_catalogo for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes_registrar_servicio')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes edita servicios" on public.servicios_catalogo;
drop policy if exists "Permiso equipos_clientes_catalogo edita servicios" on public.servicios_catalogo;
drop policy if exists "Titular o Admin con permiso editan servicios" on public.servicios_catalogo;
create policy "Titular o Admin con permiso editan servicios"
  on public.servicios_catalogo for update
  to authenticated
  using (
    public.is_titular()
    or (
      public.is_admin()
      and coalesce((select (permisos->>'equipos_clientes_editar_servicio')::boolean from public.profiles where id = auth.uid()), false)
    )
  );

-- 3b) Clientes por contactar ------------------------------------------
update public.profiles
  set permisos = permisos || jsonb_build_object('equipos_clientes_contactar', true)
  where coalesce((permisos->>'equipos_clientes_reportes')::boolean, false)
    and not (permisos ? 'equipos_clientes_contactar');
