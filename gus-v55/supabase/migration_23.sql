-- Migration 23: corrige migration_22.sql, que falló al correrla en
-- producción (23-sep-2026).
--
-- Qué pasó: el paso 1b usaba "create or replace view" para agregarle
-- columnas nuevas a la vista ordenes_equipos_con_nombre. Postgres NO
-- permite eso si las columnas de la tabla de abajo (ordenes_equipos)
-- crecieron desde que la vista se creó por primera vez (migration_16.sql):
-- la tabla ya tiene muchas más columnas ahora (migration_17, 19, 20...),
-- así que "select o.*" ya no expande igual que antes y el "create or
-- replace" mueve de lugar a full_name / cliente_telefono. Postgres lo
-- rechaza con el error:
--   ERROR: 42P16: cannot change name of view column "full_name" to
--   "equipo_id"
--
-- Como el script se corrió completo en un solo query (Supabase SQL
-- Editor), Postgres deshizo TODO el batch cuando ese paso falló -- nada
-- de migration_22.sql quedó aplicado (ni la columna serie, ni en_espera/
-- motivo_espera/repuestos_usados, ni orden_menu_clientes, ni
-- piezas_catalogo, ni los permisos granulares).
--
-- Esta migración es el reemplazo completo de migration_22.sql: mismo
-- contenido, con el paso 1b arreglado (drop + create en vez de create or
-- replace, que sí permite cambiar las columnas). Correr ESTA en vez de
-- migration_22.sql -- no hace falta correr migration_22.sql para nada,
-- se puede saltar directo a esta.
--
-- ============================================================
-- 1) Dos bugs reportados en vivo.
-- ============================================================

-- 1a) "No se pudo crear el equipo" con Tanque y Computadora (que sí
--     piden No. Serie) pero no con BC (que no lo pide). Sospecha: la
--     columna "serie" (migration_18.sql) nunca se llegó a correr en esta
--     base de datos. Línea idéntica a esa migración, segura de correr de
--     nuevo aunque ya se haya aplicado.
alter table public.equipos_del_cliente add column if not exists serie text;

-- 1b) "La sección de Seguimiento no se actualiza en pantalla" -- la vista
--     ordenes_equipos_con_nombre (migration_16.sql, "select o.*") fija la
--     lista de columnas al momento en que se crea/reemplaza, no se
--     actualiza sola cuando la tabla de abajo cambia (a diferencia de lo
--     que decía el comentario de migration_17.sql). Por eso envío a,
--     fechas, verificado por, No. de orden, etc. se guardaban bien pero
--     no se veían en la ficha de la orden. Se recrea para que tome las
--     columnas actuales -- con drop + create (no "or replace"), porque
--     Postgres no deja cambiar la posición/nombre de columnas de una
--     vista existente con "or replace" (ver comentario arriba).
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;

-- ============================================================
-- 2) Órdenes "en espera" (pedido explícito: dar seguimiento a órdenes
--    que quedan en hold, p. ej. esperando que lleguen piezas) y
--    repuestos utilizados por orden (pedido explícito: para que el
--    cajero sepa qué cobrar en la factura al momento de entregar). Texto
--    libre por ahora, se le puede dar más forma después.
-- ============================================================
alter table public.ordenes_equipos add column if not exists en_espera boolean not null default false;
alter table public.ordenes_equipos add column if not exists motivo_espera text;
alter table public.ordenes_equipos add column if not exists repuestos_usados text;

-- ============================================================
-- 3) Orden del menú de App Clientes, reordenable con drag & drop
--    (pedido explícito) -- columna aparte de orden_menu (que ya usa App
--    Interno para su propio menú, con secciones distintas) para no
--    pisar el orden guardado allá.
-- ============================================================
alter table public.profiles add column if not exists orden_menu_clientes jsonb;

-- ============================================================
-- 4) Catálogo de piezas/repuestos (pedido explícito, dentro de "Base de
--    datos") -- mismo patrón que servicios_catalogo (migration_21.sql):
--    simple por ahora (nombre + activo), se le da más forma después. Sin
--    borrado -- una pieza que ya no se usa se desactiva, no se elimina.
-- ============================================================
create table if not exists public.piezas_catalogo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activo boolean not null default true,
  user_id uuid references auth.users(id),
  nombre_usuario_snapshot text,
  created_at timestamptz not null default now()
);

alter table public.piezas_catalogo enable row level security;

drop policy if exists "Los usuarios logueados ven piezas del catálogo" on public.piezas_catalogo;
create policy "Los usuarios logueados ven piezas del catálogo"
  on public.piezas_catalogo for select
  to authenticated
  using (true);

drop policy if exists "Permiso equipos_clientes_catalogo agrega piezas" on public.piezas_catalogo;
create policy "Permiso equipos_clientes_catalogo agrega piezas"
  on public.piezas_catalogo for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes_catalogo')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes_catalogo edita piezas" on public.piezas_catalogo;
create policy "Permiso equipos_clientes_catalogo edita piezas"
  on public.piezas_catalogo for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes_catalogo')::boolean from public.profiles where id = auth.uid()), false)
  );

-- ============================================================
-- 5) Permisos granulares de App Clientes (pedido explícito: "ponme
--    permisos para dar a los demas de: registrar orden... agregar
--    equipo, agregar cliente, acceso a Catalogo"). Antes todo dependía
--    de un solo permiso (equipos_clientes) que además sigue gateando
--    poder ENTRAR a la app -- estos 4 son más finos, para acciones
--    puntuales dentro de ella. Nadie más que el Titular tiene hoy
--    equipos_clientes activado, así que este cambio no le quita acceso a
--    nadie que ya lo estuviera usando.
-- ============================================================
drop policy if exists "Permiso equipos_clientes inserta ordenes" on public.ordenes_equipos;
create policy "Permiso equipos_clientes_registrar inserta ordenes"
  on public.ordenes_equipos for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes_registrar')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes agrega equipos de clientes" on public.equipos_del_cliente;
create policy "Permiso equipos_clientes_agregar_equipo agrega equipos"
  on public.equipos_del_cliente for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes_agregar_equipo')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes agrega clientes" on public.clientes_equipos;
create policy "Permiso equipos_clientes_agregar_cliente agrega clientes"
  on public.clientes_equipos for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes_agregar_cliente')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes agrega servicios" on public.servicios_catalogo;
create policy "Permiso equipos_clientes_catalogo agrega servicios"
  on public.servicios_catalogo for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes_catalogo')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes edita servicios" on public.servicios_catalogo;
create policy "Permiso equipos_clientes_catalogo edita servicios"
  on public.servicios_catalogo for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes_catalogo')::boolean from public.profiles where id = auth.uid()), false)
  );
