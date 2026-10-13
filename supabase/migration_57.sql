-- migration_57.sql
-- v57: (1) presion_intermedia en mantenimientos_reguladores pasa de boolean
-- a text — permite escribir el valor real de presión (ej. "135 PSI").
-- Registros anteriores con true → "Sí"; con false → NULL.
--
-- (2) o_rings pasa de text a jsonb[] — cada entrada es
-- {"descripcion": "...", "parte": "..."}, para registrar qué O-ring se puso
-- y en qué parte del regulador. Registros anteriores con texto → se migran
-- como primer elemento del array con parte vacía.

-- 1. presion_intermedia: boolean → text
ALTER TABLE mantenimientos_reguladores
  ALTER COLUMN presion_intermedia DROP DEFAULT;

ALTER TABLE mantenimientos_reguladores
  ALTER COLUMN presion_intermedia DROP NOT NULL;

ALTER TABLE mantenimientos_reguladores
  ALTER COLUMN presion_intermedia TYPE text
  USING CASE
    WHEN presion_intermedia = true THEN 'Sí'
    ELSE NULL
  END;

-- 2. o_rings: text → jsonb
ALTER TABLE mantenimientos_reguladores
  ALTER COLUMN o_rings TYPE jsonb
  USING CASE
    WHEN o_rings IS NULL OR trim(o_rings) = '' THEN NULL::jsonb
    ELSE jsonb_build_array(
           jsonb_build_object('descripcion', trim(o_rings), 'parte', '')
         )
  END;
