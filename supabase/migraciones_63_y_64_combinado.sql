-- =====================================================================
-- migraciones_63_y_64_combinado.sql -- V32: migration_63.sql + migration_64.sql
-- en un solo archivo. Correr completo en Supabase › SQL Editor.
-- Se puede correr más de una vez sin problema.
-- Después, correr carga_datos_v32.sql (la carga de la hoja de cálculo).
-- =====================================================================

-- migration_63.sql  (V32, entregada con v61) -- App Interno: nuestros tanques
--
-- Se puede correr más de una vez. Necesita las migraciones 53 a 62 (V29 a
-- V31) ya corridas.
--
-- (1) Inspección visual de NUESTROS tanques cada 2 años (pedido explícito:
--     "cada 2 años", solo tanques internos -- los de clientes no se tocan).
--     Vence el último día del mes, 24 meses después. Columna nueva
--     inspecciones_visuales.fecha_inspeccion: la fecha real de la
--     inspección cuando no es el día en que se registró (la que se anota
--     sola al registrar el regreso de una prueba hidrostática). Si está
--     vacía se usa el día del registro, como siempre.
--     Las próximas fechas que ya están se recalculan UNA sola vez:
--       - tanque con inspecciones registradas: desde la más reciente;
--       - tanque sin inspecciones (la fecha se puso a mano en Nuevo/Editar
--         tanque, a 12 meses): se le suman 12 meses más.
--
-- (2) Envíos de nuestros tanques a prueba hidrostática (tabla nueva
--     envios_hidrostatica): cuándo salió cada tanque, cuántos días lleva
--     afuera y cuándo regresó.
--
-- (3) registrar_prueba_hidrostatica(): registra la prueba de una vez --
--     se usa al "Registrar regreso" y al "Anotar una prueba ya hecha".
--     Si la prueba sale APROBADA, anota también la inspección visual del
--     tanque (pedido explícito: "cuando se le hace PH a un tanque, por
--     default ya se le hace inspección visual. Entonces la fecha de
--     inspección visual partiría desde ahí").
--
-- (4) Prueba hidrostática RECHAZADA = el tanque se inactiva solo (pedido
--     explícito: "debe de automáticamente inactivarse en el app porque ese
--     tanque ya no se puede usar"). Queda anotado el motivo. Su historial
--     no se toca; el Titular lo puede editar y reactivar.
--
-- (5) El código de un tanque solo no se puede repetir entre tanques
--     ACTIVOS (antes, entre todos). Así un tanque nuevo puede usar el
--     código de uno dado de baja, y cada uno conserva su historial aparte
--     (opción B, aprobada).
--
-- (6) Permisos nuevos para REGISTRAR (pedido explícito: "agrégame permisos
--     para yo dar de registrar inspección visual, prueba hidrostáticas y
--     mantenimiento de reguladores"): inspeccion_registrar,
--     hidrostatica_registrar, mantenimiento_registrar. Empiezan APAGADOS
--     para todos ("no, quítalo y yo se lo pongo"): hasta que el Titular se
--     los dé, solo él puede registrar. Los permisos de siempre
--     (registrar_inspeccion, etc.) quedan para VER esas pantallas.
--
-- (7) Formatear registros: opción nueva "Solicitudes al almacén" (pedido
--     explícito). "Pruebas hidrostáticas" ahora borra también los envíos.

-- Marca para lo que solo debe pasar una vez aunque se corra de nuevo.
create table if not exists public.migraciones_hechas (
  nombre text primary key,
  hecho_en timestamptz not null default now()
);
alter table public.migraciones_hechas enable row level security;

-- (1) ------------------------------------------------------------------
alter table public.inspecciones_visuales add column if not exists fecha_inspeccion date;

create or replace function public.recalcular_proxima_inspeccion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha date;
  v_proxima date;
begin
  if new.tanque_id is not null then
    v_fecha := coalesce(new.fecha_inspeccion, (new.created_at at time zone 'America/Santo_Domingo')::date);
    v_proxima := (date_trunc('month', v_fecha) + interval '25 months' - interval '1 day')::date;
    -- greatest: anotar una inspección vieja no echa para atrás una fecha
    -- más nueva que ya tenía el tanque.
    update public.tanques_alquiler
      set proxima_inspeccion = greatest(proxima_inspeccion, v_proxima)
      where id = new.tanque_id;
  end if;
  return null;
end;
$$;

-- La vista se rehace (drop + create, nunca create or replace) para que
-- traiga la columna nueva.
drop view if exists public.inspecciones_con_nombre;
create view public.inspecciones_con_nombre
  with (security_invoker = on) as
  select i.*, coalesce(i.nombre_usuario_snapshot, p.full_name) as full_name
  from public.inspecciones_visuales i
  left join public.profiles p on p.id = i.user_id
  order by i.created_at desc;
grant select on public.inspecciones_con_nombre to authenticated;

drop trigger if exists trg_proxima_inspeccion on public.inspecciones_visuales;
create trigger trg_proxima_inspeccion
  after insert on public.inspecciones_visuales
  for each row execute function public.recalcular_proxima_inspeccion();

do $$
begin
  if not exists (select 1 from public.migraciones_hechas where nombre = 'v32_inspeccion_cada_2_anios') then
    update public.tanques_alquiler t
      set proxima_inspeccion = (date_trunc('month', x.ultima) + interval '25 months' - interval '1 day')::date
      from (
        select tanque_id,
               max(coalesce(fecha_inspeccion, (created_at at time zone 'America/Santo_Domingo')::date)) as ultima
        from public.inspecciones_visuales
        where tanque_id is not null
        group by tanque_id
      ) x
      where t.id = x.tanque_id;

    update public.tanques_alquiler t
      set proxima_inspeccion = (t.proxima_inspeccion + interval '12 months')::date
      where t.proxima_inspeccion is not null
        and not exists (select 1 from public.inspecciones_visuales i where i.tanque_id = t.id);

    insert into public.migraciones_hechas (nombre) values ('v32_inspeccion_cada_2_anios');
  end if;
end $$;

-- (2) ------------------------------------------------------------------
create table if not exists public.envios_hidrostatica (
  id uuid primary key default gen_random_uuid(),
  tanque_id uuid not null references public.tanques_alquiler(id) on delete cascade,
  tanque_codigo_snapshot text,
  fecha_envio date not null,
  nota text,
  fecha_regreso date,
  prueba_id uuid references public.pruebas_hidrostaticas(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  nombre_usuario_snapshot text,
  user_regreso_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (fecha_regreso is null or fecha_regreso >= fecha_envio)
);

create index if not exists envios_hidrostatica_tanque_idx on public.envios_hidrostatica (tanque_id);
create index if not exists envios_hidrostatica_prueba_idx on public.envios_hidrostatica (prueba_id);
-- Un tanque no puede estar "afuera" dos veces a la vez.
create unique index if not exists envios_hidrostatica_un_abierto
  on public.envios_hidrostatica (tanque_id) where fecha_regreso is null;

create or replace function public.puede_registrar_hidrostatica()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'hidrostatica_registrar')::boolean from public.profiles where id = auth.uid()), false);
$$;

alter table public.envios_hidrostatica enable row level security;

drop policy if exists "Logueados ven envios a hidrostatica" on public.envios_hidrostatica;
create policy "Logueados ven envios a hidrostatica"
  on public.envios_hidrostatica for select
  to authenticated
  using (true);

drop policy if exists "Permiso hidrostatica_registrar envia tanques" on public.envios_hidrostatica;
create policy "Permiso hidrostatica_registrar envia tanques"
  on public.envios_hidrostatica for insert
  to authenticated
  with check (
    public.puede_registrar_hidrostatica()
    and (user_id = auth.uid() or public.is_titular() or public.is_admin())
  );

drop policy if exists "Titular o Admin anulan envios" on public.envios_hidrostatica;
create policy "Titular o Admin anulan envios"
  on public.envios_hidrostatica for delete
  to authenticated
  using (public.is_titular() or public.is_admin());

grant select, insert, delete on public.envios_hidrostatica to authenticated;

-- (3) ------------------------------------------------------------------
create or replace function public.registrar_prueba_hidrostatica(
  p_tanque_id uuid,
  p_fecha_prueba date,
  p_resultado text,
  p_nota text default null,
  p_envio_id uuid default null,
  p_fecha_regreso date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_codigo text;
  v_prueba uuid;
  v_envio public.envios_hidrostatica;
begin
  if auth.uid() is null or not public.puede_registrar_hidrostatica() then
    raise exception 'No tienes permiso para registrar pruebas hidrostáticas.';
  end if;
  if p_resultado not in ('Aprobado', 'Rechazado') then
    raise exception 'Resultado no válido.';
  end if;

  select full_name into v_nombre from public.profiles where id = auth.uid();
  select codigo into v_codigo from public.tanques_alquiler where id = p_tanque_id;
  if v_codigo is null then
    raise exception 'No se encontró el tanque.';
  end if;

  if p_envio_id is not null then
    select * into v_envio from public.envios_hidrostatica where id = p_envio_id for update;
    if v_envio.id is null then
      raise exception 'No se encontró el envío.';
    end if;
    if v_envio.fecha_regreso is not null then
      raise exception 'Ese tanque ya tiene registrado su regreso.';
    end if;
    if p_fecha_regreso is null or p_fecha_regreso < v_envio.fecha_envio then
      raise exception 'La fecha de regreso no puede ser antes del envío.';
    end if;
  end if;

  insert into public.pruebas_hidrostaticas
    (user_id, nombre_usuario_snapshot, tanque_id, tanque_codigo_snapshot, fecha_prueba, resultado, nota)
  values
    (auth.uid(), v_nombre, p_tanque_id, v_codigo, date_trunc('month', p_fecha_prueba)::date, p_resultado, nullif(trim(p_nota), ''))
  returning id into v_prueba;

  if p_envio_id is not null then
    update public.envios_hidrostatica
      set fecha_regreso = p_fecha_regreso, prueba_id = v_prueba, user_regreso_id = auth.uid()
      where id = p_envio_id;
  end if;

  if p_resultado = 'Aprobado' then
    insert into public.inspecciones_visuales
      (user_id, nombre_usuario_snapshot, tanque_id, tanque_codigo_snapshot, resultado, nota, fecha_inspeccion)
    values
      (auth.uid(), v_nombre, p_tanque_id, v_codigo, 'Aprobado', 'Hecha junto con la prueba hidrostática.',
       coalesce(p_fecha_regreso, date_trunc('month', p_fecha_prueba)::date));
  end if;

  return v_prueba;
end;
$$;

grant execute on function public.registrar_prueba_hidrostatica(uuid, date, text, text, uuid, date) to authenticated;

-- (4) ------------------------------------------------------------------
alter table public.tanques_alquiler add column if not exists motivo_inactivo text;
alter table public.tanques_alquiler add column if not exists inactivado_en timestamptz;

create or replace function public.inactivar_tanque_rechazado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.resultado = 'Rechazado'
     and new.tanque_id is not null
     and (tg_op = 'INSERT' or old.resultado is distinct from new.resultado) then
    update public.tanques_alquiler
      set activo = false,
          inactivado_en = now(),
          motivo_inactivo = 'Rechazado en prueba hidrostática (' || to_char(new.fecha_prueba, 'MM/YYYY') || ')'
      where id = new.tanque_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_inactivar_tanque_rechazado on public.pruebas_hidrostaticas;
create trigger trg_inactivar_tanque_rechazado
  after insert or update of resultado on public.pruebas_hidrostaticas
  for each row execute function public.inactivar_tanque_rechazado();

-- (5) ------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.tanques_alquiler'::regclass
      and con.contype = 'u'
      and con.conkey = array[(select attnum from pg_attribute
                              where attrelid = 'public.tanques_alquiler'::regclass and attname = 'codigo')]::smallint[]
  loop
    execute format('alter table public.tanques_alquiler drop constraint %I', c.conname);
  end loop;
end $$;

create unique index if not exists tanques_alquiler_codigo_activo_unico
  on public.tanques_alquiler (codigo) where activo;

-- (6) ------------------------------------------------------------------
drop policy if exists "Permiso registrar_inspeccion inserta" on public.inspecciones_visuales;
drop policy if exists "Permiso inspeccion_registrar inserta" on public.inspecciones_visuales;
create policy "Permiso inspeccion_registrar inserta"
  on public.inspecciones_visuales for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'inspeccion_registrar')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso registrar_mantenimiento inserta" on public.mantenimientos_reguladores;
drop policy if exists "Permiso mantenimiento_registrar inserta" on public.mantenimientos_reguladores;
create policy "Permiso mantenimiento_registrar inserta"
  on public.mantenimientos_reguladores for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'mantenimiento_registrar')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso registrar_hidrostatica inserta" on public.pruebas_hidrostaticas;
drop policy if exists "Permiso hidrostatica_registrar inserta" on public.pruebas_hidrostaticas;
create policy "Permiso hidrostatica_registrar inserta"
  on public.pruebas_hidrostaticas for insert
  to authenticated
  with check (public.puede_registrar_hidrostatica());

-- (7) ------------------------------------------------------------------
drop function if exists public.formatear_registros(boolean, boolean, boolean, boolean, boolean, boolean);
create or replace function public.formatear_registros(
  p_borrar_salidas        boolean default false,
  p_borrar_llenados       boolean default false,
  p_borrar_inspecciones   boolean default false,
  p_borrar_hidrostaticas  boolean default false,
  p_borrar_mantenimientos boolean default false,
  p_borrar_compresores    boolean default false,
  p_borrar_solicitudes    boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_titular() then
    raise exception 'Solo el Titular puede formatear los registros.';
  end if;

  if p_borrar_salidas then
    delete from public.salidas where true;
    alter sequence public.salidas_folio_seq restart with 1;
  end if;

  if p_borrar_llenados then
    delete from public.llenados_tanques where true;
    alter sequence public.llenados_folio_seq restart with 1;
  end if;

  if p_borrar_inspecciones then
    delete from public.inspecciones_visuales where true;
  end if;

  if p_borrar_hidrostaticas then
    delete from public.envios_hidrostatica where true;
    delete from public.pruebas_hidrostaticas where true;
  end if;

  if p_borrar_mantenimientos then
    delete from public.mantenimientos_reguladores where true;
  end if;

  if p_borrar_compresores then
    delete from public.mantenimientos_compresores where true;
  end if;

  if p_borrar_solicitudes then
    delete from public.solicitudes_almacen_items where true;
    delete from public.solicitudes_almacen where true;
    alter sequence public.solicitudes_almacen_folio_seq restart with 1;
  end if;
end;
$$;

grant execute on function public.formatear_registros(boolean, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;


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
