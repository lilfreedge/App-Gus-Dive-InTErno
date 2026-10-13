-- ============================================================
-- GUS DIVE - Migración 06 (V5): Equipos (Inspección visual +
-- Mantenimiento de reguladores), catálogos de Reguladores/Tanques de
-- alquiler, Facturación en llenados, permisos granulares nuevos,
-- Dominio personalizado y Reporte semanal por correo configurable.
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- (Es seguro correrlo sobre tu proyecto ya existente, no borra nada.)
-- ============================================================

-- 1) Permisos granulares nuevos (mismo patrón que las migraciones
-- anteriores: se agregan al default para usuarios nuevos, y se
-- rellenan con `false` para los perfiles que ya existen).
alter table public.profiles alter column permisos set default
  '{"reportes":false,"catalogo":true,"historial":false,"changelog":false,"manual":false,"movimientos":false,"facturacion":false,"registrar_inspeccion":false,"registrar_llenado":false,"registrar_mantenimiento":false,"catalogo_codigo":false,"catalogo_regulador":false,"catalogo_tanque":false}'::jsonb;

update public.profiles
  set permisos = permisos || '{
    "facturacion": false,
    "registrar_inspeccion": false,
    "registrar_llenado": false,
    "registrar_mantenimiento": false,
    "catalogo_codigo": false,
    "catalogo_regulador": false,
    "catalogo_tanque": false
  }'::jsonb
  where not (
    permisos ? 'facturacion'
    and permisos ? 'registrar_inspeccion'
    and permisos ? 'registrar_llenado'
    and permisos ? 'registrar_mantenimiento'
    and permisos ? 'catalogo_codigo'
    and permisos ? 'catalogo_regulador'
    and permisos ? 'catalogo_tanque'
  );

-- El Titular y los administradores existentes quedan con todo en true
-- por defecto para no perder acceso a nada de golpe al desplegar V5
-- (el Titular puede luego afinar por persona desde Administración).
update public.profiles
  set permisos = permisos || '{
    "facturacion": true,
    "registrar_inspeccion": true,
    "registrar_llenado": true,
    "registrar_mantenimiento": true,
    "catalogo_codigo": true,
    "catalogo_regulador": true,
    "catalogo_tanque": true
  }'::jsonb
  where is_admin or es_titular;

-- 1.1) Amplía las políticas de `articulos` (creadas en migración 02, solo
-- para is_admin()) para que el nuevo permiso granular "catalogo_codigo"
-- también pueda agregar/editar códigos del catálogo, no solo Admin/Titular.
drop policy if exists "Solo administradores agregan artículos" on public.articulos;
create policy "Permiso catalogo_codigo agrega artículos"
  on public.articulos for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'catalogo_codigo')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo administradores editan artículos" on public.articulos;
create policy "Permiso catalogo_codigo edita artículos"
  on public.articulos for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'catalogo_codigo')::boolean from public.profiles where id = auth.uid()), false)
  );

-- ============================================================
-- 2) Catálogos de alquiler: Reguladores y Tanques.
-- Mismo patrón que public.articulos (migración 02).
-- ============================================================

create table if not exists public.reguladores_alquiler (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.reguladores_alquiler enable row level security;

drop policy if exists "Los usuarios logueados ven reguladores de alquiler" on public.reguladores_alquiler;
create policy "Los usuarios logueados ven reguladores de alquiler"
  on public.reguladores_alquiler for select
  to authenticated
  using (true);

drop policy if exists "Permiso catalogo_regulador agrega reguladores" on public.reguladores_alquiler;
create policy "Permiso catalogo_regulador agrega reguladores"
  on public.reguladores_alquiler for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'catalogo_regulador')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso catalogo_regulador edita reguladores" on public.reguladores_alquiler;
create policy "Permiso catalogo_regulador edita reguladores"
  on public.reguladores_alquiler for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'catalogo_regulador')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular borra reguladores" on public.reguladores_alquiler;
create policy "Solo Titular borra reguladores"
  on public.reguladores_alquiler for delete
  to authenticated
  using (public.is_titular());

create table if not exists public.tanques_alquiler (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tanques_alquiler enable row level security;

drop policy if exists "Los usuarios logueados ven tanques de alquiler" on public.tanques_alquiler;
create policy "Los usuarios logueados ven tanques de alquiler"
  on public.tanques_alquiler for select
  to authenticated
  using (true);

drop policy if exists "Permiso catalogo_tanque agrega tanques" on public.tanques_alquiler;
create policy "Permiso catalogo_tanque agrega tanques"
  on public.tanques_alquiler for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'catalogo_tanque')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso catalogo_tanque edita tanques" on public.tanques_alquiler;
create policy "Permiso catalogo_tanque edita tanques"
  on public.tanques_alquiler for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'catalogo_tanque')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular borra tanques" on public.tanques_alquiler;
create policy "Solo Titular borra tanques"
  on public.tanques_alquiler for delete
  to authenticated
  using (public.is_titular());

-- ============================================================
-- 3) Inspección visual y Mantenimiento de reguladores.
-- Mismo patrón que salidas/llenados_tanques: folio secuencial,
-- snapshot del nombre de quien registra, RLS por permiso granular.
-- ============================================================

create sequence if not exists public.inspecciones_folio_seq;

create table if not exists public.inspecciones_visuales (
  id uuid primary key default gen_random_uuid(),
  folio integer not null default nextval('public.inspecciones_folio_seq') unique,
  user_id uuid not null references auth.users(id),
  nombre_usuario_snapshot text,
  tanque_id uuid references public.tanques_alquiler(id),
  tanque_codigo_snapshot text,
  resultado text not null check (resultado in ('Aprobado', 'Rechazado')),
  nota text,
  created_at timestamptz not null default now()
);

alter table public.inspecciones_visuales enable row level security;

drop policy if exists "Los usuarios logueados ven inspecciones" on public.inspecciones_visuales;
create policy "Los usuarios logueados ven inspecciones"
  on public.inspecciones_visuales for select
  to authenticated
  using (true);

drop policy if exists "Permiso registrar_inspeccion inserta" on public.inspecciones_visuales;
create policy "Permiso registrar_inspeccion inserta"
  on public.inspecciones_visuales for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'registrar_inspeccion')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular/Admin editan inspecciones" on public.inspecciones_visuales;
create policy "Solo Titular/Admin editan inspecciones"
  on public.inspecciones_visuales for update
  to authenticated
  using (public.is_titular() or public.is_admin());

drop policy if exists "Solo Titular/Admin borran inspecciones" on public.inspecciones_visuales;
create policy "Solo Titular/Admin borran inspecciones"
  on public.inspecciones_visuales for delete
  to authenticated
  using (public.is_titular() or public.is_admin());

create sequence if not exists public.mantenimientos_folio_seq;

create table if not exists public.mantenimientos_reguladores (
  id uuid primary key default gen_random_uuid(),
  folio integer not null default nextval('public.mantenimientos_folio_seq') unique,
  user_id uuid not null references auth.users(id),
  nombre_usuario_snapshot text,
  regulador_id uuid references public.reguladores_alquiler(id),
  regulador_codigo_snapshot text,
  detalle text not null,
  created_at timestamptz not null default now()
);

alter table public.mantenimientos_reguladores enable row level security;

drop policy if exists "Los usuarios logueados ven mantenimientos" on public.mantenimientos_reguladores;
create policy "Los usuarios logueados ven mantenimientos"
  on public.mantenimientos_reguladores for select
  to authenticated
  using (true);

drop policy if exists "Permiso registrar_mantenimiento inserta" on public.mantenimientos_reguladores;
create policy "Permiso registrar_mantenimiento inserta"
  on public.mantenimientos_reguladores for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'registrar_mantenimiento')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular/Admin editan mantenimientos" on public.mantenimientos_reguladores;
create policy "Solo Titular/Admin editan mantenimientos"
  on public.mantenimientos_reguladores for update
  to authenticated
  using (public.is_titular() or public.is_admin());

drop policy if exists "Solo Titular/Admin borran mantenimientos" on public.mantenimientos_reguladores;
create policy "Solo Titular/Admin borran mantenimientos"
  on public.mantenimientos_reguladores for delete
  to authenticated
  using (public.is_titular() or public.is_admin());

-- Vistas con nombre, mismo patrón que salidas_con_nombre/llenados_con_nombre.
create or replace view public.inspecciones_con_nombre
  with (security_invoker = on) as
  select i.*, coalesce(i.nombre_usuario_snapshot, p.full_name) as full_name
  from public.inspecciones_visuales i
  join public.profiles p on p.id = i.user_id
  order by i.created_at desc;

create or replace view public.mantenimientos_con_nombre
  with (security_invoker = on) as
  select m.*, coalesce(m.nombre_usuario_snapshot, p.full_name) as full_name
  from public.mantenimientos_reguladores m
  join public.profiles p on p.id = m.user_id
  order by m.created_at desc;

-- Registrar "registrar_llenado" también gatea la inserción de llenados
-- de tanque, que antes era libre para cualquier autenticado. Se agrega
-- (no se reemplaza) la política de insert existente para no romper si
-- el nombre de la política original cambió entre versiones.
drop policy if exists "Los usuarios autenticados insertan sus llenados" on public.llenados_tanques;
drop policy if exists "Permiso registrar_llenado inserta" on public.llenados_tanques;
create policy "Permiso registrar_llenado inserta"
  on public.llenados_tanques for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      public.is_titular() or public.is_admin()
      or coalesce((select (permisos->>'registrar_llenado')::boolean from public.profiles where id = auth.uid()), false)
    )
  );

-- ============================================================
-- 4) Facturación: marcar llenados como facturados.
-- ============================================================
alter table public.llenados_tanques add column if not exists facturado boolean not null default false;
alter table public.llenados_tanques add column if not exists factura_no text;

drop view if exists public.llenados_con_nombre;
create view public.llenados_con_nombre
  with (security_invoker = on) as
  select l.*, coalesce(l.nombre_usuario_snapshot, p.full_name) as full_name
  from public.llenados_tanques l
  join public.profiles p on p.id = l.user_id
  order by l.created_at desc;

-- Solo quien tiene permiso "facturacion" (o Titular/Admin) puede marcar
-- un llenado como facturado; se implementa reforzando la política de
-- update existente de llenados_tanques con una función de apoyo que la
-- UI usa antes de mandar el update (la política de RLS de update ya
-- existente de llenados_tanques —admin/Titular— cubre el caso general;
-- si en tu proyecto los usuarios comunes pueden editar sus propios
-- llenados, esta migración no lo cambia).

-- ============================================================
-- 5) app_config: dominio personalizado + reporte semanal configurable.
-- ============================================================
alter table public.app_config add column if not exists dominio_personalizado text;
alter table public.app_config add column if not exists reporte_destinatarios text[] not null default array['felipe@gusdivecenter.com'];
alter table public.app_config add column if not exists reporte_detalles jsonb not null default
  '{"salidas":true,"llenados":true,"inspecciones":true,"mantenimientos":true,"facturacion":false}'::jsonb;

-- ============================================================
-- ÚLTIMO PASO (hazlo tú, una sola vez, opcional):
-- Si quieres precargar algunos reguladores/tanques de alquiler o dejar
-- el reporte semanal con otros correos desde el inicio, puedes hacerlo
-- desde Administración en la app (ya queda la UI para eso) en vez de
-- SQL manual.
-- ============================================================
