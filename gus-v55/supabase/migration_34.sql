-- Migration 34 (27-sep-2026) -- v40: cuentas nuevas nacen con acceso a
-- las 2 apps, pero con todos los demás permisos apagados (pedido
-- explícito: "pon que cuando alguien se cree una cuenta nueva tenga
-- acceso a los 2 apps pero que en los permisos tengan todo desactivado").
--
-- "Acceso a las 2 apps" = permisos.acceso_app_interno y
-- permisos.equipos_clientes (los dos checks que gatean poder ENTRAR a
-- cada app -- ver /espacio/accesos y lib/roles.js). El resto de los
-- permisos granulares (registrar orden, agregar equipo, editar equipo,
-- reportes, etc.) NO se tocan acá -- ya nacen apagados porque no están
-- en este default ni en PERMISOS_DEFAULT (lib/roles.js), que sigue
-- siendo el que rellena cualquier llave que falte al leer el perfil.
--
-- Solo se cambia el DEFAULT de la columna (se usa cuando
-- handle_new_user() inserta la fila sin especificar permisos, ver
-- schema.sql) -- los perfiles YA existentes no se tocan, cada uno se
-- queda con su propio permisos guardado, igual que se hizo con
-- acceso_app_interno en migration_28.sql.
alter table public.profiles alter column permisos set default
  '{"reportes":false,"catalogo":true,"historial":false,"changelog":false,"acceso_app_interno":true,"equipos_clientes":true}'::jsonb;
