-- Migration 31 (27-sep-2026) -- v37: accesos directos opcionales en
-- Inicio de App Equipos de clientes (item 4, pedido explícito: "Shortcuts
-- de botones opcionales en 'mi perfil' para que aparezcan en INICIO. por
-- ahora solo tendremos 'registro de ordenes'").
--
-- Mismo patrón que profiles.menu_personalizado_clientes (accesos
-- opcionales del menú de arriba) -- columna aparte para no pisar esa, un
-- jsonb con {clave: true/false} por atajo (ver ATAJOS_INICIO_CLIENTES en
-- lib/nav-clientes.js). Nace vacía para todos -- nadie ve el atajo nuevo
-- hasta que lo active desde "Personalizar mi menú".
alter table public.profiles
  add column if not exists atajos_inicio_clientes jsonb;

-- Fix: historial_con_nombre no exponía datos_nuevos (ni motivo) --------
-- migration_30.sql agregó cambios_historial.datos_nuevos (y antes,
-- migration_04.sql ya había agregado motivo) DESPUÉS de que la vista
-- historial_con_nombre se creó en migration_02.sql con "select h.*,
-- p.full_name" -- una vista con "select *" congela su lista de columnas
-- al momento de crearse y no recoge columnas nuevas de la tabla de
-- forma automática. Resultado: el before/after de Historial (item 20,
-- v36) no estaba llegando en realidad ni a App Equipos de clientes ni
-- (una vez que se agregue) a App Interno, porque la vista de la que
-- ambas leen seguía sin esa columna -- ni siquiera tenía "motivo".
--
-- Un primer intento de este fix usaba "create or replace view" (pensando
-- que alcanzaba con agregar una columna al final), pero falló en
-- Supabase con "cannot change name of view column 'full_name' to
-- 'motivo'": como la vista termina en "..., p.full_name", cualquier
-- columna nueva de cambios_historial (motivo, datos_nuevos) se inserta
-- ANTES de full_name en la lista de salida, no al final -- así que para
-- Postgres eso es "mover"/renombrar una columna existente, no solo
-- agregar una nueva, y "create or replace view" no lo permite. Mismo
-- gotcha que ya se resolvió para ordenes_equipos_con_nombre en
-- migration_22.sql/migration_23.sql -- se corrige igual, con
-- "drop view" + "create view".
drop view if exists public.historial_con_nombre;

create view public.historial_con_nombre
  with (security_invoker = on) as
  select h.*, p.full_name
  from public.cambios_historial h
  join public.profiles p on p.id = h.user_id
  order by h.created_at desc;
