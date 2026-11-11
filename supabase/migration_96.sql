-- migration_96.sql
--
-- Acceso de "solo ver" (V70, pedido explícito: "una opción para poder
-- dar un acceso especial que solo será para ver... no podrá hacer nada
-- solamente ver. no podrá darle a ningún botón"). Confirmado con él:
-- aplica dentro de las apps a las que ya tiene acceso (no abre apps
-- nuevas, "esta persona solo verá lo que tendrá acceso... no va a ver
-- nada que no tenga acceso"), ve los mismos datos que alguien con
-- acceso completo, y por ahora solo en Equipos de clientes y App
-- Interno ("los demás pueden quedar para después porque aún no lo
-- estamos usando en tienda").
--
-- Un solo permiso (profiles.permisos.solo_ver), no uno por app: lo usa
-- lib/roles.js (tieneAcceso, ACCIONES_BLOQUEADAS_SOLO_VER) para apagar
-- los permisos de ACCIÓN de esas dos apps (crear, editar, borrar,
-- actualizar estado, registrar, etc.) cuando está prendido. No toca el
-- acceso de ENTRAR a cada app ni los permisos de solo VER una sección
-- (catálogo, historial, changelog, reportes, etc.) -- esos siguen
-- igual. Se marca en Accesos a apps (columna "Solo ver").
--
-- Solo rellena el valor por default en los perfiles que ya existen (el
-- código ya lo trae como `false` para cualquier perfil que no lo tenga
-- guardado, lib/roles.js -> PERMISOS_DEFAULT). Independiente de todo lo
-- demás. Se puede correr más de una vez.

update public.profiles
  set permisos = permisos || '{"solo_ver": false}'::jsonb
  where not (permisos ? 'solo_ver');
