-- todo_v100_una_sola_vez.sql: junta las migraciones 100, 101, 102, 103 y 104.
-- Se puede correr más de una vez y no borra datos (si ya corriste todo_v98, solo agrega lo de la 104).
-- Pégalo en Supabase › SQL Editor › Run.

-- V88 (maqueta V88 y V89, aprobadas 16-nov-2026).
-- 1) Presupuesto de cada fecha: cuándo se pidió (correo a Dinorah) y cuándo
--    llegó (se marca a mano).
-- 2) Correos del presupuesto (Administración › Correos automáticos).
-- 3) Mensaje de arriba de la lista de cursos en el app de clientes
--    (vacío = sin mensaje).
-- Se puede correr más de una vez.

alter table public.est_fechas
  add column if not exists presupuesto_pedido_en timestamptz,
  add column if not exists presupuesto_realizado_en timestamptz;

alter table public.app_config
  add column if not exists presupuesto_correos text[] not null default '{}',
  add column if not exists catalogo_mensaje text;

-- Sembrado con el correo del Titular, solo si todavía está vacío.
update public.app_config
  set presupuesto_correos = array['felipe@gusdivecenter.com']
  where presupuesto_correos = '{}';

-- El mensaje de siempre, solo si todavía no tiene ninguno (vacío = se quitó).
update public.app_config
  set catalogo_mensaje = 'Todos los cursos de Gus Dive'
  where catalogo_mensaje is null;

-- migration_101 (V91): confirmación de entrega del presupuesto al instructor (QR).
-- Se puede correr más de una vez. No borra datos.
alter table public.est_fechas add column if not exists presupuesto_entregado_en timestamptz;
alter table public.est_fechas add column if not exists presupuesto_entregado_info text;

-- migration_102 (V97): códigos para entrar al app Gus Dive con la cédula o con
-- el celular. Al pedirlo, le llega a su correo un código de 6 números que vence
-- a los 10 minutos (máximo 5 intentos por código y 3 códigos cada 15 minutos).
-- Solo lo usa el servidor (sin políticas para el navegador).
-- Se puede correr más de una vez. No borra datos.
create table if not exists public.gus_codigos (
  id uuid primary key,
  buzo_id uuid not null references public.viajes_buzos(id) on delete cascade,
  hash text not null,
  expira timestamptz not null,
  intentos integer not null default 0,
  usado boolean not null default false,
  creado_en timestamptz not null default now()
);
create index if not exists gus_codigos_buzo_idx on public.gus_codigos (buzo_id, creado_en desc);
alter table public.gus_codigos enable row level security;

-- migration_103 (V98): el detalle de cada presupuesto pedido queda guardado en
-- la fecha del curso (cuándo, quién, cuántos estudiantes, el total y la hoja),
-- para verlo después en la tarjeta Presupuesto. Los presupuestos
-- predeterminados de cada curso van en est_cursos.info (no necesitan SQL).
-- Se puede correr más de una vez. No borra datos.
alter table public.est_fechas add column if not exists presupuesto_detalle jsonb not null default '[]'::jsonb;

-- migration_104 (V100, maqueta V102: "56. me gusta la C pero agrégale la
-- casilla obligatoria que tiene la B"): el itinerario de cada curso (cada
-- fecha abierta), con sus fechas y horas, y cuándo se confirmó.
-- Sin correrlo, todo sigue saliendo como antes (el itinerario del Catálogo).
-- Se puede correr más de una vez. No borra datos.
alter table public.est_fechas add column if not exists itinerario jsonb;
alter table public.est_fechas add column if not exists itinerario_confirmado_en timestamptz;
