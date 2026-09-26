-- ============================================================
-- Combinado: migration_24.sql + migration_25.sql + migration_26.sql
-- (v30, v31 y v32 -- 23/25-sep-2026)
--
-- Se generó este combinado porque "Formatear registros" de App Equipos
-- de clientes falló con:
--   "Could not find the function public.formatear_registros_clientes(...)"
-- lo que indica que migration_24.sql nunca se corrió en este proyecto de
-- Supabase. Cada bloque de abajo es seguro de correr de nuevo aunque ya
-- se haya aplicado antes (add column if not exists, drop+create,
-- create or replace) -- no borra ni duplica nada.
--
-- No hace falta correr migration_24.sql, migration_25.sql ni
-- migration_26.sql por separado si corres este archivo completo.
-- ============================================================


-- ============================================================
-- migration_24.sql -- v30: historial de ediciones de Equipos del
-- cliente (App Clientes) + botón "Formatear registros" para App
-- Clientes (23-sep-2026).
-- ============================================================

-- 1) Historial de ediciones de Equipos del cliente -- solo visible para
--    el Titular, mismo criterio que ya existe para ordenes_equipos
--    (migration_17.sql). Pedido explícito: "creamo otra seccion en
--    administracion donde pueda ver el historial de cambios en equipos,
--    para cuando le editen algo".
drop policy if exists "Solo administradores ven el historial de cambios" on public.cambios_historial;
create policy "Solo administradores ven el historial de cambios"
  on public.cambios_historial for select
  to authenticated
  using (
    public.is_titular()
    or (public.is_admin() and tabla not in ('ordenes_equipos', 'equipos_del_cliente'))
  );

drop policy if exists "Solo administradores registran cambios" on public.cambios_historial;
create policy "Solo administradores registran cambios"
  on public.cambios_historial for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      tabla = 'ordenes_equipos'
      and coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
    )
    or (
      tabla = 'equipos_del_cliente'
      and coalesce((select (permisos->>'equipos_clientes_editar_equipo')::boolean from public.profiles where id = auth.uid()), false)
    )
  );

-- 2) "Formatear registros" para App Clientes -- selector granular por
--    categoría (Órdenes, Piezas y repuestos, Servicios, Clientes y sus
--    equipos). Borrar Clientes arrastra sus Órdenes por llave foránea.
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
    delete from public.ordenes_equipos;
    alter sequence public.ordenes_equipos_folio_seq restart with 1;
  end if;

  if p_borrar_clientes then
    delete from public.equipos_del_cliente;
    delete from public.clientes_equipos;
  end if;

  if p_borrar_piezas then
    delete from public.piezas_catalogo;
  end if;

  if p_borrar_servicios then
    delete from public.servicios_catalogo;
  end if;
end;
$$;

-- 3) "Formatear registros" de App Interno, ahora también granular
--    (Salidas y Llenados de tanque, cada uno opcional).
drop function if exists public.formatear_registros();

create function public.formatear_registros(
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
    delete from public.salidas;
    alter sequence public.salidas_folio_seq restart with 1;
  end if;

  if p_borrar_llenados then
    delete from public.llenados_tanques;
    alter sequence public.llenados_folio_seq restart with 1;
  end if;
end;
$$;


-- ============================================================
-- migration_25.sql -- v31: Inspección visual realizada (23-sep-2026).
-- ============================================================
alter table public.ordenes_equipos add column if not exists inspeccion_visual_realizada boolean not null default false;


-- ============================================================
-- migration_26.sql -- v32: rediseño de "Envío a"/"En espera" + Prueba
-- hidrostática independiente + Autorización del cliente + Notificaciones
-- al cliente como lista + accesos directos opcionales (23-sep-2026).
-- ============================================================

-- 1) Prueba hidrostática, independiente de "envio_a"/"Status".
alter table public.ordenes_equipos add column if not exists fecha_envio_hidrostatica date;

update public.ordenes_equipos
  set fecha_envio_hidrostatica = coalesce(fecha_envio_hidrostatica, fecha_envio)
  where envio_a = 'Prueba hidrostática';

update public.ordenes_equipos
  set envio_a = null
  where envio_a = 'Prueba hidrostática';

-- 2) Autorización del cliente, al registrar la orden.
alter table public.ordenes_equipos add column if not exists autorizacion_cliente text;
alter table public.ordenes_equipos add column if not exists autorizacion_notas text;

-- 2b) Notificaciones al cliente, como lista (fecha + medio).
alter table public.ordenes_equipos add column if not exists notificaciones_cliente jsonb not null default '[]'::jsonb;

update public.ordenes_equipos
  set notificaciones_cliente = jsonb_build_array(jsonb_build_object('fecha', fecha_notificacion_cliente, 'medio', 'Otro'))
  where fecha_notificacion_cliente is not null and notificaciones_cliente = '[]'::jsonb;

-- 2c) Accesos directos opcionales del menú de App Equipos de clientes.
alter table public.profiles add column if not exists menu_personalizado_clientes jsonb;

-- 3) Recrea la vista ordenes_equipos_con_nombre -- SIEMPRE al final de
--    todo el combinado, para que tome todas las columnas nuevas de
--    arriba (24, 25 y 26) de una sola vez. Mismo gotcha de Postgres ya
--    documentado (una vista con "select o.*" no expone columnas nuevas
--    de la tabla de abajo sin recrearse).
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;
