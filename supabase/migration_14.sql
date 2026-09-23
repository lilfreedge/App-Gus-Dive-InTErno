-- Migration 14: Compresores -- catálogo, mantenimientos y fotos (Storage).
--
-- Mismo patrón que reguladores_alquiler/mantenimientos_reguladores
-- (migración 06): tabla de catálogo + tabla de mantenimientos con folio,
-- snapshot de nombre y RLS por permiso granular (acá se reutiliza el
-- permiso `compresores` que ya existía en profiles.permisos desde antes,
-- tanto para el catálogo como para registrar mantenimientos -- no hay
-- permisos separados para esto, a diferencia de reguladores/tanques).
--
-- Primera vez que la app usa Supabase Storage: bucket público
-- "compresores" para las fotos (compresor, horómetro, espacio, otra
-- inspección, reparación). Política simple -- cualquier autenticado
-- sube, lectura pública vía URL directa (sin firmar). El control real
-- de quién ve el botón de subir sigue siendo el permiso `compresores`
-- en la interfaz, igual que en el resto de la app.

-- ============================================================
-- 1) Catálogo de compresores.
-- ============================================================
create table if not exists public.compresores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descripcion text not null,
  marca text not null,
  modelo text not null,
  no_bloque text not null,
  serie text not null,
  foto_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.compresores enable row level security;

drop policy if exists "Los usuarios logueados ven compresores" on public.compresores;
create policy "Los usuarios logueados ven compresores"
  on public.compresores for select
  to authenticated
  using (true);

drop policy if exists "Permiso compresores agrega compresores" on public.compresores;
create policy "Permiso compresores agrega compresores"
  on public.compresores for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'compresores')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso compresores edita compresores" on public.compresores;
create policy "Permiso compresores edita compresores"
  on public.compresores for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'compresores')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular borra compresores" on public.compresores;
create policy "Solo Titular borra compresores"
  on public.compresores for delete
  to authenticated
  using (public.is_titular());

-- ============================================================
-- 2) Mantenimientos de compresores (Inspección / Preventivo / Correctivo).
-- Todas las columnas específicas de cada tipo se guardan en la misma
-- tabla (quedan en null si no aplican) -- mismo criterio simple que ya
-- se usa en otras tablas de esta app.
-- ============================================================
create sequence if not exists public.mantenimientos_compresores_folio_seq;

create table if not exists public.mantenimientos_compresores (
  id uuid primary key default gen_random_uuid(),
  folio integer not null default nextval('public.mantenimientos_compresores_folio_seq') unique,
  user_id uuid not null references auth.users(id),
  nombre_usuario_snapshot text,
  compresor_id uuid references public.compresores(id),
  compresor_codigo_snapshot text,
  tipo_mantenimiento text not null check (tipo_mantenimiento in ('Inspección', 'Mantenimiento preventivo', 'Mantenimiento correctivo')),
  responsable text not null check (responsable in ('Gugi', 'Pipe', 'Frederick', 'Alexander', 'Danny')),
  fecha date not null,
  horometro numeric not null,
  foto_horometro_url text,
  notas text,
  -- Específicos de Inspección:
  nivel_aceite text,
  limpieza_compresor text check (limpieza_compresor is null or limpieza_compresor in ('Satisfactorio', 'Aceptable', 'Deficiente')),
  estado_manguera text check (estado_manguera is null or estado_manguera in ('Satisfactorio', 'Aceptable', 'Deficiente')),
  estado_filtro_principal text check (estado_filtro_principal is null or estado_filtro_principal in ('Satisfactorio', 'Aceptable', 'Deficiente')),
  estado_filtro_final text check (estado_filtro_final is null or estado_filtro_final in ('Satisfactorio', 'Aceptable', 'Deficiente')),
  limpieza_espacio text check (limpieza_espacio is null or limpieza_espacio in ('Satisfactorio', 'Aceptable', 'Deficiente')),
  foto_espacio_url text,
  otra_inspeccion text,
  foto_otra_inspeccion_url text,
  -- Específicos de Preventivo/Correctivo:
  proceso_piezas text,
  foto_reparacion_url text,
  created_at timestamptz not null default now()
);

alter table public.mantenimientos_compresores enable row level security;

drop policy if exists "Los usuarios logueados ven mantenimientos de compresores" on public.mantenimientos_compresores;
create policy "Los usuarios logueados ven mantenimientos de compresores"
  on public.mantenimientos_compresores for select
  to authenticated
  using (true);

drop policy if exists "Permiso compresores inserta mantenimientos" on public.mantenimientos_compresores;
create policy "Permiso compresores inserta mantenimientos"
  on public.mantenimientos_compresores for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'compresores')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular/Admin editan mantenimientos de compresores" on public.mantenimientos_compresores;
create policy "Solo Titular/Admin editan mantenimientos de compresores"
  on public.mantenimientos_compresores for update
  to authenticated
  using (public.is_titular() or public.is_admin());

drop policy if exists "Solo Titular/Admin borran mantenimientos de compresores" on public.mantenimientos_compresores;
create policy "Solo Titular/Admin borran mantenimientos de compresores"
  on public.mantenimientos_compresores for delete
  to authenticated
  using (public.is_titular() or public.is_admin());

create or replace view public.mantenimientos_compresores_con_nombre
  with (security_invoker = on) as
  select m.*, coalesce(m.nombre_usuario_snapshot, p.full_name) as full_name
  from public.mantenimientos_compresores m
  join public.profiles p on p.id = m.user_id
  order by m.created_at desc;

-- ============================================================
-- 3) Storage: bucket público para fotos de compresores/mantenimientos.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('compresores', 'compresores', true)
on conflict (id) do nothing;

drop policy if exists "Lectura pública de fotos de compresores" on storage.objects;
create policy "Lectura pública de fotos de compresores"
  on storage.objects for select
  using (bucket_id = 'compresores');

drop policy if exists "Autenticados suben fotos de compresores" on storage.objects;
create policy "Autenticados suben fotos de compresores"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'compresores');
