-- Migration 12: reportes automáticos con varios "envíos" independientes.
--
-- Antes solo existía UNA lista de destinatarios (reporte_destinatarios) y
-- UNA selección de secciones (reporte_detalles) para todo el reporte
-- semanal/instantáneo. Ahora app_config.reporte_configs guarda una LISTA
-- de envíos, cada uno con su propia lista de destinatarios y su propia
-- selección de secciones -- así el Titular puede, por ejemplo, mandarle a
-- contabilidad solo Facturación y al equipo de mantenimiento solo
-- Inspecciones + Mantenimientos, en correos separados, con un solo clic
-- en "Reporte instantáneo" (o cada lunes por el cron).
--
-- Forma de cada elemento del array:
--   { "destinatarios": ["a@b.com", ...], "detalles": { "salidas": true, ... } }
--
-- Las columnas viejas (reporte_destinatarios/reporte_detalles) se dejan
-- tal cual -- no las usa más código nuevo, pero no hace falta borrarlas.

alter table public.app_config
  add column if not exists reporte_configs jsonb not null default '[]'::jsonb;

-- Migra lo que el Titular ya tenía configurado (un solo destinatario/
-- detalle) al nuevo formato de lista, para no perder esa configuración.
update public.app_config
set reporte_configs = jsonb_build_array(
  jsonb_build_object(
    'destinatarios', to_jsonb(reporte_destinatarios),
    'detalles', coalesce(reporte_detalles, '{}'::jsonb)
  )
)
where jsonb_array_length(reporte_configs) = 0
  and reporte_destinatarios is not null
  and array_length(reporte_destinatarios, 1) > 0;
