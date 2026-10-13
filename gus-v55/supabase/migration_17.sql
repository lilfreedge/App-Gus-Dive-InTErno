-- Migration 17: App Equipos Clientes -- equipos del cliente (con
-- historial propio por marca/modelo) y seguimiento extendido de cada
-- orden (envío a servicio externo, fechas de retorno/listo/entrega,
-- verificado por, factura). Pedido explícito del usuario, 23-sep-2026.
--
-- ============================================================
-- 1) Equipos del cliente -- cada cliente puede tener varios equipos
--    (tipo + marca + modelo). Una orden ya no solo pertenece a un
--    cliente, pertenece a UN equipo de ese cliente -- así la ficha de
--    cada equipo muestra su historial completo, sin importar cuántas
--    veces haya venido.
-- ============================================================
create table if not exists public.equipos_del_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_equipos(id),
  tipo_equipo text not null check (tipo_equipo in ('Tanques', 'Reguladores', 'BC', 'Computadora', 'Otro')),
  tipo_equipo_otro text,
  marca text,
  modelo text,
  user_id uuid references auth.users(id),
  nombre_usuario_snapshot text,
  created_at timestamptz not null default now()
);

alter table public.equipos_del_cliente enable row level security;

drop policy if exists "Los usuarios logueados ven equipos de clientes" on public.equipos_del_cliente;
create policy "Los usuarios logueados ven equipos de clientes"
  on public.equipos_del_cliente for select
  to authenticated
  using (true);

drop policy if exists "Permiso equipos_clientes agrega equipos de clientes" on public.equipos_del_cliente;
create policy "Permiso equipos_clientes agrega equipos de clientes"
  on public.equipos_del_cliente for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes edita equipos de clientes" on public.equipos_del_cliente;
create policy "Permiso equipos_clientes edita equipos de clientes"
  on public.equipos_del_cliente for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular borra equipos de clientes" on public.equipos_del_cliente;
create policy "Solo Titular borra equipos de clientes"
  on public.equipos_del_cliente for delete
  to authenticated
  using (public.is_titular());

-- ============================================================
-- 2) Órdenes -- se les agrega el equipo (con snapshot de marca/modelo) y
--    el seguimiento extendido, todo opcional/editable después de creada
--    la orden (cada orden es distinta, no todas usan todos los campos).
-- ============================================================
alter table public.ordenes_equipos add column if not exists equipo_id uuid references public.equipos_del_cliente(id);
alter table public.ordenes_equipos add column if not exists equipo_marca_snapshot text;
alter table public.ordenes_equipos add column if not exists equipo_modelo_snapshot text;
alter table public.ordenes_equipos add column if not exists envio_a text
  check (envio_a is null or envio_a in ('Prueba hidrostática', 'Reparación'));
alter table public.ordenes_equipos add column if not exists fecha_retorno_tienda date;
alter table public.ordenes_equipos add column if not exists fecha_listo_entrega date;
alter table public.ordenes_equipos add column if not exists verificado_por text
  check (verificado_por is null or verificado_por in ('Pipe', 'Gugi'));
alter table public.ordenes_equipos add column if not exists fecha_notificacion_cliente date;
alter table public.ordenes_equipos add column if not exists fecha_entrega_cliente date;
alter table public.ordenes_equipos add column if not exists nombre_recibe text;
alter table public.ordenes_equipos add column if not exists factura text;

-- La vista ordenes_equipos_con_nombre usa "select o.*", así que recoge
-- las columnas nuevas solita -- no hace falta recrearla.

-- ============================================================
-- 3) Historial de ediciones de órdenes -- solo visible para el Titular,
--    por ahora ("eso que solamente lo pueda ver yo como titular, por el
--    momento", pedido explícito del usuario, 23-sep-2026).
--
--    cambios_historial ya existe (migration_02) y se usa para varias
--    tablas de App Interno, con políticas is_admin() a secas. Para que
--    las ediciones de ordenes_equipos queden ocultas a administradores
--    comunes de App Interno (que no deberían ver esto) se agregan dos
--    ajustes, sin tocar el comportamiento existente de las demás tablas:
--
--    a) SELECT: is_admin() sigue viendo todo excepto tabla =
--       'ordenes_equipos', que solo ve is_titular().
--    b) INSERT: además de is_admin(), también puede insertar quien
--       tenga el permiso equipos_clientes -- así Gugi (si no es
--       administrador) puede registrar sus propias ediciones de
--       seguimiento y quedan anotadas igual.
-- ============================================================
drop policy if exists "Solo administradores ven el historial de cambios" on public.cambios_historial;
create policy "Solo administradores ven el historial de cambios"
  on public.cambios_historial for select
  to authenticated
  using (
    public.is_titular()
    or (public.is_admin() and tabla <> 'ordenes_equipos')
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
  );
