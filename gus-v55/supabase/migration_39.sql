-- Código y descripción para piezas del catálogo (28-sep-2026, pedido
-- explícito en la pantalla "Agregar pieza": "poder agregarle descripcion
-- aqui. Que pida, Codigo y descripcion") -- hasta ahora piezas_catalogo
-- (migration_22.sql / migration_23.sql) solo tenía nombre + activo.
--
-- Ambas columnas opcionales (no todas las piezas van a tener un código
-- interno, y la descripción es solo una aclaración libre) -- no se toca
-- la política de que "nombre" siga siendo el único campo obligatorio.
alter table public.piezas_catalogo
  add column if not exists codigo text,
  add column if not exists descripcion text;
