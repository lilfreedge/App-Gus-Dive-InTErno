-- ============================================================
-- GUS DIVE - Migración 05: permiso "Movimientos", configuración de
-- app (logo de Login), borrar historial (Titular), y "Formatear
-- registros" (borra salidas/llenados y reinicia la numeración).
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- (Es seguro correrlo sobre tu proyecto ya existente, no borra nada
-- por sí solo — las funciones de borrado solo actúan si se llaman.)
-- ============================================================

-- 1) Nuevo permiso granular "movimientos" (mismo patrón que reportes/
-- catalogo/historial/changelog/manual).
alter table public.profiles alter column permisos set default
  '{"reportes":false,"catalogo":true,"historial":false,"changelog":false,"manual":false,"movimientos":false}'::jsonb;

update public.profiles
  set permisos = permisos || '{"movimientos": false}'::jsonb
  where not (permisos ? 'movimientos');

-- 2) Configuración de la app (una sola fila): cuál logo se muestra en
-- Login. Lectura pública porque Login se ve sin haber iniciado sesión;
-- escritura solo para el Titular.
create table if not exists public.app_config (
  id boolean primary key default true,
  logo_login text not null default 'grande' check (logo_login in ('grande', 'chico')),
  constraint app_config_singleton check (id = true)
);

insert into public.app_config (id, logo_login)
  values (true, 'grande')
  on conflict (id) do nothing;

alter table public.app_config enable row level security;

drop policy if exists "Cualquiera puede ver la configuración" on public.app_config;
create policy "Cualquiera puede ver la configuración"
  on public.app_config for select
  to anon, authenticated
  using (true);

drop policy if exists "Solo el Titular cambia la configuración" on public.app_config;
create policy "Solo el Titular cambia la configuración"
  on public.app_config for update
  to authenticated
  using (public.is_titular())
  with check (public.is_titular());

-- 3) Borrar entradas del historial: solo el Titular.
drop policy if exists "Solo el Titular borra historial" on public.cambios_historial;
create policy "Solo el Titular borra historial"
  on public.cambios_historial for delete
  to authenticated
  using (public.is_titular());

-- 4) "Formatear registros": borra TODAS las salidas y llenados, y
-- reinicia la numeración (folio) desde 1. Se expone como una función
-- de base de datos que solo el Titular puede ejecutar (se revisa
-- adentro de la función, no solo en el código de la app, porque esta
-- es una acción irreversible). El historial de cambios (cambios_historial)
-- NO se toca — así queda registro de que esto ocurrió, aunque sea
-- indirectamente (los registros que referencia ya no existirán).
create or replace function public.formatear_registros()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_titular() then
    raise exception 'Solo el Titular puede formatear los registros.';
  end if;

  delete from public.salidas;
  delete from public.llenados_tanques;

  alter sequence public.salidas_folio_seq restart with 1;
  alter sequence public.llenados_folio_seq restart with 1;
end;
$$;

-- ============================================================
-- Nota: no hace falta ningún paso manual adicional después de correr
-- esto — el permiso "movimientos" queda en false para todos por
-- defecto (el Titular lo otorga desde Administración cuando quiera),
-- y el logo de Login queda en "grande" hasta que lo cambies.
-- ============================================================
