-- Migration 29 (26-sep-2026) -- v36: tipos_equipo en servicios_catalogo
-- (item 21, pedido explícito: "que el servicio a realizar en registrar
-- orden se filtre segun el tipo de equipo" -- y en "editar orden", item
-- 22 relacionado: "Autorización del cliente" solo debe verse para
-- Reguladores).
--
-- text[] (no una tabla aparte) porque un servicio puede aplicar a más de
-- un tipo de Equipo a la vez (ej. "Reparación" sirve para Reguladores,
-- BC y Computadora). Se backfillea por nombre para no dejar huérfano
-- ningún servicio ya existente en el catálogo -- cualquier servicio que
-- no calce con los nombres conocidos (incluido cualquier servicio
-- personalizado que el usuario ya haya agregado a mano) se marca para
-- los 4 tipos, para no desaparecer de golpe de ningún desplegable; el
-- usuario puede ajustarlo desde Catálogo de servicios, que ahora tiene
-- checkboxes para esto.
alter table public.servicios_catalogo
  add column if not exists tipos_equipo text[] not null default '{}';

-- Comparación sin tildes/mayúsculas (mismo criterio que quitarTildes()
-- en lib/ordenes-estado.js, ver el bug del item 27) -- para que "Prueba
-- Hidrostática", "prueba hidrostatica", etc. hagan match igual sin
-- importar acentos.
update public.servicios_catalogo
  set tipos_equipo = array['Tanques']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%inspeccion visual%';

update public.servicios_catalogo
  set tipos_equipo = array['Tanques']
  where tipos_equipo = '{}'
    and (
      translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%limpieza%'
      or translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%hidrostat%'
    );

update public.servicios_catalogo
  set tipos_equipo = array['Reguladores']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%mantenimiento%';

update public.servicios_catalogo
  set tipos_equipo = array['BC']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%chequeo%';

update public.servicios_catalogo
  set tipos_equipo = array['Computadora']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%flasheo%';

update public.servicios_catalogo
  set tipos_equipo = array['Reguladores', 'BC', 'Computadora']
  where tipos_equipo = '{}'
    and translate(lower(nombre), 'áéíóúñ', 'aeioun') like '%reparacion%';

-- Cualquier servicio que no calzó con lo anterior (personalizado, o un
-- nombre que no se pudo adivinar) se deja disponible para los 4 tipos,
-- para no ocultarlo de golpe -- el usuario lo puede afinar a mano desde
-- Catálogo de servicios.
update public.servicios_catalogo
  set tipos_equipo = array['Tanques', 'Reguladores', 'BC', 'Computadora']
  where tipos_equipo = '{}';
