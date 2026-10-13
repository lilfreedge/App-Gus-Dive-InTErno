-- ============================================================
-- Migraciones para v28 -- correr de una sola vez en Supabase > SQL Editor
-- (migration_19 + migration_20 + migration_21, en ese orden)
-- ============================================================

-- Migration 19: agrega "Fecha de envío" al seguimiento de la orden
-- (pedido explícito, 23-sep-2026: "cuando se ponga en prueba
-- hidrostatica o reparacion, ademas de tener fecha de retorno, poder
-- poner fecha de envio") -- antes solo existía "Fecha de retorno a
-- tienda" (cuándo vuelve), faltaba cuándo se mandó. La vista
-- ordenes_equipos_con_nombre usa "select o.*" (ver migration_17.sql),
-- así que recoge esta columna nueva sin tocarla.
alter table public.ordenes_equipos add column if not exists fecha_envio date;


-- Migration 20: "No. de orden" del talonario físico (pedido explícito,
-- 23-sep-2026: "es un numero de una secuencia que tenemos de un
-- talonario fisico, donde se registraran las ordenes por primera vez")
-- -- número que Pipe anota a mano en el talonario de papel al recibir el
-- equipo del cliente. Es distinto del folio digital (se genera solo,
-- ver migration_16.sql): este viene de afuera de la app, así que se
-- guarda como texto y se pide en el formulario, no se calcula.
alter table public.ordenes_equipos add column if not exists no_orden_fisico text;


-- Migration 21: Catálogo de servicios de App Clientes (pedido explícito,
-- 23-sep-2026: nuevo botón "Más" en el menú -- "ahi tendremos catalogo
-- igual como que en app interno" -- con "Catálogo" adentro, que
-- resultó ser "lista de servicios, ya luego vemos que mas agregar").
--
-- Antes la lista de "Servicio a realizar" (Registrar orden) estaba fija
-- en el código (SERVICIOS en ordenes/nueva/form-client.js) -- ahora
-- vive en esta tabla, editable desde /app-clientes/catalogo sin tocar
-- código. Se sembraron los mismos 8 servicios que ya estaban fijos,
-- para no perder ninguno. Mismo patrón de RLS que equipos_del_cliente
-- (migration_17.sql): cualquiera logueado puede ver, el permiso
-- equipos_clientes (o Titular/admin) agrega y edita. No hay borrado --
-- un servicio que ya no se ofrece se desactiva (columna "activo"), no
-- se elimina, para no romper órdenes viejas que ya lo usaron.
create table if not exists public.servicios_catalogo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activo boolean not null default true,
  user_id uuid references auth.users(id),
  nombre_usuario_snapshot text,
  created_at timestamptz not null default now()
);

alter table public.servicios_catalogo enable row level security;

drop policy if exists "Los usuarios logueados ven servicios del catálogo" on public.servicios_catalogo;
create policy "Los usuarios logueados ven servicios del catálogo"
  on public.servicios_catalogo for select
  to authenticated
  using (true);

drop policy if exists "Permiso equipos_clientes agrega servicios" on public.servicios_catalogo;
create policy "Permiso equipos_clientes agrega servicios"
  on public.servicios_catalogo for insert
  to authenticated
  with check (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "Permiso equipos_clientes edita servicios" on public.servicios_catalogo;
create policy "Permiso equipos_clientes edita servicios"
  on public.servicios_catalogo for update
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
  );

insert into public.servicios_catalogo (nombre)
select v.nombre
from (values
  ('Limpieza'),
  ('Prueba hidrostática'),
  ('Limpieza + prueba hidrostática'),
  ('Mantenimiento'),
  ('Reparación'),
  ('Chequeo'),
  ('Inspección visual'),
  ('Flasheo')
) as v(nombre)
where not exists (select 1 from public.servicios_catalogo);
