-- ============================================================
-- GUS DIVE - Migración 02: roles, catálogo, auditoría
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- (Es seguro correrlo sobre tu proyecto ya existente, no borra nada.)
-- ============================================================

-- 1) Rol de administrador en cada perfil
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Función helper: ¿el usuario actual es administrador?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Los administradores pueden editar el perfil de cualquiera (para dar/quitar admin)
drop policy if exists "Un administrador puede editar cualquier perfil" on public.profiles;
create policy "Un administrador puede editar cualquier perfil"
  on public.profiles for update
  to authenticated
  using (public.is_admin());

-- 2) Catálogo de artículos
create table if not exists public.articulos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.articulos enable row level security;

drop policy if exists "Los usuarios logueados pueden ver el catálogo" on public.articulos;
create policy "Los usuarios logueados pueden ver el catálogo"
  on public.articulos for select
  to authenticated
  using (true);

drop policy if exists "Solo administradores agregan artículos" on public.articulos;
create policy "Solo administradores agregan artículos"
  on public.articulos for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Solo administradores editan artículos" on public.articulos;
create policy "Solo administradores editan artículos"
  on public.articulos for update
  to authenticated
  using (public.is_admin());

-- 3) Referencias en salidas: al catálogo y a quién autorizó (snapshot de texto se conserva)
alter table public.salidas add column if not exists articulo_id uuid references public.articulos(id);
alter table public.salidas add column if not exists autorizado_por_id uuid references auth.users(id);

-- 4) Solo administradores pueden editar/borrar salidas y llenados ya registrados
drop policy if exists "Solo administradores editan salidas" on public.salidas;
create policy "Solo administradores editan salidas"
  on public.salidas for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Solo administradores borran salidas" on public.salidas;
create policy "Solo administradores borran salidas"
  on public.salidas for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Solo administradores editan llenados" on public.llenados_tanques;
create policy "Solo administradores editan llenados"
  on public.llenados_tanques for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Solo administradores borran llenados" on public.llenados_tanques;
create policy "Solo administradores borran llenados"
  on public.llenados_tanques for delete
  to authenticated
  using (public.is_admin());

-- 5) Historial de cambios (auditoría) — queda registro de ediciones y borrados
create table if not exists public.cambios_historial (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id),
  tabla text not null,
  registro_id uuid not null,
  accion text not null check (accion in ('editar', 'borrar')),
  datos_anteriores jsonb not null
);

alter table public.cambios_historial enable row level security;

drop policy if exists "Solo administradores ven el historial de cambios" on public.cambios_historial;
create policy "Solo administradores ven el historial de cambios"
  on public.cambios_historial for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Solo administradores registran cambios" on public.cambios_historial;
create policy "Solo administradores registran cambios"
  on public.cambios_historial for insert
  to authenticated
  with check (public.is_admin());

create or replace view public.historial_con_nombre
  with (security_invoker = on) as
  select h.*, p.full_name
  from public.cambios_historial h
  join public.profiles p on p.id = h.user_id
  order by h.created_at desc;

-- ============================================================
-- ÚLTIMO PASO (hazlo tú, una sola vez):
-- Conviértete en el primer administrador. Reemplaza el correo
-- de abajo por el tuyo y corre esta línea aparte:
--
-- update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'TU-CORREO-AQUI');
-- ============================================================
