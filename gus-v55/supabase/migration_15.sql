-- Migration 15: próxima inspección de compresores (cada 2 semanas).
--
-- El usuario confirmó (23-sep-2026) que solo el tipo "Inspección" de
-- mantenimiento de compresores tiene una periodicidad por ahora -- cada
-- 2 semanas. Mantenimiento preventivo y correctivo NO llevan rango
-- todavía. Mismo patrón que tanques_alquiler.proxima_inspeccion /
-- reguladores_alquiler.proximo_mantenimiento: la fecha se actualiza
-- desde el cliente justo después de registrar una Inspección (+14
-- días vía lib/fechas.js sumarDias), no por trigger de base de datos.

alter table public.compresores
  add column if not exists proxima_inspeccion date;
