-- =====================================================================
-- migraciones_67_a_70_combinado.sql -- V37 (entrega v67). TODO EN UNO.
--
-- Como la V35 y la V36 no se llegaron a instalar, aquí van juntas las
-- cuatro migraciones que faltan, en orden:
--   67  Facturar llenados con el permiso "Facturación" (no solo el Titular)
--   68  Compresores: la columna proxima_inspeccion (la lista salía vacía)
--   69  Acceso a Viajes/Buceos en "Accesos a apps"
--   70  V37: fecha automática y horómetro en compresores, permiso "Ver
--       historial de mantenimientos", WhatsApp en el perfil,
--       recordatorios de compresores, avisos a técnicos y acceso a
--       Alquiler
--
-- Se puede correr aunque ya hayas corrido alguna de ellas (por ejemplo la
-- 68), y más de una vez, sin problema. Al final sale una tabla con el
-- resumen de la 70.
-- =====================================================================


-- ####################################################################
-- migration_67.sql
-- ####################################################################
-- =====================================================================
-- migration_67.sql -- Arreglo: facturar llenados de tanque. Se puede correr
-- sola, antes o después de la 66, y más de una vez sin problema. No hace
-- falta instalar código nuevo: el arreglo funciona con la versión que ya
-- está instalada.
--
-- Problema (reportado 23-oct-2026, con foto de Equipos › Llenados de
-- tanque): "solamente me funciona a mí el botón de facturar los llenados.
-- Intenté con otros usuarios y no funciona, o sea, deja escribir pero no se
-- guarda."
--
-- Causa: desde migration_02.sql, la base de datos solo deja cambiar un
-- llenado a los Administradores ("Solo administradores editan llenados").
-- El permiso "Facturación de llenado" mostraba el botón, pero nunca se le
-- dio permiso en la base de datos para guardar (migration_06.sql lo dejó
-- anotado y no lo hizo). Al guardar, la base de datos no cambiaba nada y
-- tampoco avisaba, así que parecía que guardaba.
--
-- Arreglo: quien tiene "Facturación de llenado" puede marcar un llenado
-- como facturado (o quitarlo) y poner su No. de factura. Solo eso: si
-- intenta cambiar cualquier otra cosa del llenado (cantidad, gas, nota...),
-- la base de datos no lo deja. Editar y anular siguen siendo del Titular y
-- los Administradores.
-- =====================================================================

drop policy if exists "Permiso facturacion factura llenados" on public.llenados_tanques;
create policy "Permiso facturacion factura llenados"
  on public.llenados_tanques for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'facturacion')::boolean from public.profiles where id = auth.uid()), false)
  );

-- Quien no es Titular ni Administrador solo puede cambiar la facturación.
create or replace function public.llenado_solo_facturacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_titular() or public.is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - 'facturado' - 'factura_no') is distinct from (to_jsonb(old) - 'facturado' - 'factura_no') then
    raise exception 'Solo puedes cambiar la facturación de este llenado (facturado y No. de factura).';
  end if;
  return new;
end;
$$;

drop trigger if exists llenado_solo_facturacion on public.llenados_tanques;
create trigger llenado_solo_facturacion
  before update on public.llenados_tanques
  for each row execute function public.llenado_solo_facturacion();

-- Resumen (el SQL Editor de Supabase no muestra los avisos).
select
  (select count(*) from public.profiles where coalesce((permisos->>'facturacion')::boolean, false)) as personas_con_facturacion,
  (select count(*) from public.llenados_tanques where not facturado) as llenados_por_facturar;

-- ####################################################################
-- migration_68.sql
-- ####################################################################
-- =====================================================================
-- migration_68.sql -- Arreglo: Equipos › Compresores sale vacío. Se puede
-- correr sola y más de una vez sin problema. No hace falta instalar
-- código nuevo.
--
-- Problema (reportado 23-oct-2026, con foto; ya había pasado el 21-oct):
-- "acabo de registrar uno y no me aparece, entonces si voy a registrarlo
-- otra vez me dice que ese código existe". O sea, el compresor SÍ se
-- guarda, pero la pantalla no lo muestra.
--
-- Causa más probable: a la tabla de compresores le falta la columna
-- "proxima_inspeccion" (migration_15.sql, que parece que no se corrió).
-- La pantalla de Compresores pide esa columna; si no existe, la consulta
-- falla y la pantalla dice "Todavía no hay compresores registrados",
-- aunque sí los haya. Registrar uno nuevo no usa esa columna, por eso sí
-- se guarda. Por si acaso, también se vuelve a poner el permiso de ver
-- compresores.
--
-- Los compresores que se habían registrado antes NO se perdieron: con
-- esto vuelven a salir.
-- =====================================================================

alter table public.compresores add column if not exists proxima_inspeccion date;

drop policy if exists "Los usuarios logueados ven compresores" on public.compresores;
create policy "Los usuarios logueados ven compresores"
  on public.compresores for select
  to authenticated
  using (true);

-- Resumen: los compresores que hay guardados.
select
  count(*) as compresores_guardados,
  string_agg(codigo || case when activo then '' else ' (inactivo)' end, ', ' order by codigo) as codigos
from public.compresores;

-- ####################################################################
-- migration_69.sql
-- ####################################################################
-- =====================================================================
-- migration_69.sql -- Acceso a la app de Viajes/Buceos en "Accesos a apps"
-- (pedido explícito, 23-oct-2026: "NECESITO AGREGAR AQUÍ EL ACCESO AL APP
-- DE VIAJES"; maqueta-acceso-viajes.html, "ok cámbialo"). Se puede correr
-- más de una vez sin problema.
--
-- Hasta ahora la tarjeta de Viajes/Buceos le salía a todo el mundo. Desde
-- esta versión solo le sale a quien tenga el acceso (el Titular siempre).
-- Para no quitársela a nadie de golpe, se le enciende a todas las cuentas
-- que ya existen (igual que se hizo con el acceso a App Interno en
-- migration_28.sql); las cuentas nuevas nacen sin él. Se quita o se da en
-- "Accesos a apps".
-- =====================================================================

update public.profiles
   set permisos = coalesce(permisos, '{}'::jsonb) || jsonb_build_object('acceso_viajes', true)
 where not (coalesce(permisos, '{}'::jsonb) ? 'acceso_viajes');

-- Resumen.
select
  (select count(*) from public.profiles where not es_titular and eliminado_en is null) as cuentas,
  (select count(*) from public.profiles where not es_titular and eliminado_en is null
     and coalesce((permisos->>'acceso_viajes')::boolean, false)) as con_acceso_a_viajes;

-- ####################################################################
-- migration_70.sql
-- ####################################################################
-- =====================================================================
-- migration_70.sql -- V37. Se puede correr más de una vez sin problema.
-- Va después de la 66 y de la 68 (usa compresores.proxima_inspeccion y
-- las políticas de compresores de la 66).
--
-- (1) Mantenimiento de compresor:
--     - La FECHA la pone la base de datos al guardar (hora de República
--       Dominicana). Nadie la escoge ni la cambia después, ni al editar
--       (pedido explícito: "quita ese campo... para evitar que registren
--       cosas falsas", opción A). Lo que se carga por el SQL Editor
--       (cargas de datos) conserva la fecha que trae.
--     - El HORÓMETRO no puede ser menor que el último registrado de ese
--       compresor (el Titular sí puede, por si cambian el horómetro).
--     - Columnas nuevas: aceite_echado ("¿Se le echó aceite?") y
--       horometro_leido (lo que leyó la foto; si alguien lo cambió a mano,
--       en el historial sale marcado).
-- (2) Permiso nuevo "compresores_historial" (Ver historial de
--     mantenimientos): apagado para todos, encendido solo para los
--     administradores. El Titular siempre lo tiene.
-- (3) Perfil: teléfono (WhatsApp) y la vista personalizada del historial
--     de compresores.
-- (4) Recordatorios de compresores. El primero es el aviso de inspección
--     cada 14 días que ya existía (encendido, se puede editar o borrar).
-- (5) Avisos a técnicos (cada vez que alguien toca "Avisar por WhatsApp").
-- (6) Acceso a la app de Alquiler: encendido para las cuentas que ya
--     existen (igual que Viajes en la 69).
-- =====================================================================

-- (1) ------------------------------------------------------------------
alter table public.mantenimientos_compresores add column if not exists aceite_echado boolean;
alter table public.mantenimientos_compresores add column if not exists horometro_leido numeric;

create or replace function public.mant_compresor_fecha_y_horometro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max numeric;
begin
  -- SQL Editor / cargas de datos: se respeta lo que traen.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.fecha := (now() at time zone 'America/Santo_Domingo')::date;
    if not public.is_titular() and new.compresor_id is not null then
      select max(horometro) into v_max
        from public.mantenimientos_compresores
       where compresor_id = new.compresor_id;
      if v_max is not null and new.horometro < v_max then
        raise exception 'El horómetro (% h) no puede ser menor que el último registrado de este compresor (% h).',
          new.horometro, v_max;
      end if;
    end if;
  else
    -- La fecha no se cambia nunca.
    new.fecha := old.fecha;
  end if;
  return new;
end;
$$;

drop trigger if exists mant_compresor_fecha_y_horometro on public.mantenimientos_compresores;
create trigger mant_compresor_fecha_y_horometro
  before insert or update on public.mantenimientos_compresores
  for each row execute function public.mant_compresor_fecha_y_horometro();

-- La vista trae las columnas nuevas (las columnas de una vista se fijan al
-- crearla, por eso hay que volver a crearla).
drop view if exists public.mantenimientos_compresores_con_nombre;
create view public.mantenimientos_compresores_con_nombre
  with (security_invoker = on) as
  select m.*, coalesce(m.nombre_usuario_snapshot, p.full_name) as full_name
  from public.mantenimientos_compresores m
  join public.profiles p on p.id = m.user_id
  order by m.created_at desc;

-- (2) ------------------------------------------------------------------
update public.profiles
   set permisos = coalesce(permisos, '{}'::jsonb)
                  || jsonb_build_object('compresores_historial', coalesce(is_admin, false))
 where not (coalesce(permisos, '{}'::jsonb) ? 'compresores_historial');

-- (3) ------------------------------------------------------------------
alter table public.profiles add column if not exists telefono text;
alter table public.profiles add column if not exists vista_historial_compresores jsonb;

-- (4) ------------------------------------------------------------------
do $$
declare
  v_nueva boolean := to_regclass('public.recordatorios_compresores') is null;
begin
  create table if not exists public.recordatorios_compresores (
    id uuid primary key default gen_random_uuid(),
    titulo text not null,
    cada integer not null check (cada > 0),
    unidad text not null default 'dias' check (unidad in ('dias', 'horas')),
    -- null = todos los compresores; '{}' = no va con ningún compresor
    compresor_ids uuid[],
    reinicia text not null default 'hecho'
      check (reinicia in ('Inspección', 'Mantenimiento preventivo', 'Mantenimiento correctivo', 'hecho')),
    avisar_antes integer not null default 2 check (avisar_antes >= 0),
    usuario_ids uuid[] not null default '{}',
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    creado_por uuid references public.profiles(id) on delete set null,
    creado_por_nombre text,
    updated_at timestamptz
  );

  -- El primero: el aviso de inspección cada 14 días que ya tenía el app.
  -- Solo la primera vez (si lo borras y vuelves a correr esto, no vuelve).
  if v_nueva then
    insert into public.recordatorios_compresores
      (titulo, cada, unidad, compresor_ids, reinicia, avisar_antes, usuario_ids, creado_por_nombre)
    select 'Inspección', 14, 'dias', null, 'Inspección', 2,
           coalesce((select array_agg(p.id order by p.full_name)
                       from public.profiles p
                      where p.eliminado_en is null
                        and (p.es_titular or coalesce((p.permisos->>'compresores')::boolean, false))), '{}'),
           'El app (aviso de cada 14 días)';
  end if;
end;
$$;

create table if not exists public.recordatorios_hechos (
  id uuid primary key default gen_random_uuid(),
  recordatorio_id uuid not null references public.recordatorios_compresores(id) on delete cascade,
  compresor_id uuid references public.compresores(id) on delete cascade,
  hecho_en timestamptz not null default now(),
  user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  nombre_usuario text
);
create index if not exists recordatorios_hechos_rec_idx on public.recordatorios_hechos (recordatorio_id, hecho_en desc);

alter table public.recordatorios_compresores enable row level security;
alter table public.recordatorios_hechos enable row level security;

drop policy if exists "Logueados ven recordatorios" on public.recordatorios_compresores;
create policy "Logueados ven recordatorios" on public.recordatorios_compresores
  for select to authenticated using (true);
drop policy if exists "Titular y admin crean recordatorios" on public.recordatorios_compresores;
create policy "Titular y admin crean recordatorios" on public.recordatorios_compresores
  for insert to authenticated with check (public.is_titular() or public.is_admin());
drop policy if exists "Titular y admin cambian recordatorios" on public.recordatorios_compresores;
create policy "Titular y admin cambian recordatorios" on public.recordatorios_compresores
  for update to authenticated using (public.is_titular() or public.is_admin());
drop policy if exists "Titular y admin borran recordatorios" on public.recordatorios_compresores;
create policy "Titular y admin borran recordatorios" on public.recordatorios_compresores
  for delete to authenticated using (public.is_titular() or public.is_admin());

drop policy if exists "Logueados ven recordatorios hechos" on public.recordatorios_hechos;
create policy "Logueados ven recordatorios hechos" on public.recordatorios_hechos
  for select to authenticated using (true);
-- "Hecho" lo marca quien recibe el recordatorio (o el Titular / un admin).
drop policy if exists "Marcar recordatorio hecho" on public.recordatorios_hechos;
create policy "Marcar recordatorio hecho" on public.recordatorios_hechos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.is_titular() or public.is_admin()
      or exists (select 1 from public.recordatorios_compresores r
                  where r.id = recordatorio_id and auth.uid() = any (r.usuario_ids))
    )
  );
drop policy if exists "Titular y admin borran hechos" on public.recordatorios_hechos;
create policy "Titular y admin borran hechos" on public.recordatorios_hechos
  for delete to authenticated using (public.is_titular() or public.is_admin());

-- (5) ------------------------------------------------------------------
create table if not exists public.avisos_tecnicos (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_equipos(id) on delete cascade,
  tecnico_id uuid references public.profiles(id) on delete set null,
  tecnico_nombre text,
  avisado_por uuid references public.profiles(id) on delete set null default auth.uid(),
  avisado_por_nombre text,
  medio text not null default 'whatsapp',
  created_at timestamptz not null default now()
);
create index if not exists avisos_tecnicos_orden_idx on public.avisos_tecnicos (orden_id, created_at desc);
create index if not exists avisos_tecnicos_tecnico_idx on public.avisos_tecnicos (tecnico_id, created_at desc);

alter table public.avisos_tecnicos enable row level security;
drop policy if exists "Logueados ven avisos a tecnicos" on public.avisos_tecnicos;
create policy "Logueados ven avisos a tecnicos" on public.avisos_tecnicos
  for select to authenticated using (true);
drop policy if exists "Cada quien anota sus avisos" on public.avisos_tecnicos;
create policy "Cada quien anota sus avisos" on public.avisos_tecnicos
  for insert to authenticated with check (avisado_por = auth.uid());

-- (6) ------------------------------------------------------------------
update public.profiles
   set permisos = coalesce(permisos, '{}'::jsonb) || jsonb_build_object('acceso_alquiler', true)
 where not (coalesce(permisos, '{}'::jsonb) ? 'acceso_alquiler');

-- Resumen (el SQL Editor solo muestra la última tabla).
select
  (select count(*) from public.recordatorios_compresores) as recordatorios,
  (select count(*) from public.profiles where coalesce((permisos->>'compresores_historial')::boolean, false)) as con_ver_historial_compresores,
  (select count(*) from public.profiles where coalesce((permisos->>'acceso_alquiler')::boolean, false)) as con_acceso_alquiler,
  (select count(*) from public.avisos_tecnicos) as avisos_a_tecnicos;
