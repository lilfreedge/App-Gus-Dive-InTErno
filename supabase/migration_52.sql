-- migration_52.sql
--
-- "Solicitudes al almacén" (App Interno, V29). Pedido explícito: un
-- usuario de la tienda le pide códigos al almacén para que haya inventario
-- en tienda ("la pide al almacen para que haya inventario en tienda"), y
-- la solicitud se marca como recibida cuando llega. Decisiones del
-- usuario:
-- - Se piden códigos del catálogo (public.articulos), con cantidad, varios
--   en una misma solicitud, y UNA nota por solicitud ("por la solicitud
--   completa").
-- - Se recibe código por código ("codigo por codigo, por si algo no
--   llega"): cada línea tiene su propio recibido_at.
-- - Se controla con un permiso nuevo, "Solicitar códigos a almacén"
--   (profiles.permisos.solicitudes_almacen), en Administración.
-- - Al almacén se le avisa por correo ("hay que avisarle por fuera"), a los
--   correos configurados en Administración (app_config.solicitudes_correos).
--
-- user_id / recibido_por con "on delete set null" (no el default del
-- resto de tablas): así una solicitud nunca impide borrar un usuario en
-- Supabase (ver el gotcha de "Database error deleting user" del
-- 6-oct-2026 en estado-proyecto.md) -- el nombre queda guardado aparte
-- en *_snapshot / recibido_por_nombre.
--
-- Independiente de todas las anteriores. Se puede correr más de una vez.

create sequence if not exists public.solicitudes_almacen_folio_seq;

create table if not exists public.solicitudes_almacen (
  id uuid primary key default gen_random_uuid(),
  folio integer not null default nextval('public.solicitudes_almacen_folio_seq') unique,
  user_id uuid references auth.users(id) on delete set null,
  nombre_usuario_snapshot text,
  nota text,
  aviso_enviado_at timestamptz,
  aviso_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.solicitudes_almacen_items (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes_almacen(id) on delete cascade,
  articulo_id uuid references public.articulos(id) on delete set null,
  codigo_snapshot text not null,
  descripcion_snapshot text,
  cantidad integer not null check (cantidad > 0),
  orden integer not null default 0,
  recibido_at timestamptz,
  recibido_por uuid references auth.users(id) on delete set null,
  recibido_por_nombre text
);

create index if not exists solicitudes_almacen_items_solicitud_idx
  on public.solicitudes_almacen_items (solicitud_id);

-- ¿Puede usar Solicitudes al almacén? Titular siempre; el resto, solo con
-- el permiso. (Mismo criterio que tieneAcceso() en lib/roles.js.)
create or replace function public.puede_solicitudes_almacen()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_titular()
    or coalesce((select (permisos->>'solicitudes_almacen')::boolean from public.profiles where id = auth.uid()), false);
$$;

alter table public.solicitudes_almacen enable row level security;
alter table public.solicitudes_almacen_items enable row level security;

drop policy if exists "Con permiso ven solicitudes" on public.solicitudes_almacen;
create policy "Con permiso ven solicitudes"
  on public.solicitudes_almacen for select
  to authenticated
  using (public.puede_solicitudes_almacen());

drop policy if exists "Con permiso crean solicitudes" on public.solicitudes_almacen;
create policy "Con permiso crean solicitudes"
  on public.solicitudes_almacen for insert
  to authenticated
  with check (public.puede_solicitudes_almacen() and user_id = auth.uid());

drop policy if exists "Con permiso actualizan solicitudes" on public.solicitudes_almacen;
create policy "Con permiso actualizan solicitudes"
  on public.solicitudes_almacen for update
  to authenticated
  using (public.puede_solicitudes_almacen());

drop policy if exists "Solo Titular borra solicitudes" on public.solicitudes_almacen;
create policy "Solo Titular borra solicitudes"
  on public.solicitudes_almacen for delete
  to authenticated
  using (public.is_titular());

drop policy if exists "Con permiso ven items de solicitudes" on public.solicitudes_almacen_items;
create policy "Con permiso ven items de solicitudes"
  on public.solicitudes_almacen_items for select
  to authenticated
  using (public.puede_solicitudes_almacen());

drop policy if exists "Con permiso crean items de solicitudes" on public.solicitudes_almacen_items;
create policy "Con permiso crean items de solicitudes"
  on public.solicitudes_almacen_items for insert
  to authenticated
  with check (public.puede_solicitudes_almacen());

drop policy if exists "Con permiso marcan items recibidos" on public.solicitudes_almacen_items;
create policy "Con permiso marcan items recibidos"
  on public.solicitudes_almacen_items for update
  to authenticated
  using (public.puede_solicitudes_almacen());

drop policy if exists "Solo Titular borra items de solicitudes" on public.solicitudes_almacen_items;
create policy "Solo Titular borra items de solicitudes"
  on public.solicitudes_almacen_items for delete
  to authenticated
  using (public.is_titular());

-- Correos del almacén a los que se avisa de cada solicitud nueva
-- (Administración > Solicitudes al almacén). Vacío = no se avisa.
alter table public.app_config
  add column if not exists solicitudes_correos text[] not null default '{}';

-- Crear una solicitud con todos sus códigos en un solo paso (todo o nada:
-- si algo falla, no queda una solicitud a medias sin códigos). Corre con
-- los permisos de quien la llama (security invoker), así que las mismas
-- políticas de arriba aplican. El código y la descripción se copian del
-- catálogo al momento de pedir, para que la solicitud no cambie si
-- después se edita el catálogo.
-- p_items: [{"articulo_id": "...", "cantidad": 3}, ...]
create or replace function public.crear_solicitud_almacen(p_nota text, p_items jsonb)
returns table (nuevo_id uuid, nuevo_folio integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_folio integer;
  v_nombre text;
  v_insertados integer;
begin
  if not public.puede_solicitudes_almacen() then
    raise exception 'No tienes permiso para solicitar códigos al almacén.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La solicitud no tiene códigos.';
  end if;

  select full_name into v_nombre from public.profiles where id = auth.uid();

  insert into public.solicitudes_almacen (user_id, nombre_usuario_snapshot, nota)
    values (auth.uid(), v_nombre, nullif(btrim(coalesce(p_nota, '')), ''))
    returning solicitudes_almacen.id, solicitudes_almacen.folio into v_id, v_folio;

  insert into public.solicitudes_almacen_items
    (solicitud_id, articulo_id, codigo_snapshot, descripcion_snapshot, cantidad, orden)
  select v_id, a.id, a.nombre, a.descripcion, (t.it->>'cantidad')::integer, (t.ord - 1)::integer
  from jsonb_array_elements(p_items) with ordinality as t(it, ord)
  join public.articulos a on a.id = (t.it->>'articulo_id')::uuid;

  get diagnostics v_insertados = row_count;
  if v_insertados <> jsonb_array_length(p_items) then
    raise exception 'Uno de los códigos ya no existe en el catálogo. Recarga la página.';
  end if;

  return query select v_id, v_folio;
end;
$$;
