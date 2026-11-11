-- todo_v70_una_sola_vez.sql
--
-- Junta las migraciones pendientes de la V70 (migration_95 y migration_96)
-- en un solo script, para correrlo una sola vez en Supabase > SQL Editor.
-- Cada una también puede correrse por separado más de una vez sin problema.

-- ============================================================
-- migration_95.sql -- Aviso de cuenta nueva
-- ============================================================

alter table public.app_config
  add column if not exists nuevas_cuentas_correos text[] not null default '{}';

update public.app_config
  set nuevas_cuentas_correos = array['felipe@gusdivecenter.com']
  where nuevas_cuentas_correos = '{}';

-- ============================================================
-- migration_96.sql -- Acceso de "solo ver" (Equipos de clientes y App Interno)
-- ============================================================

update public.profiles
  set permisos = permisos || '{"solo_ver": false}'::jsonb
  where not (permisos ? 'solo_ver');
