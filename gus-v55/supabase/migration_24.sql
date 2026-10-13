-- Migration 24: v30 -- historial de ediciones de Equipos del cliente
-- (App Clientes) + botón "Formatear registros" para App Clientes
-- (23-sep-2026).
--
-- Migración nueva, hacia adelante -- no toca nada de migration_23.sql ni
-- anteriores.

-- ============================================================
-- 1) Historial de ediciones de Equipos del cliente -- solo visible para
--    el Titular, mismo criterio que ya existe para ordenes_equipos
--    (migration_17.sql: "eso que solamente lo pueda ver yo como titular,
--    por el momento"). Pedido explícito del usuario, 23-sep-2026:
--    "creamo otra seccion en administracion donde pueda ver el historial
--    de cambios en equipos, para cuando le editen algo" -- en una
--    sección aparte de Administración (ver
--    app/app-clientes/administracion/historial-equipos/page.js), no
--    mezclada con las ediciones de órdenes.
--
--    Mismo ajuste que migration_17.sql hizo para 'ordenes_equipos',
--    ahora también para 'equipos_del_cliente':
--    a) SELECT: is_admin() sigue viendo todo excepto tabla en
--       ('ordenes_equipos', 'equipos_del_cliente'), que solo ve
--       is_titular().
--    b) INSERT: además de is_admin() (que ya cubre al Titular, ver
--       migration_03.sql), también puede insertar quien tenga el nuevo
--       permiso equipos_clientes_editar_equipo -- así un usuario con ese
--       permiso puede registrar sus propias ediciones de equipos y
--       quedan anotadas igual (mismo patrón que la rama de
--       'ordenes_equipos' con el permiso equipos_clientes).
-- ============================================================
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

-- Nota: no hace falta ningún paso para el permiso equipos_clientes_editar_equipo
-- en sí -- profiles.permisos es JSONB, la clave nueva solo se agrega en
-- código (lib/roles.js, PERMISOS_DEFAULT), sin columna ni migración propia.

-- ============================================================
-- 2) "Formatear registros" para App Clientes (pedido explícito,
--    23-sep-2026: "crea un boton de formatear, similar al de app
--    interno, pero que sea para este app"). Alcance confirmado en dos
--    rondas de preguntas:
--
--    a) Primero: "que te permita escoger lo que quieres borrar, si
--       completamente todo o solamente las ordenes. y dejar el
--       inventario de clientes y sus equipos vivos" -- clientes_equipos
--       y equipos_del_cliente nunca se tocarían.
--    b) Al preguntar qué era exactamente "completamente todo", el
--       usuario amplió el pedido: "Lo que me interesa que se formatee
--       es: todo del app, pero que uno pueda especificar que es lo que
--       va a borrar especificamente. Porque quizas me pueda interesar
--       quedarme con la base de datos de clientes." -- es decir, ya NO
--       es un choque fijo de 2 opciones: es un selector granular por
--       categoría, y Clientes/Equipos pasan a ser una categoría más
--       (opcional, no protegida a la fuerza) en vez de estar siempre
--       excluidos.
--
--    4 categorías, cada una independiente (el usuario marca las que
--    quiere borrar):
--    - Órdenes (ordenes_equipos) -- reinicia su folio.
--    - Piezas y repuestos (piezas_catalogo).
--    - Servicios (servicios_catalogo).
--    - Clientes y sus equipos (clientes_equipos + equipos_del_cliente).
--
--    Única regla de dependencia (llave foránea, no negociable): las
--    Órdenes referencian a Clientes y a Equipos, así que si se borran
--    Clientes también se borran las Órdenes de una vez, aunque esa
--    categoría no se haya marcado -- si no, la base de datos rechazaría
--    el borrado de un cliente que todavía tiene órdenes. Esto se explica
--    en la confirmación antes de ejecutar (ver
--    formatear-registros-client.js de App Clientes).
--
--    Mismo patrón de seguridad que App Interno: security definer +
--    is_titular() adentro (no solo en el código de la app).
-- ============================================================
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

  -- Clientes/Equipos arrastran sus Órdenes por dependencia de llave
  -- foránea -- se borran igual aunque "Órdenes" no se haya marcado.
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

-- ============================================================
-- 3) "Formatear registros" de App Interno, ahora también granular
--    (pedido explícito, mismo hilo: "Hazlo similar para el app
--    interno"). Antes (migration_05.sql) era un solo botón que siempre
--    borraba TODO (salidas + llenados de tanque) sin poder elegir.
--    Mismas 2 categorías que ya cubría, ahora cada una opcional:
--    - Salidas (piezas/ring) -- reinicia su folio.
--    - Llenados de tanque -- reinicia su folio.
--    No se agregan categorías nuevas (compresores, inspecciones, etc.)
--    -- "Formatear registros" de App Interno nunca las tocó, y el
--    usuario no pidió ampliar el alcance, solo poder elegir entre lo
--    que ya borraba.
--
--    Se reemplaza la función vieja (mismo nombre, firma nueva) --
--    drop + create porque cambia la lista de parámetros.
-- ============================================================
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
