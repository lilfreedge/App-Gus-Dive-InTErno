-- Tamaño y Material para Tanques (29-sep-2026, feedback en vivo, item 4:
-- "que al momento de crear un tanque, pregunte también ponga secciones
-- para: Tamaño (60, 80, 100, 120 pies cúbicos) y material (aluminio o
-- acero). Esto sí que no sea editable, como los reguladores. Es imposible
-- que cambie") -- se guardan solo al crear el equipo desde SelectorEquipoCliente
-- o desde "Agregar equipos" en la ficha de cliente; el formulario "Editar
-- equipo" deliberadamente no los incluye para que queden fijos.
alter table public.equipos_del_cliente add column if not exists tamano text;
alter table public.equipos_del_cliente add column if not exists material text;
