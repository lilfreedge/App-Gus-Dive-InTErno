-- migration_56.sql
-- v56: (1) tipos_equipo en piezas_catalogo -- permite indicar a qué tipo
-- de equipo pertenece cada código (igual que en servicios_catalogo), para
-- que en Seguimiento > Códigos a cobrar solo aparezcan los códigos del
-- tipo de equipo de la orden.  Códigos sin tipos_equipo siguen apareciendo
-- para todos los equipos (retrocompatible).
--
-- (2) Asigna tipos_equipo a todos los códigos conocidos (por prefijo,
-- descripción o lista de precios).

-- 1. Agregar columna tipos_equipo (null = sin restricción de tipo)
ALTER TABLE piezas_catalogo
  ADD COLUMN IF NOT EXISTS tipos_equipo text[];

-- 2. Unique index en codigo (necesario para ON CONFLICT en los INSERTs)
CREATE UNIQUE INDEX IF NOT EXISTS piezas_catalogo_codigo_unique
  ON piezas_catalogo (codigo);

-- 3. Todos los códigos TAN-* → Tanques
UPDATE piezas_catalogo
  SET tipos_equipo = ARRAY['Tanques']
  WHERE codigo LIKE 'TAN-%'
    AND (tipos_equipo IS NULL OR tipos_equipo = '{}');

-- 4. Todos los códigos REG-* → Reguladores
UPDATE piezas_catalogo
  SET tipos_equipo = ARRAY['Reguladores']
  WHERE codigo LIKE 'REG-%'
    AND (tipos_equipo IS NULL OR tipos_equipo = '{}');

-- 5. Todos los códigos LLEN-* → Tanques (llenado de tanques)
UPDATE piezas_catalogo
  SET tipos_equipo = ARRAY['Tanques']
  WHERE codigo LIKE 'LLEN-%'
    AND (tipos_equipo IS NULL OR tipos_equipo = '{}');

-- 6. Códigos conocidos de Tanques y válvulas (lista de precios)
UPDATE piezas_catalogo
  SET tipos_equipo = ARRAY['Tanques']
  WHERE codigo IN ('2665', '35063', 'AA59', 'CV20', 'A152-10',
                   'A151', '1389-2D', 'AA96D', 'AA96E', '555')
    AND (tipos_equipo IS NULL OR tipos_equipo = '{}');

-- 7. Códigos conocidos de Reguladores (lista de precios)
UPDATE piezas_catalogo
  SET tipos_equipo = ARRAY['Reguladores']
  WHERE codigo IN ('8628', 'AA87', 'AA63', 'RA121122')
    AND (tipos_equipo IS NULL OR tipos_equipo = '{}');

-- 8. Código de Computadora (lista de precios)
UPDATE piezas_catalogo
  SET tipos_equipo = ARRAY['Computadora']
  WHERE codigo IN ('2938')
    AND (tipos_equipo IS NULL OR tipos_equipo = '{}');

-- 9. Código de BC (lista de precios)
UPDATE piezas_catalogo
  SET tipos_equipo = ARRAY['BC']
  WHERE codigo IN ('5833')
    AND (tipos_equipo IS NULL OR tipos_equipo = '{}');

-- 10. Insertar códigos nuevos de la lista de precios que aún no estén
INSERT INTO piezas_catalogo (codigo, nombre, activo, tipos_equipo) VALUES
  ('TAN-5821', 'INSPECCION VISUAL',                                            true, ARRAY['Tanques']),
  ('TAN-5824', 'RECEPCION PRUEBA HIDROSTATICA',                                true, ARRAY['Tanques']),
  ('2665',     'LIMPIEZA TANQUE',                                               true, ARRAY['Tanques']),
  ('35063',    'KIT REPARACION VALVULA SHERWOOD SOLO (1) JUEGO',               true, ARRAY['Tanques']),
  ('AA59',     'VALVULA DE SEGURIDAD VALVULA TANQ 3300 PSI BURST DISC 1/2" P', true, ARRAY['Tanques']),
  ('LLEN-01',  'LLENADO AIRE',                                                  true, ARRAY['Tanques']),
  ('CV20',     'MANUBRIO PARA VALVULA GENESIS',                                 true, ARRAY['Tanques']),
  ('A152-10',  'SPRING KNOB REF A152',                                          true, ARRAY['Tanques']),
  ('A151',     'TORNILLO P/SPRING DE VALVULA (VALVE KNOB NUT)',                 true, ARRAY['Tanques']),
  ('1389-2D',  'MANUBRIO VALVULA DE LLENADO SHERWOOD',                         true, ARRAY['Tanques']),
  ('AA96D',    'ASIENTO PARA VALVULA TANQUE TRIDENT REF:AA96D',                true, ARRAY['Tanques']),
  ('AA96E',    'STEM-TORNILLOS PARA MANUBRIO DE VALVULA',                      true, ARRAY['Tanques']),
  ('555',      'FLOJAR VALVULA TANQUE PARA PRUEBA HIDROSTATICA',               true, ARRAY['Tanques']),
  ('REG-5126', 'MANTENIMIENTO REGULADOR',                                       true, ARRAY['Reguladores']),
  ('REG-5125', 'CHEQUEO DIAGNOSTICO DE REGULADOR',                             true, ARRAY['Reguladores']),
  ('8628',     'SERVICIO DE INSTALACION COMPONENTE REGULADOR (POR UNIDAD)',    true, ARRAY['Reguladores']),
  ('AA87',     'Spool Type B',                                                  true, ARRAY['Reguladores']),
  ('AA63',     'SWIVEL MANOMETRO 20mm',                                         true, ARRAY['Reguladores']),
  ('RA121122', 'Aqualung TITAN',                                                true, ARRAY['Reguladores']),
  ('2938',     'ACTUALIZACION DE SOFTWARE A COMPUTADORA CRESSI (FLASHEO)',     true, ARRAY['Computadora']),
  ('5833',     'CHEQUEO/ MANTENIMIENTO BC Y POWER INFLATOR',                   true, ARRAY['BC'])
ON CONFLICT (codigo)
  DO UPDATE SET tipos_equipo = EXCLUDED.tipos_equipo;
