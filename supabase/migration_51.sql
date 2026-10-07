-- migration_51.sql
--
-- Arregla que los mantenimientos de reguladores (App Interno) salieran
-- siempre con "Limpieza ultrasonido: No · Presión intermedia: No ·
-- O-rings: Ninguno", sin importar lo que se marcó al registrarlos -- en la
-- lista de Mantenimiento, en Movimientos y en los reportes (PDF, Excel,
-- vista previa y el "Reporte instantáneo"/semanal por correo). Pedido
-- explícito: "arreglalo para prox actualizacion" (bug del Reporte
-- instantáneo con contenido incorrecto, columnas viejas).
--
-- Causa: el mismo gotcha de Postgres de siempre. La vista
-- public.mantenimientos_con_nombre (select m.*, ...) se creó en
-- migration_06.sql y nunca se volvió a crear; la lista de chequeo
-- (limpieza_ultrasonido, presion_intermedia, o_rings) se agregó DESPUÉS a
-- la tabla, en migration_10.sql, con un simple alter table -- así que la
-- vista nunca la vio. Todo lo que lee desde la vista recibía esas
-- columnas vacías. El dato sí está bien guardado en la tabla (la pantalla
-- de "Editar" lee la tabla directo, por eso ahí se ve bien).
--
-- Revisadas de paso todas las demás vistas del proyecto: esta era la
-- única con columnas nuevas sin recrear.
--
-- Misma definición exacta de migration_06.sql, ahora con drop + create
-- (nunca create or replace para recrear, ver estado-proyecto.md).

drop view if exists public.mantenimientos_con_nombre;
create view public.mantenimientos_con_nombre
  with (security_invoker = on) as
  select m.*, coalesce(m.nombre_usuario_snapshot, p.full_name) as full_name
  from public.mantenimientos_reguladores m
  join public.profiles p on p.id = m.user_id
  order by m.created_at desc;
