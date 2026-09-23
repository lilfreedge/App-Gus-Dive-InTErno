-- Migration 25: Inspección visual realizada (23-sep-2026, pedido
-- explícito: "a los tanques que regresen de 'Prueba hidrostatica',
-- agregarle seccion en seguimiento, despues de 'fecha de retorno a
-- tienda', que diga 'inspeccion visual realizada' y que opcion esté
-- listo. (hacemos inspecciones visuales incluidas con las prueba
-- hidrostaticas). Esto solamente que aparezca cuando sean pruebas
-- hidrostaticas.")
--
-- Columna nueva, booleana (default false = "Pendiente"), en
-- ordenes_equipos. Se llena desde "Actualizar estado de orden" con un
-- checkbox "Listo" que solo aparece cuando "Envío a" = Prueba
-- hidrostática.
alter table public.ordenes_equipos add column if not exists inspeccion_visual_realizada boolean not null default false;

-- La vista ordenes_equipos_con_nombre usa "select o.*", pero Postgres NO
-- expone columnas nuevas de la tabla de abajo en una vista ya creada
-- (mismo gotcha documentado en migration_23.sql) -- hay que recrearla
-- (drop + create, no "or replace") para que la columna nueva se vea en
-- la ficha de la orden.
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;
