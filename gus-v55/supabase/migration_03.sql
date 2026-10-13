-- ============================================================
-- GUS DIVE - Migración 03: Titular, permisos, folios, catálogo con
-- descripción, motivo libre en salidas, tipo de gas en llenados,
-- y snapshot del nombre para que el historial no cambie con el tiempo.
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- (Es seguro correrlo sobre tu proyecto ya existente, no borra nada.)
-- ============================================================

-- 1) Titular: exactamente UNA persona debe tener esto en true.
-- No se puede forzar "solo uno" con una restricción de base de datos
-- en el plan gratis de Supabase (necesitaría un trigger adicional),
-- así que se controla desde el código de la app: la UI de
-- Administración nunca ofrece la opción de asignar/quitar Titular.
alter table public.profiles add column if not exists es_titular boolean not null default false;

-- Función helper: ¿el usuario actual es el Titular?
create or replace function public.is_titular()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select es_titular from public.profiles where id = auth.uid()), false);
$$;

-- 2) Permisos granulares por usuario (independientes de is_admin).
-- El Titular siempre tiene acceso total sin importar este campo
-- (eso se controla en el código de la app, no aquí).
alter table public.profiles add column if not exists permisos jsonb not null default
  '{"reportes":false,"catalogo":true,"historial":false,"changelog":false}'::jsonb;

-- Solo el Titular puede cambiar es_titular o permisos de otros perfiles.
-- (La política de migración_02 "Un administrador puede editar cualquier
-- perfil" se mantiene para full_name/is_admin; agregamos una capa extra
-- solo para estas dos columnas sensibles vía función de apoyo.)
drop policy if exists "Solo el titular asigna titular y permisos" on public.profiles;
create policy "Solo el titular asigna titular y permisos"
  on public.profiles for update
  to authenticated
  using (public.is_titular() or auth.uid() = id or public.is_admin());

-- Nota: Postgres RLS no puede restringir columna por columna dentro de
-- una misma política UPDATE de forma simple; la restricción real de
-- "solo Titular cambia es_titular/permisos, solo Titular/Admin cambian
-- is_admin, cualquiera cambia su propio full_name" se aplica en el
-- código de la app (Administración y Editar mi perfil), que es lo que
-- ya usa este proyecto para reglas de este tipo (ver lib/roles.js).

-- 3) Folios secuenciales, nunca se reutilizan.
create sequence if not exists public.salidas_folio_seq;
alter table public.salidas add column if not exists folio integer;
alter table public.salidas alter column folio set default nextval('public.salidas_folio_seq');
update public.salidas set folio = nextval('public.salidas_folio_seq') where folio is null;
alter table public.salidas alter column folio set not null;
alter table public.salidas add constraint salidas_folio_unique unique (folio);

create sequence if not exists public.llenados_folio_seq;
alter table public.llenados_tanques add column if not exists folio integer;
alter table public.llenados_tanques alter column folio set default nextval('public.llenados_folio_seq');
update public.llenados_tanques set folio = nextval('public.llenados_folio_seq') where folio is null;
alter table public.llenados_tanques alter column folio set not null;
alter table public.llenados_tanques add constraint llenados_folio_unique unique (folio);

-- 4) Catálogo: descripción opcional.
alter table public.articulos add column if not exists descripcion text;

-- 5) Motivo de la salida: "Uso interno" / "Garantía" / texto libre ("Otro").
-- La columna motivo ya existía (schema.sql) como text not null; se deja igual.
alter table public.salidas alter column motivo set not null;

-- 6) Tipo de gas en llenados.
alter table public.llenados_tanques add column if not exists tipo_gas text not null default 'Aire';
alter table public.llenados_tanques drop constraint if exists llenados_tipo_gas_check;
alter table public.llenados_tanques add constraint llenados_tipo_gas_check
  check (tipo_gas in ('Aire', 'Nitrox'));

-- 7) Snapshot del nombre de quien registró, tomado en el momento del
-- registro. Así, si esa persona cambia su nombre después en "Editar mi
-- perfil", las salidas/llenados viejos NO cambian de nombre solos.
alter table public.salidas add column if not exists nombre_usuario_snapshot text;
alter table public.llenados_tanques add column if not exists nombre_usuario_snapshot text;

-- Rellena el snapshot para registros existentes con el nombre actual
-- (es lo mejor que se puede hacer retroactivamente).
update public.salidas s set nombre_usuario_snapshot = p.full_name
  from public.profiles p where p.id = s.user_id and s.nombre_usuario_snapshot is null;
update public.llenados_tanques l set nombre_usuario_snapshot = p.full_name
  from public.profiles p where p.id = l.user_id and l.nombre_usuario_snapshot is null;

-- Actualiza las vistas para incluir folio, tipo_gas y usar el snapshot
-- como el nombre a mostrar (con fallback al nombre actual del perfil
-- por si el snapshot viniera vacío en algún registro viejo).
-- Se usa DROP + CREATE (en vez de CREATE OR REPLACE) porque Postgres no
-- permite insertar columnas nuevas en medio de una vista existente,
-- solo agregarlas al final — y aquí cambia el orden por las columnas
-- nuevas agregadas arriba.
drop view if exists public.salidas_con_nombre;
create view public.salidas_con_nombre
  with (security_invoker = on) as
  select s.*, coalesce(s.nombre_usuario_snapshot, p.full_name) as full_name
  from public.salidas s
  join public.profiles p on p.id = s.user_id
  order by s.created_at desc;

drop view if exists public.llenados_con_nombre;
create view public.llenados_con_nombre
  with (security_invoker = on) as
  select l.*, coalesce(l.nombre_usuario_snapshot, p.full_name) as full_name
  from public.llenados_tanques l
  join public.profiles p on p.id = l.user_id
  order by l.created_at desc;

-- 8) El historial de cambios (cambios_historial) no necesita columnas
-- nuevas: ya guarda una copia JSON completa del registro (datos_anteriores),
-- que ahora también incluirá folio/tipo_gas/nombre_usuario_snapshot al
-- venir de las tablas de arriba. Los cambios de nombre de perfil se
-- registran igual, vía lib/audit-client.js, con tabla='profiles'.
--
-- Se amplían sus políticas RLS para el nuevo modelo de permisos:
-- * Ver el historial: administradores, Titular, o cualquier usuario con
--   permisos.historial = true.
-- * Insertar: administradores/Titular (como antes), y además CUALQUIER
--   usuario logueado insertando su propio cambio de nombre
--   (tabla='profiles', registro_id = su propio id, accion='editar') —
--   así "Editar mi perfil" puede loguear sin ser admin.
drop policy if exists "Solo administradores ven el historial de cambios" on public.cambios_historial;
create policy "Ver historial de cambios"
  on public.cambios_historial for select
  to authenticated
  using (
    public.is_admin()
    or public.is_titular()
    or coalesce((select (permisos->>'historial')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Solo administradores registran cambios" on public.cambios_historial;
create policy "Registrar cambios"
  on public.cambios_historial for insert
  to authenticated
  with check (
    public.is_admin()
    or public.is_titular()
    or (tabla = 'profiles' and accion = 'editar' and registro_id = auth.uid())
  );

-- ============================================================
-- ÚLTIMO PASO (hazlo tú, una sola vez):
-- Convierte tu cuenta (la del administrador que ya bootstrapeaste en
-- migración_02) en el Titular. Reemplaza el correo si hace falta:
--
-- update public.profiles set es_titular = true, is_admin = true
--   where id = (select id from auth.users where email = 'felipe@gusdivecenter.com');
--
-- Verifica que solo una fila tenga es_titular = true:
-- select count(*) from public.profiles where es_titular = true;  -- debe dar 1
-- ============================================================
