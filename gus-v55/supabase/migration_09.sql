-- ============================================================
-- GUS DIVE - Migración 09 (V6): rediseño del formulario de
-- Reguladores de alquiler — quita Descripción/Etapas/Accesorios,
-- agrega 1ra etapa / 2da etapa / Octopus / Manómetro como campos de
-- texto libre (marca/modelo de cada parte).
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- (Es seguro correrlo sobre tu proyecto ya existente, no borra nada
-- excepto la columna "manguera_bc", que ya no se usa en ninguna
-- pantalla desde este cambio.)
-- ============================================================

-- 1) Nuevos campos de texto para cada etapa del regulador.
alter table public.reguladores_alquiler add column if not exists primera_etapa text;
alter table public.reguladores_alquiler add column if not exists segunda_etapa text;

-- 2) "Octopus" y "Manómetro" pasan de ser una casilla Sí/No a un campo
-- de texto libre (para anotar marca/modelo de cada uno). Lo que ya
-- estaba marcado "Sí" se convierte al texto "Sí" para no perder el
-- dato; lo que estaba "No" queda vacío (nunca hubo detalle que guardar).
alter table public.reguladores_alquiler alter column octopus drop default;
alter table public.reguladores_alquiler alter column octopus type text
  using (case when octopus then 'Sí' else null end);

alter table public.reguladores_alquiler alter column manometro drop default;
alter table public.reguladores_alquiler alter column manometro type text
  using (case when manometro then 'Sí' else null end);

-- 3) "Manguera de BC" se quita del formulario y del catálogo por
-- completo (ya no aplica a esta ficha).
alter table public.reguladores_alquiler drop column if exists manguera_bc;

-- Nota: las columnas "descripcion" y "etapas" NO se borran (por si
-- algún regulador ya tenía algo escrito ahí) — simplemente ya no se
-- piden en el formulario de Nuevo/Editar regulador.

-- ============================================================
-- No hace falta ningún paso manual adicional.
-- ============================================================
