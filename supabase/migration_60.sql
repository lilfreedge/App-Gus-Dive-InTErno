-- migration_60.sql  (V31, entregada con v60)
-- Seguimiento de avisos en "Clientes por contactar" (App Equipos de clientes).
--
-- Pedido del usuario: "si le notificamos a un cliente que venga por 3ra vez
-- pues descartarlo de esa lista". Cada toque de "Notificar vía WhatsApp"
-- queda anotado aquí (fecha y quién). Las reglas (3 avisos, 15 días entre
-- uno y otro, descartado por 1 año, el conteo vuelve a empezar si el
-- cliente registra una orden) las aplica la pantalla leyendo esta tabla.
-- "Deshacer" borra el aviso.

create table if not exists public.avisos_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_equipos(id) on delete cascade,
  motivo text not null default 'mantenimiento' check (motivo in ('mantenimiento', 'sin_visita')),
  user_id uuid references auth.users(id) on delete set null,
  nombre_usuario_snapshot text,
  created_at timestamptz not null default now()
);

create index if not exists avisos_clientes_cliente_idx on public.avisos_clientes (cliente_id, created_at);

alter table public.avisos_clientes enable row level security;

create or replace function public.puede_contactar_clientes()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_titular()
    or coalesce((select (permisos->>'equipos_clientes_contactar')::boolean
                 from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "Contactar clientes ve avisos" on public.avisos_clientes;
create policy "Contactar clientes ve avisos"
  on public.avisos_clientes for select
  to authenticated
  using (public.puede_contactar_clientes());

drop policy if exists "Contactar clientes anota avisos" on public.avisos_clientes;
create policy "Contactar clientes anota avisos"
  on public.avisos_clientes for insert
  to authenticated
  with check (public.puede_contactar_clientes() and user_id = auth.uid());

drop policy if exists "Contactar clientes deshace avisos" on public.avisos_clientes;
create policy "Contactar clientes deshace avisos"
  on public.avisos_clientes for delete
  to authenticated
  using (public.puede_contactar_clientes());

grant select, insert, delete on public.avisos_clientes to authenticated;
