-- migraciones_51_a_53_combinado.sql
-- Las 3 migraciones nuevas de la V29, en orden, en un solo archivo.
-- Equivale a correr migration_51.sql, migration_52.sql y migration_53.sql una tras otra.
-- Se puede correr más de una vez.


-- ============================================================
-- migration_51.sql
-- ============================================================

-- migration_51.sql
--
-- Arregla que los mantenimientos de reguladores (App Interno) salieran
-- siempre con "Limpieza ultrasonido: No · Presión intermedia: No ·
-- O-rings: Ninguno", sin importar lo que se marcó al registrarlos -- en la
-- lista de Mantenimiento, en Movimientos y en los reportes (PDF, Excel,
-- vista previa y el "Reporte instantáneo"/semanal por correo). Pedido
-- explícito: "arreglalo para prox actualizacion" (bug del Reporte
-- instantáneo con contenido incorrecto, columnas viejas).
--
-- Causa: el mismo gotcha de Postgres de siempre. La vista
-- public.mantenimientos_con_nombre (select m.*, ...) se creó en
-- migration_06.sql y nunca se volvió a crear; la lista de chequeo
-- (limpieza_ultrasonido, presion_intermedia, o_rings) se agregó DESPUÉS a
-- la tabla, en migration_10.sql, con un simple alter table -- así que la
-- vista nunca la vio. Todo lo que lee desde la vista recibía esas
-- columnas vacías. El dato sí está bien guardado en la tabla (la pantalla
-- de "Editar" lee la tabla directo, por eso ahí se ve bien).
--
-- Revisadas de paso todas las demás vistas del proyecto: esta era la
-- única con columnas nuevas sin recrear.
--
-- Misma definición exacta de migration_06.sql, ahora con drop + create
-- (nunca create or replace para recrear, ver estado-proyecto.md).

drop view if exists public.mantenimientos_con_nombre;
create view public.mantenimientos_con_nombre
  with (security_invoker = on) as
  select m.*, coalesce(m.nombre_usuario_snapshot, p.full_name) as full_name
  from public.mantenimientos_reguladores m
  join public.profiles p on p.id = m.user_id
  order by m.created_at desc;


-- ============================================================
-- migration_52.sql
-- ============================================================

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


-- ============================================================
-- migration_53.sql
-- ============================================================

-- migration_53.sql
--
-- 1) "Prueba hidrostática" de los tanques de alquiler (App Interno, V29).
--    Pedido explícito: "quiero agregar seguimiento de prueba hidrostaticas
--    para los tanques que tengamos... cada 5 años. Me interesa que aparezca
--    notificaciones, al igual que tenemos para mantenimiento de reg e
--    inspeccion visual". Mismo patrón que inspecciones_visuales
--    (migration_06.sql), con dos diferencias pedidas/confirmadas:
--    - se anota la FECHA DE LA PRUEBA (no solo la de registro), para poder
--      cargar la última prueba real de los tanques que ya existen, aunque
--      haya sido hace años;
--    - permiso propio para registrarlas: registrar_hidrostatica ("claro
--      si, ponmele un permiso a eso"). Editar/anular: Titular o
--      Administrador, igual que las inspecciones (y por eso también se
--      pueden restaurar desde Historial).
--    La próxima prueba (tanques_alquiler.proxima_hidrostatica) = la prueba
--    más reciente de ese tanque + 5 años.
--
-- 2) BUG corregido de paso (encontrado al armar lo de arriba): la próxima
--    inspección visual y el próximo mantenimiento de un regulador los
--    actualizaba el navegador directo en tanques_alquiler /
--    reguladores_alquiler, pero esas tablas solo dejan editar al Titular,
--    a los Administradores o a quien tiene permiso de editar el catálogo.
--    Un empleado con solo el permiso de registrar inspecciones o
--    mantenimientos registraba bien, pero la fecha nunca se movía (la base
--    de datos lo ignoraba sin dar error) -- el tanque/regulador seguía
--    saliendo como vencido. Ahora esas dos fechas las pone la propia base
--    de datos al registrar (triggers con security definer), sin depender
--    de quién lo hizo. Mismas reglas y mismo momento que antes: al
--    registrar una inspección, +12 meses; al registrar un mantenimiento,
--    +8 meses -- nada más cambia (editar o anular un registro sigue sin
--    mover la fecha, igual que antes).
--
--    La próxima prueba hidrostática, en cambio, sí se recalcula al
--    registrar, editar o anular una prueba (siempre = la prueba con la
--    fecha más reciente + 5 años), porque la fecha de la prueba se escribe
--    a mano y se puede corregir.
--
-- Independiente de las anteriores. Se puede correr más de una vez.

alter table public.tanques_alquiler add column if not exists proxima_hidrostatica date;

create sequence if not exists public.pruebas_hidrostaticas_folio_seq;

create table if not exists public.pruebas_hidrostaticas (
  id uuid primary key default gen_random_uuid(),
  folio integer not null default nextval('public.pruebas_hidrostaticas_folio_seq') unique,
  user_id uuid references auth.users(id) on delete set null,
  nombre_usuario_snapshot text,
  tanque_id uuid references public.tanques_alquiler(id) on delete set null,
  tanque_codigo_snapshot text,
  fecha_prueba date not null,
  resultado text not null check (resultado in ('Aprobado', 'Rechazado')),
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists pruebas_hidrostaticas_tanque_idx on public.pruebas_hidrostaticas (tanque_id);

alter table public.pruebas_hidrostaticas enable row level security;

drop policy if exists "Los usuarios logueados ven pruebas hidrostaticas" on public.pruebas_hidrostaticas;
create policy "Los usuarios logueados ven pruebas hidrostaticas"
  on public.pruebas_hidrostaticas for select
  to authenticated
  using (true);

drop policy if exists "Permiso registrar_hidrostatica inserta" on public.pruebas_hidrostaticas;
create policy "Permiso registrar_hidrostatica inserta"
  on public.pruebas_hidrostaticas for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'registrar_hidrostatica')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo Titular/Admin editan pruebas hidrostaticas" on public.pruebas_hidrostaticas;
create policy "Solo Titular/Admin editan pruebas hidrostaticas"
  on public.pruebas_hidrostaticas for update
  to authenticated
  using (public.is_titular() or public.is_admin());

drop policy if exists "Solo Titular/Admin borran pruebas hidrostaticas" on public.pruebas_hidrostaticas;
create policy "Solo Titular/Admin borran pruebas hidrostaticas"
  on public.pruebas_hidrostaticas for delete
  to authenticated
  using (public.is_titular() or public.is_admin());

drop view if exists public.pruebas_hidrostaticas_con_nombre;
create view public.pruebas_hidrostaticas_con_nombre
  with (security_invoker = on) as
  select h.*, coalesce(h.nombre_usuario_snapshot, p.full_name) as full_name
  from public.pruebas_hidrostaticas h
  left join public.profiles p on p.id = h.user_id
  order by h.fecha_prueba desc, h.created_at desc;

-- ---------------------------------------------------------------
-- Recalcular fechas "próximas" desde la base de datos
-- ---------------------------------------------------------------

create or replace function public.recalcular_proxima_hidrostatica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  v_ids := array_remove(array[
    case when tg_op <> 'INSERT' then old.tanque_id end,
    case when tg_op <> 'DELETE' then new.tanque_id end
  ], null);
  update public.tanques_alquiler t
    set proxima_hidrostatica = (
      select (max(h.fecha_prueba) + interval '5 years')::date
      from public.pruebas_hidrostaticas h
      where h.tanque_id = t.id
    )
    where t.id = any(v_ids);
  return null;
end;
$$;

drop trigger if exists trg_proxima_hidrostatica on public.pruebas_hidrostaticas;
create trigger trg_proxima_hidrostatica
  after insert or update or delete on public.pruebas_hidrostaticas
  for each row execute function public.recalcular_proxima_hidrostatica();

-- Inspección visual: al registrar, +12 meses desde la fecha de registro
-- (lo mismo que hacía el navegador con proximaInspeccion() de
-- lib/fechas.js, que usa la fecha UTC).
create or replace function public.recalcular_proxima_inspeccion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tanque_id is not null then
    update public.tanques_alquiler
      set proxima_inspeccion = ((new.created_at at time zone 'UTC')::date + interval '12 months')::date
      where id = new.tanque_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_proxima_inspeccion on public.inspecciones_visuales;
create trigger trg_proxima_inspeccion
  after insert on public.inspecciones_visuales
  for each row execute function public.recalcular_proxima_inspeccion();

-- Mantenimiento de reguladores: al registrar, +8 meses (lo mismo que hacía
-- el navegador con proximoMantenimiento()).
create or replace function public.recalcular_proximo_mantenimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.regulador_id is not null then
    update public.reguladores_alquiler
      set proximo_mantenimiento = ((new.created_at at time zone 'UTC')::date + interval '8 months')::date
      where id = new.regulador_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_proximo_mantenimiento on public.mantenimientos_reguladores;
create trigger trg_proximo_mantenimiento
  after insert on public.mantenimientos_reguladores
  for each row execute function public.recalcular_proximo_mantenimiento();

