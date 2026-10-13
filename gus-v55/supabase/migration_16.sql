-- Migration 16: App Equipos Clientes -- clientes, órdenes y fotos (Storage).
--
-- Primera versión real de "App Equipos Clientes" (hasta ahora un
-- placeholder "próximamente" en /app-clientes). Mismo patrón que
-- Compresores (migración 14): catálogo simple + tabla principal con
-- folio, snapshot de nombre y RLS por permiso granular nuevo
-- `equipos_clientes` (gatea todo -- catálogo de clientes y registro de
-- órdenes -- igual que `compresores` gatea todo lo de compresores).
--
-- Reutiliza el bucket de Storage pattern (público, cualquier autenticado
-- sube) con un bucket nuevo "equipos-clientes" para la foto opcional de
-- cada orden.

-- ============================================================
-- 1) Catálogo de clientes.
-- ============================================================
create table if not exists public.clientes_equipos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  user_id uuid references auth.users(id),
  nombre_usuario_snapshot text,
  created_at timestamptz not null default now()
);

alter table public.clientes_equipos enable row level security;

drop policy if exists "Los usuarios logueados ven clientes de equipos" on public.clientes_equipos;
create policy "Los usuarios logueados ven clientes de equipos"
  on public.clientes_equipos for select
  to authenticated
  using (true);

drop policy if exists "Permiso equipos_clientes agrega clientes" on public.clientes_equipos;
create policy "Permiso equipos_clientes agrega clientes"
  on public.clientes_equipos for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes edita clientes" on public.clientes_equipos;
create policy "Permiso equipos_clientes edita clientes"
  on public.clientes_equipos for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular borra clientes de equipos" on public.clientes_equipos;
create policy "Solo Titular borra clientes de equipos"
  on public.clientes_equipos for delete
  to authenticated
  using (public.is_titular());

-- ============================================================
-- 2) Órdenes (equipo de cliente que entra a trabajar).
-- ============================================================
create sequence if not exists public.ordenes_equipos_folio_seq;

create table if not exists public.ordenes_equipos (
  id uuid primary key default gen_random_uuid(),
  folio integer not null default nextval('public.ordenes_equipos_folio_seq') unique,
  user_id uuid not null references auth.users(id),
  nombre_usuario_snapshot text,
  cliente_id uuid not null references public.clientes_equipos(id),
  cliente_nombre_snapshot text,
  tipo_equipo text not null check (tipo_equipo in ('Tanques', 'Reguladores', 'BC', 'Computadora', 'Otro')),
  tipo_equipo_otro text,
  que_se_hara text not null,
  notas text,
  foto_url text,
  fecha date not null default current_date,
  estado text not null default 'Pendiente por trabajar'
    check (estado in ('Pendiente por trabajar', 'En proceso', 'Pendiente por despachar', 'Entregado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ordenes_equipos enable row level security;

drop policy if exists "Los usuarios logueados ven ordenes de equipos" on public.ordenes_equipos;
create policy "Los usuarios logueados ven ordenes de equipos"
  on public.ordenes_equipos for select
  to authenticated
  using (true);

drop policy if exists "Permiso equipos_clientes inserta ordenes" on public.ordenes_equipos;
create policy "Permiso equipos_clientes inserta ordenes"
  on public.ordenes_equipos for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes edita ordenes" on public.ordenes_equipos;
create policy "Permiso equipos_clientes edita ordenes"
  on public.ordenes_equipos for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular/Admin borran ordenes de equipos" on public.ordenes_equipos;
create policy "Solo Titular/Admin borran ordenes de equipos"
  on public.ordenes_equipos for delete
  to authenticated
  using (public.is_titular() or public.is_admin());

create or replace view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;

-- ============================================================
-- 3) Storage: bucket público para la foto opcional de cada orden.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('equipos-clientes', 'equipos-clientes', true)
on conflict (id) do nothing;

drop policy if exists "Lectura pública de fotos de equipos-clientes" on storage.objects;
create policy "Lectura pública de fotos de equipos-clientes"
  on storage.objects for select
  using (bucket_id = 'equipos-clientes');

drop policy if exists "Autenticados suben fotos de equipos-clientes" on storage.objects;
create policy "Autenticados suben fotos de equipos-clientes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'equipos-clientes');
