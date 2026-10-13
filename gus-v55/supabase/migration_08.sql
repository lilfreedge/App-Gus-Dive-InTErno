-- ============================================================
-- GUS DIVE - Migración 08 (V6): permiso "Compresores" y orden
-- personalizado del menú superior (drag & drop).
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- (Es seguro correrlo sobre tu proyecto ya existente, no borra nada.)
-- ============================================================

-- 1) Nuevo permiso "compresores" en profiles.permisos, para que el
-- Titular pueda dar/quitar acceso a esa sección por persona (antes
-- era pública para cualquier usuario logueado).
alter table public.profiles alter column permisos set default
  '{"reportes": false, "catalogo": true, "historial": false, "changelog": false,
    "manual": false, "movimientos": false, "facturacion": false,
    "registrar_inspeccion": false, "registrar_llenado": false,
    "registrar_mantenimiento": false, "catalogo_codigo": false,
    "catalogo_regulador": false, "catalogo_tanque": false,
    "compresores": false}'::jsonb;

update public.profiles
  set permisos = permisos || '{"compresores": false}'::jsonb
  where not (permisos ? 'compresores');

-- El Titular ya tiene acceso total sin importar `permisos` (ver
-- lib/roles.js tieneAcceso), así que no hace falta activarlo para
-- nadie en particular — cada quien lo recibe cuando tú lo marques en
-- Administración > Usuarios y permisos.

-- 2) Orden personalizado del menú superior (drag & drop). Guarda un
-- arreglo de hrefs en el orden que cada usuario eligió arrastrando los
-- botones. "Inicio" nunca se guarda aquí — siempre va primero y no se
-- puede reordenar (ver lib/nav.js).
alter table public.profiles add column if not exists orden_menu jsonb;

-- 3) Número de serie en el catálogo de Tanques de alquiler (igual que
-- ya existe "serie" en Reguladores de alquiler desde la migración 07).
alter table public.tanques_alquiler add column if not exists serie text;

-- Cada quien edita su propio orden_menu, igual que su nombre o su
-- menú personalizado.
drop policy if exists "Cada quien edita su propio orden de menú" on public.profiles;
create policy "Cada quien edita su propio orden de menú"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- No hace falta ningún paso manual adicional — todos empiezan con
-- Compresores desactivado (lo activas tú donde corresponda), con el
-- menú en su orden normal hasta que cada quien lo reordene, y los
-- tanques que ya existan en el catálogo simplemente no tendrán número
-- de serie hasta que lo agregues editándolos.
-- ============================================================
