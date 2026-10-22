-- =====================================================================
-- migration_64.sql -- V32 (segunda parte). Correr DESPUÉS de
-- migration_63.sql. Se puede correr más de una vez sin problema.
--
-- (1) App Equipos de clientes: "No. de cotización" de la orden (pedido
--     explícito, opción C de la maqueta). Columna nueva en ordenes_equipos
--     y se vuelve a crear la vista ordenes_equipos_con_nombre para que la
--     vea (una vista con "select o.*" no recoge columnas nuevas sola --
--     mismo caso de migration_50.sql).
-- (2) Roles (las dos apps): ahora se pueden BORRAR, solo el Titular y
--     solo si nadie tiene ese rol (pedido explícito: "permíteme poder
--     borrar y editar roles en ambos apps"). El app ya avisa antes; la
--     base de datos lo vuelve a revisar por si acaso.
-- =====================================================================

-- (1) ------------------------------------------------------------------
alter table public.ordenes_equipos add column if not exists cotizacion text;

drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;

grant select on public.ordenes_equipos_con_nombre to authenticated;

-- (2) ------------------------------------------------------------------
-- Cuántas personas tienen el rol (mismo criterio que la pantalla de Roles:
-- sin contar Titular, Administradores ni cuentas eliminadas -- a esos el
-- rol no les aplica).
create or replace function public.personas_con_rol(p_rol_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profiles
  where (rol_interno_id = p_rol_id or rol_clientes_id = p_rol_id)
    and not coalesce(es_titular, false)
    and not coalesce(is_admin, false)
    and eliminado_en is null;
$$;

grant execute on function public.personas_con_rol(uuid) to authenticated;

create or replace function public.no_borrar_rol_en_uso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer := public.personas_con_rol(old.id);
begin
  if v_n > 0 then
    raise exception 'No se puede borrar el rol "%": lo tienen % persona(s). Cámbiales el rol primero.', old.nombre, v_n;
  end if;
  return old;
end;
$$;

drop trigger if exists no_borrar_rol_en_uso on public.roles_app;
create trigger no_borrar_rol_en_uso
  before delete on public.roles_app
  for each row execute function public.no_borrar_rol_en_uso();

drop policy if exists "Titular borra roles" on public.roles_app;
create policy "Titular borra roles"
  on public.roles_app for delete
  to authenticated
  using (public.is_titular());

grant delete on public.roles_app to authenticated;
