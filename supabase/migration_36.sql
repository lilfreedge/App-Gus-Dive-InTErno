-- Informe de mantenimiento para Reguladores (item 36, nueva feature,
-- ronda grande de feedback, 27-sep-2026) -- mockup aprobado Informe.dc.html.
--
-- 1) Datos de INTAKE, capturados al registrar la orden (solo Reguladores
--    -- el mockup los muestra de solo lectura en el Informe con la nota
--    "Se anota al registrar la orden -- no se edita aquí"):
--    - regulador_componentes: qué piezas trajo el cliente (chips en el
--      mockup: primera etapa, segunda etapa, octopus, mangueras,
--      manómetro, otro).
--    - regulador_danos_visibles / regulador_problemas_reportados: estado
--      inicial del equipo, texto libre.
--
-- 2) informe_mantenimiento: lo que llena el técnico en la pantalla nueva
--    "Informe de mantenimiento" (marca/modelo/serie que confirma o
--    corrige para este servicio, trabajo realizado, presión ajustada,
--    observación, aprobado/no aprobado, técnico). Guardado aparte del
--    equipo/orden para no pisar el registro maestro del equipo del
--    cliente con lo que se escriba acá.
alter table public.ordenes_equipos
  add column if not exists regulador_componentes jsonb not null default '{}'::jsonb,
  add column if not exists regulador_danos_visibles text,
  add column if not exists regulador_problemas_reportados text,
  add column if not exists informe_mantenimiento jsonb;

-- Recrea la vista para que exponga las columnas nuevas -- mismo gotcha de
-- Postgres de siempre ("select o.*" no ve columnas nuevas de la tabla de
-- abajo sin recrearse; "create or replace view" falla con 42P16 porque se
-- insertarían en medio de las que ya hay, no al final -- ver
-- migration_31.sql/migration_32.sql para el mismo caso).
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;
