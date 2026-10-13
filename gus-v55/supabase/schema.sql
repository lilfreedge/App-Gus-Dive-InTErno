-- ============================================================
-- GUS DIVE - Control Interno
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- ============================================================

-- 1) Tabla de perfiles (info adicional de cada usuario/empleado)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Los usuarios logueados pueden ver todos los perfiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Un usuario puede crear su propio perfil"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Un usuario puede editar su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Tabla de salidas de piezas / uso interno (ring, piezas, etc.)
create table if not exists public.salidas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id),
  articulo text not null,
  cantidad numeric not null check (cantidad > 0),
  motivo text not null,
  autorizado_por text,
  nota text
);

alter table public.salidas enable row level security;

create policy "Los usuarios logueados pueden ver todas las salidas"
  on public.salidas for select
  to authenticated
  using (true);

create policy "Los usuarios logueados pueden registrar salidas"
  on public.salidas for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 3) Tabla de llenados de tanques (conteo interno)
create table if not exists public.llenados_tanques (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id),
  cantidad numeric not null check (cantidad > 0),
  nota text
);

alter table public.llenados_tanques enable row level security;

create policy "Los usuarios logueados pueden ver todos los llenados"
  on public.llenados_tanques for select
  to authenticated
  using (true);

create policy "Los usuarios logueados pueden registrar llenados"
  on public.llenados_tanques for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 4) Vistas útiles con el nombre del empleado ya incluido
-- security_invoker=on hace que la vista respete las políticas RLS del usuario que consulta
create or replace view public.salidas_con_nombre
  with (security_invoker = on) as
  select s.*, p.full_name
  from public.salidas s
  join public.profiles p on p.id = s.user_id
  order by s.created_at desc;

create or replace view public.llenados_con_nombre
  with (security_invoker = on) as
  select l.*, p.full_name
  from public.llenados_tanques l
  join public.profiles p on p.id = l.user_id
  order by l.created_at desc;
