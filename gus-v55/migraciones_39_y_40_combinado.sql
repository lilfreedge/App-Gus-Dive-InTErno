-- Código y descripción para piezas del catálogo (28-sep-2026, pedido
-- explícito en la pantalla "Agregar pieza": "poder agregarle descripcion
-- aqui. Que pida, Codigo y descripcion") -- hasta ahora piezas_catalogo
-- (migration_22.sql / migration_23.sql) solo tenía nombre + activo.
--
-- Ambas columnas opcionales (no todas las piezas van a tener un código
-- interno, y la descripción es solo una aclaración libre) -- no se toca
-- la política de que "nombre" siga siendo el único campo obligatorio.
alter table public.piezas_catalogo
  add column if not exists codigo text,
  add column if not exists descripcion text;
-- "Procesos órdenes" (28-sep-2026, pedido explícito: "agrega una seccion
-- de 'procesos ordenes' para quitar el paso de 'verificado por' en los
-- equipos que le quite el check") -- ajuste a nivel de app, no por
-- usuario ni por orden: para cada tipo de equipo, si el paso "Verificado
-- por" del Seguimiento (Actualizar estado de orden) es obligatorio antes
-- de poder notificar al cliente/cerrar la orden, o si se puede saltar
-- directo de "listo para entrega" a esos dos pasos.
--
-- Tabla singleton (un solo registro posible, `id` fijo en `true`) --
-- mismo espíritu que otras configuraciones chicas de la app, pero esta
-- no tiene dueño (no es de un usuario ni de una orden en particular), así
-- que no encaja en `profiles` ni en `ordenes_equipos`.
--
-- `verificacion_requerida`: jsonb, una clave por tipo de equipo (mismos
-- valores que ya usa `equipos_del_cliente.tipo_equipo`/TIPOS_EQUIPO en
-- lib/tipo-equipo.js: "Tanques", "Reguladores", "BC", "Computadora",
-- "Compresor") -- `true` = requiere verificación (comportamiento de
-- siempre), `false` = se salta ese paso para ese tipo. Sin fila o sin la
-- clave de un tipo todavía no configurado -> se trata como `true` en el
-- código (mismo criterio "hacia atrás compatible" que ya se usa en otras
-- partes de la app, para no cambiarle el comportamiento a nadie sin que
-- el Titular lo apague a propósito).
create table if not exists public.ajustes_app_clientes (
  id boolean primary key default true,
  constraint ajustes_app_clientes_singleton check (id = true),
  verificacion_requerida jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.ajustes_app_clientes (id)
values (true)
on conflict (id) do nothing;

alter table public.ajustes_app_clientes enable row level security;

drop policy if exists "Cualquier usuario logueado lee ajustes de la app" on public.ajustes_app_clientes;
create policy "Cualquier usuario logueado lee ajustes de la app"
  on public.ajustes_app_clientes for select
  to authenticated
  using (true);

-- Solo el Titular cambia esto (misma pantalla, "Administración", ya
-- exige requireTitular en el código -- esta política es defensa extra a
-- nivel de base de datos, mismo criterio que el resto de la app).
drop policy if exists "Solo el Titular actualiza ajustes de la app" on public.ajustes_app_clientes;
create policy "Solo el Titular actualiza ajustes de la app"
  on public.ajustes_app_clientes for update
  to authenticated
  using (public.is_titular())
  with check (public.is_titular());
