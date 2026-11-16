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
