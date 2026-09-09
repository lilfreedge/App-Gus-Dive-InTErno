-- ============================================================
-- GUS DIVE - Migración 04: permiso "Manual" y motivo de anulación
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- (Es seguro correrlo sobre tu proyecto ya existente, no borra nada.)
-- ============================================================

-- 1) Nuevo permiso granular "manual" (igual patrón que reportes/catalogo/
-- historial/changelog). El Titular sigue teniendo acceso total sin
-- importar este campo (se controla en el código, ver lib/roles.js).
alter table public.profiles alter column permisos set default
  '{"reportes":false,"catalogo":true,"historial":false,"changelog":false,"manual":false}'::jsonb;

update public.profiles
  set permisos = permisos || '{"manual": false}'::jsonb
  where not (permisos ? 'manual');

-- 2) Motivo de anulación: cuando se borra un registro (salida o llenado)
-- ahora se exige un motivo, que queda anotado junto con el resto del
-- cambio en cambios_historial.
alter table public.cambios_historial add column if not exists motivo text;

-- ============================================================
-- Nada más que hacer: no se agregaron tablas nuevas ni cambiaron
-- políticas RLS existentes (motivo es solo una columna informativa
-- opcional en una tabla que ya tenía sus políticas de select/insert).
-- ============================================================
