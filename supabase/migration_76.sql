-- =====================================================================
-- migration_76.sql -- V51: avisos fijos y manuales (maqueta
-- maqueta-v51-todo-junto.html, respuestas del 31-oct-2026). Se puede
-- correr más de una vez. No borra ni cambia datos que ya existan.
--
--   (1) avisos_fijos / avisos_fijos_leidos: avisos arriba del Inicio de App
--       Interno y de App Equipos de clientes. Los crean el Titular y los
--       administradores ("9. yo y administradores"). Tipos: fijo, se
--       repite y una sola vez ("15. si. Pero también pon una opción para
--       poner un reminder de one time"). Con "Listo" opcional; al marcarlo
--       le llega al que lo creó por celular y correo ("16. las dos"). Al
--       técnico solo le salen los que le asignen ("17").
--   (2) manuales + carpeta "manuales" (PDF): los mismos en los dos apps
--       ("20"); todos los ven, también el técnico; los agrega y quita el
--       Titular, o a quien le dé el permiso manuales_editar ("19. solo yo
--       por ahora pero pon para poder dar acceso").
-- =====================================================================

-- (1) Avisos fijos ------------------------------------------------------------
create table if not exists public.avisos_fijos (
  id uuid primary key default gen_random_uuid(),
  app text not null check (app in ('interno', 'clientes')),
  texto text not null check (length(trim(texto)) > 0),
  color text not null default 'amarillo' check (color in ('rojo', 'amarillo', 'azul')),
  tipo text not null default 'fijo' check (tipo in ('fijo', 'repite', 'una_vez')),
  hasta date,                                   -- fijo: último día (vacío = hasta que se quite)
  cada text check (cada in ('dia', 'semana', 'mes')),  -- se repite
  dia_semana integer check (dia_semana between 0 and 6), -- 0 = domingo
  dia_mes integer check (dia_mes between 1 and 31),
  fecha date,                                   -- una sola vez
  sigue_hasta_listo boolean not null default false, -- una sola vez: si no lo marcan, sigue saliendo
  para jsonb not null default '[]'::jsonb,      -- ids de perfiles; vacío = a todos menos los técnicos
  pide_listo boolean not null default false,
  activo boolean not null default true,
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado_por_nombre text not null default '',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists avisos_fijos_app_idx on public.avisos_fijos (app, activo);

create table if not exists public.avisos_fijos_leidos (
  aviso_id uuid not null references public.avisos_fijos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ocurrencia date not null,        -- qué vez del aviso (para los que se repiten)
  nombre text not null default '',
  leido_en timestamptz not null default now(),
  primary key (aviso_id, user_id, ocurrencia)
);

alter table public.avisos_fijos enable row level security;
alter table public.avisos_fijos_leidos enable row level security;

drop policy if exists "avisos fijos ver" on public.avisos_fijos;
create policy "avisos fijos ver" on public.avisos_fijos
  for select to authenticated using (true);
drop policy if exists "avisos fijos crear" on public.avisos_fijos;
create policy "avisos fijos crear" on public.avisos_fijos
  for insert to authenticated with check (public.is_titular() or public.is_admin());
drop policy if exists "avisos fijos editar" on public.avisos_fijos;
create policy "avisos fijos editar" on public.avisos_fijos
  for update to authenticated using (public.is_titular() or public.is_admin());
drop policy if exists "avisos fijos borrar" on public.avisos_fijos;
create policy "avisos fijos borrar" on public.avisos_fijos
  for delete to authenticated using (public.is_titular());

drop policy if exists "avisos leidos ver" on public.avisos_fijos_leidos;
create policy "avisos leidos ver" on public.avisos_fijos_leidos
  for select to authenticated using (true);
drop policy if exists "avisos leidos marcar" on public.avisos_fijos_leidos;
create policy "avisos leidos marcar" on public.avisos_fijos_leidos
  for insert to authenticated with check (user_id = auth.uid());

-- (2) Manuales ----------------------------------------------------------------
create or replace function public.puede_manuales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_titular()
    or coalesce((select (permisos->>'manuales_editar')::boolean from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.puede_manuales() to authenticated;

create table if not exists public.manuales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'Reguladores',
  marca text not null check (length(trim(marca)) > 0),
  modelos text not null check (length(trim(modelos)) > 0),  -- separados por coma
  descripcion text,
  archivo_path text,            -- PDF en la carpeta "manuales"
  url text,                     -- o un enlace
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.manuales enable row level security;

drop policy if exists "manuales ver" on public.manuales;
create policy "manuales ver" on public.manuales
  for select to authenticated using (true);
drop policy if exists "manuales crear" on public.manuales;
create policy "manuales crear" on public.manuales
  for insert to authenticated with check (public.puede_manuales());
drop policy if exists "manuales editar" on public.manuales;
create policy "manuales editar" on public.manuales
  for update to authenticated using (public.puede_manuales());
drop policy if exists "manuales quitar" on public.manuales;
create policy "manuales quitar" on public.manuales
  for delete to authenticated using (public.puede_manuales());

-- Carpeta privada para los PDF (hasta 50 MB cada uno).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manuales', 'manuales', false, 52428800, array['application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "manuales archivos ver" on storage.objects;
create policy "manuales archivos ver" on storage.objects
  for select to authenticated using (bucket_id = 'manuales');
drop policy if exists "manuales archivos subir" on storage.objects;
create policy "manuales archivos subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'manuales' and public.puede_manuales());
drop policy if exists "manuales archivos quitar" on storage.objects;
create policy "manuales archivos quitar" on storage.objects
  for delete to authenticated using (bucket_id = 'manuales' and public.puede_manuales());
