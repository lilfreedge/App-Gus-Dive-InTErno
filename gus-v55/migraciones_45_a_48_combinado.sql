-- ============================================================
-- Migraciones combinadas: 45, 46, 47 y 48
-- Entregadas juntas con v50 (ronda de 11 ítems, 1 a 4-oct-2026).
-- Seguras de correr aunque alguna ya se haya corrido antes
-- (todo con IF NOT EXISTS).
-- ============================================================

-- ---------- migration_45.sql ----------
-- "Se trabajó en tienda, no fue necesario enviarlo a taller" (feedback en
-- vivo, 1-oct-2026, pedido explícito: "si es una 'reparación', no siempre
-- aplica 'fecha de envio a taller'. Hay veces que son cosas que lo podemos
-- resolver ahi mismo en tienda sin necesidad de enviarlo") -- columna nueva
-- en ordenes_equipos, boolean, default false (todas las órdenes ya
-- guardadas siguen comportándose exactamente igual que hoy). Al marcarla
-- en el Seguimiento de una orden de Reparación, ni "Fecha de envío a
-- taller o proveedor" ni "Fecha de retorno a tienda" aplican para esa
-- orden -- ver app/app-clientes/ordenes/[id]/editar/form-client.js
-- (trabajadoEnTienda) y lib/reportes-clientes.js.
alter table public.ordenes_equipos add column if not exists reparacion_en_tienda boolean not null default false;

-- ---------- migration_46.sql ----------
-- "Recomendación de próximo mantenimiento" guardada por equipo (feedback
-- en vivo, 1-oct-2026, pedido explícito: "Esto que cada equipo guarde
-- esta info para yo poder consultar en alguna parte en caso de ser
-- necesario... saber que cliente llamar"). Se escribe al generar un
-- Informe de mantenimiento con "6 meses" o "12 meses" marcado (ver
-- app/app-clientes/ordenes/[id]/informe/form-client.js, generarInforme) --
-- hoy + 6/12 meses, calculado con el mismo helper que ya usa App Interno
-- (lib/fechas.js, sumarMeses). Consultada desde la nueva pantalla
-- "Próximos mantenimientos" en Más.
alter table public.equipos_del_cliente add column if not exists proximo_mantenimiento_recomendado date;

-- ---------- migration_47.sql ----------
-- No. de orden único, a nivel de base de datos (feedback en vivo,
-- 1-oct-2026, pedido explícito: "No permita que numeros sean repetidos en
-- Numeros de orden, esto debe de ser un numero unico"). La app ya valida
-- esto antes de guardar (ver lib/ordenes.js, noOrdenYaRegistrado, usado en
-- Registrar orden y en Editar datos de la orden) -- este índice único es
-- el respaldo real a nivel de base de datos, mismo patrón ya usado para
-- seriales repetidos (migration_44.sql).
--
-- OJO: si ya existen No. de orden duplicados cargados de antes, este
-- índice va a fallar al crearse -- si da error al correr esta migración,
-- avisar para revisar juntos cuáles son los duplicados existentes antes
-- de aplicarla.
create unique index if not exists ordenes_equipos_no_orden_fisico_unico
  on public.ordenes_equipos (lower(no_orden_fisico))
  where no_orden_fisico is not null and no_orden_fisico <> '';

-- ---------- migration_48.sql ----------
-- Migration 48 (1-oct-2026) -- item 10, pedido explícito: "quiero que
-- los usuarios nuevos sean confirmados solo por mi, no que se confirmen
-- ellos mismos por correo." Reemplaza la confirmación de correo
-- autoservicio por una aprobación manual del Titular dentro de la app.
--
-- Columna `aprobado`: nace en `false` por defecto -- todo perfil NUEVO
-- de aquí en adelante necesita que el Titular lo apruebe (desde
-- /espacio/aprobaciones) antes de poder entrar a CUALQUIER pantalla de
-- la app (ver middleware.js). El Titular mismo nunca se bloquea por
-- esta columna (lib/roles.js ya lo trata como con acceso total siempre).
--
-- IMPORTANTE (igual que acceso_app_interno, migration_28.sql): si esta
-- columna naciera en `false` para todo el mundo, cualquiera que ya
-- tenga cuenta hoy se quedaría afuera de golpe al desplegar esto. Este
-- UPDATE aprueba retroactivamente a TODOS los perfiles que ya existen
-- (incluido el Titular, aunque a él no le hace falta).
alter table public.profiles add column if not exists aprobado boolean not null default false;

update public.profiles set aprobado = true where aprobado = false;

-- IMPORTANTE (configuración externa, no se puede hacer por SQL/migración):
-- para que esto reemplace de verdad la confirmación por correo y no se
-- sume como un paso extra, hay que apagar "Confirm email" en el
-- dashboard de Supabase: Authentication → Providers → Email → "Confirm
-- email" (OFF). Con eso apagado, al registrarse un usuario nuevo queda
-- con sesión iniciada de una vez, pero bloqueado en "Pendiente de
-- aprobación" hasta que el Titular lo apruebe -- en vez de bloqueado
-- esperando un correo de confirmación que ya no haría falta.
