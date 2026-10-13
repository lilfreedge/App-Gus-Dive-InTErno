-- Migration 33 (27-sep-2026) -- v40: nuevo tipo de equipo "Compresor" en
-- App Equipos de clientes (item explícito de la ronda grande de feedback:
-- agregar Compresor al listado de tipo_equipo, junto con un permiso
-- separado "editar mantenimiento de compresor" para las órdenes de ese
-- tipo -- ver lib/roles.js). No se creó catálogo ni tabla aparte para
-- Compresor (pedido explícito: no construir eso por ahora) -- se guarda
-- igual que Tanques/Reguladores/BC/Computadora/Otro, como texto en
-- ordenes_equipos.tipo_equipo y equipos_del_cliente.tipo_equipo.

-- 1) Ambos checks se definieron sin nombre explícito en su momento
--    (migration_16.sql y migration_17.sql), así que Postgres les puso el
--    nombre por default "<tabla>_<columna>_check" -- se botan y se vuelven
--    a crear con "Compresor" agregado a la lista.
alter table public.ordenes_equipos
  drop constraint if exists ordenes_equipos_tipo_equipo_check;
alter table public.ordenes_equipos
  add constraint ordenes_equipos_tipo_equipo_check
  check (tipo_equipo in ('Tanques', 'Reguladores', 'BC', 'Computadora', 'Otro', 'Compresor'));

alter table public.equipos_del_cliente
  drop constraint if exists equipos_del_cliente_tipo_equipo_check;
alter table public.equipos_del_cliente
  add constraint equipos_del_cliente_tipo_equipo_check
  check (tipo_equipo in ('Tanques', 'Reguladores', 'BC', 'Computadora', 'Otro', 'Compresor'));

-- 2) Dos servicios nuevos en el Catálogo de servicios, ya tageados para
--    Compresor (columna tipos_equipo, text[], agregada en migration_29) --
--    así el desplegable de "Servicio a realizar" no queda vacío para
--    Compresor en cuanto se pueda elegir ese tipo de equipo. Si ya
--    existían con ese nombre exacto (de otro tipo de equipo), se les
--    agrega Compresor a su arreglo en vez de duplicar la fila.
insert into public.servicios_catalogo (nombre, tipos_equipo)
select v.nombre, array['Compresor']
from (values ('Mantenimiento'), ('Reparación')) as v(nombre)
where not exists (
  select 1 from public.servicios_catalogo s where s.nombre = v.nombre
);

update public.servicios_catalogo
  set tipos_equipo = array(select distinct unnest(tipos_equipo || array['Compresor']))
  where nombre in ('Mantenimiento', 'Reparación')
    and not ('Compresor' = any(tipos_equipo));

-- Nota: no hace falta recrear ordenes_equipos_con_nombre en esta
-- migración -- no se agregó ninguna columna nueva a la tabla, solo se
-- cambió un check constraint, así que el gotcha de "select o.*" no aplica
-- acá (ver migration_32.sql para el caso donde sí aplicó).
