-- ============================================================
-- GUS DIVE - Migración 07 (V5, segunda ronda): ficha completa de
-- Reguladores de alquiler, fechas automáticas de próxima
-- inspección/mantenimiento, y "Personalizar mi menú".
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- (Es seguro correrlo sobre tu proyecto ya existente, no borra nada.)
-- ============================================================

-- 1) Ficha de Reguladores de alquiler: serie, etapas, octopus, manómetro,
-- manguera de BC, y la fecha de su próximo mantenimiento (se calcula sola
-- +8 meses cada vez que se registra un mantenimiento para ese regulador
-- — ver lib/fechas.js en el código de la app).
alter table public.reguladores_alquiler add column if not exists serie text;
alter table public.reguladores_alquiler add column if not exists etapas text;
alter table public.reguladores_alquiler add column if not exists octopus boolean not null default false;
alter table public.reguladores_alquiler add column if not exists manometro boolean not null default false;
alter table public.reguladores_alquiler add column if not exists manguera_bc boolean not null default false;
alter table public.reguladores_alquiler add column if not exists proximo_mantenimiento date;

-- 2) Tanques de alquiler: fecha de su próxima inspección visual (se
-- calcula sola +1 año cada vez que se registra una inspección para ese
-- tanque).
alter table public.tanques_alquiler add column if not exists proxima_inspeccion date;

-- Ambas fechas las actualiza el código de la app (no un trigger de base
-- de datos) al insertar en inspecciones_visuales/mantenimientos_reguladores,
-- para mantener la lógica de fechas en un solo lugar (lib/fechas.js) junto
-- con el resto de reglas de negocio de la app.

-- 3) "Personalizar mi menú": accesos directos opcionales en el nav de
-- arriba, uno por persona. Llenados viene activado por defecto (ya era
-- casi tan usado como Salidas); los demás vienen apagados.
alter table public.profiles add column if not exists menu_personalizado jsonb not null default
  '{"llenados": true, "inspeccion_visual": false, "tanques_hub": false, "mantenimiento_reguladores": false}'::jsonb;

-- Cada quien edita su propio menu_personalizado (no hace falta ser
-- admin/Titular) — igual que ya puede cambiar su propio full_name.
drop policy if exists "Cada quien edita su propio menú personalizado" on public.profiles;
create policy "Cada quien edita su propio menú personalizado"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- No hace falta ningún paso manual adicional — los reguladores/tanques
-- que ya existan en el catálogo simplemente no tendrán las fechas
-- calculadas hasta que se les registre una inspección/mantenimiento
-- nuevo, y el menú personalizado de todos queda con Llenados activado
-- y el resto apagado hasta que cada quien lo cambie en Mi Perfil.
-- ============================================================
