-- migration_50.sql
--
-- Arregla que "Se trabajó en tienda, no fue necesario enviarlo a taller"
-- (reparacion_en_tienda, agregada en migration_45.sql) nunca se veía en la
-- ficha de la orden (feedback sobre v51, pedido explícito: "aun no sale,
-- corregir").
--
-- Causa: app/app-clientes/ordenes/[id]/page.js lee la orden desde la vista
-- public.ordenes_equipos_con_nombre (select o.*, ...), y esa vista quedó
-- congelada con el set de columnas que tenía public.ordenes_equipos la
-- última vez que se recreó -- migration_36.sql. select o.* en una vista NO
-- recoge columnas agregadas después a la tabla de atrás; hace falta volver
-- a crearla (drop + create) para que las vea. Ninguna migración entre la
-- 37 y la 49 volvió a crear esta vista, así que reparacion_en_tienda
-- (migration_45.sql) nunca llegó a la ficha, sin importar que el dato sí
-- estuviera bien guardado en la tabla. Mismo gotcha de Postgres ya
-- documentado varias veces en este proyecto (migration_22->23,
-- migration_31, etc.).
--
-- Esta recreación usa la misma definición exacta que dejó migration_36.sql
-- -- con select o.* vuelve a traer TODAS las columnas actuales de
-- ordenes_equipos, reparacion_en_tienda incluida.

drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;
