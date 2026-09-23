-- Migration 13: plantilla de permisos por defecto para nuevos Administradores.
--
-- Punto 12 del feedback de v14 (22-sep-2026): hoy el rol Administrador no
-- da acceso automático a ninguna de las casillas de "Usuarios y permisos"
-- (Reportes/Catálogo/Historial/.../Catálogo-Registrar) -- es 100% por
-- persona, igual que un Usuario normal. El Titular pidió poder controlar
-- eso. Decisión confirmada con el usuario (AskUserQuestion): al marcar a
-- alguien como Administrador, se le PRE-MARCAN automáticamente los
-- permisos que el Titular haya dejado activados en esta plantilla -- no
-- le quita nada de lo que ya tuviera, y sigue siendo editable persona por
-- persona después, exactamente como hoy.
--
-- Esta plantilla NO se aplica retroactivamente a quienes ya son
-- Administrador -- solo la próxima vez que alguien pase de Usuario a
-- Administrador (ver app/admin/usuarios/lista-client.js → cambiarRol()).
alter table public.app_config
  add column if not exists permisos_default_admin jsonb not null default '{}'::jsonb;
