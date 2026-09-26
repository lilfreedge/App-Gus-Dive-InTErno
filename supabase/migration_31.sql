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

-- Fix: historial_con_nombre no exponía datos_nuevos ------------------
-- migration_30.sql agregó cambios_historial.datos_nuevos, pero la vista
-- historial_con_nombre (creada en migration_02.sql con "select h.*, ...")
-- congela su lista de columnas al momento del create/replace -- no
-- recoge columnas nuevas de la tabla de forma automática. Resultado: el
-- before/after de Historial (item 20, v36) no estaba llegando en
-- realidad ni a App Equipos de clientes ni (una vez que se agregue) a
-- App Interno, porque la vista de la que ambas leen seguía sin la
-- columna. Se corrige re-creando la vista con la misma definición
-- exacta de migration_02.sql -- "create or replace view" sí puede
-- agregar una columna nueva al final (datos_nuevos, la última columna
-- de la tabla) sin tocar las que ya existían, así que no hace falta
-- "drop view".
create or replace view public.historial_con_nombre
  with (security_invoker = on) as
  select h.*, p.full_name
  from public.cambios_historial h
  join public.profiles p on p.id = h.user_id
  order by h.created_at desc;
