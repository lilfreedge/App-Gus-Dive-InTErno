-- migration_56.sql
-- v56: (1) tipos_equipo en piezas_catalogo -- permite indicar a qué tipo
-- de equipo pertenece cada código (igual que en servicios_catalogo), para
-- que en Seguimiento > Códigos a cobrar solo aparezcan los códigos del
-- tipo de equipo de la orden.  Códigos sin tipos_equipo siguen apareciendo
-- para todos los equipos (retrocompatible).
--
-- (2) Carga masiva de códigos de la lista de precios (Tanques y valvulas,
-- Reguladores, BC, Computadora) con su tipos_equipo ya asignado.
-- Para códigos que ya existían (p.ej. TAN-5821, REG-5126) se actualiza
-- solo el tipos_equipo; los datos que ya tienen (nombre, activo, etc.)
-- no se tocan.

-- 1. Agregar columna tipos_equipo (null = sin restricción de tipo)
ALTER TABLE piezas_catalogo
  ADD COLUMN IF NOT EXISTS tipos_equipo text[];

-- 2. Índice GIN para consultas de filtrado por tipo (opcional pero útil)
CREATE INDEX IF NOT EXISTS piezas_catalogo_tipos_equipo_idx
  ON piezas_catalogo USING GIN (tipos_equipo);

-- 3. Insertar / actualizar códigos de Tanques y válvulas
INSERT INTO piezas_catalogo (codigo, nombre, activo, tipos_equipo) VALUES
  ('TAN-5821', 'INSPECCION VISUAL',                                     true, ARRAY['Tanques']),
  ('TAN-5824', 'RECEPCION PRUEBA HIDROSTATICA',                         true, ARRAY['Tanques']),
  ('2665',     'LIMPIEZA TANQUE',                                        true, ARRAY['Tanques']),
  ('35063',    'KIT REPARACION VALVULA SHERWOOD SOLO (1) JUEGO',        true, ARRAY['Tanques']),
  ('AA59',     'VALVULA DE SEGURIDAD VALVULA TANQ 3300 PSI BURST DISC 1/2" P', true, ARRAY['Tanques']),
  ('LLEN-01',  'LLENADO AIRE',                                           true, ARRAY['Tanques']),
  ('CV20',     'MANUBRIO PARA VALVULA GENESIS',                          true, ARRAY['Tanques']),
  ('A152-10',  'SPRING KNOB REF A152',                                   true, ARRAY['Tanques']),
  ('A151',     'TORNILLO P/SPRING DE VALVULA (VALVE KNOB NUT)',          true, ARRAY['Tanques']),
  ('1389-2D',  'MANUBRIO VALVULA DE LLENADO SHERWOOD',                  true, ARRAY['Tanques']),
  ('AA96D',    'ASIENTO PARA VALVULA TANQUE TRIDENT REF:AA96D',         true, ARRAY['Tanques']),
  ('AA96E',    'STEM-TORNILLOS PARA MANUBRIO DE VALVULA',               true, ARRAY['Tanques']),
  ('555',      'FLOJAR VALVULA TANQUE PARA PRUEBA HIDROSTATICA',        true, ARRAY['Tanques'])
ON CONFLICT (codigo)
  DO UPDATE SET tipos_equipo = EXCLUDED.tipos_equipo;

-- 4. Insertar / actualizar códigos de Reguladores
INSERT INTO piezas_catalogo (codigo, nombre, activo, tipos_equipo) VALUES
  ('REG-5126',  'MANTENIMIENTO REGULADOR',                                           true, ARRAY['Reguladores']),
  ('REG-5125',  'CHEQUEO DIAGNOSTICO DE REGULADOR',                                  true, ARRAY['Reguladores']),
  ('8628',      'SERVICIO DE INSTALACION COMPONENTE REGULADOR (POR UNIDAD)',         true, ARRAY['Reguladores']),
  ('AA87',      'Spool Type B',                                                       true, ARRAY['Reguladores']),
  ('AA63',      'SWIVEL MANOMETRO 20mm',                                              true, ARRAY['Reguladores']),
  ('RA121122',  'Aqualung TITAN',                                                     true, ARRAY['Reguladores'])
ON CONFLICT (codigo)
  DO UPDATE SET tipos_equipo = EXCLUDED.tipos_equipo;

-- 5. Insertar / actualizar códigos de Computadora
INSERT INTO piezas_catalogo (codigo, nombre, activo, tipos_equipo) VALUES
  ('2938', 'ACTUALIZACION DE SOFTWARE A COMPUTADORA CRESSI (FLASHEO)', true, ARRAY['Computadora'])
ON CONFLICT (codigo)
  DO UPDATE SET tipos_equipo = EXCLUDED.tipos_equipo;

-- 6. Insertar / actualizar códigos de BC
INSERT INTO piezas_catalogo (codigo, nombre, activo, tipos_equipo) VALUES
  ('5833', 'CHEQUEO/ MANTENIMIENTO BC Y POWER INFLATOR', true, ARRAY['BC'])
ON CONFLICT (codigo)
  DO UPDATE SET tipos_equipo = EXCLUDED.tipos_equipo;
