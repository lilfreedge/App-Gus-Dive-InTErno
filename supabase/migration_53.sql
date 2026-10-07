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
