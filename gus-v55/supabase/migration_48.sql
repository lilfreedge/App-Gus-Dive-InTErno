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
