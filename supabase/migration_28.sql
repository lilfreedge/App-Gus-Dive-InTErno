-- Migration 28 (26-sep-2026) -- v33: batería grande de ajustes a App
-- Equipos de clientes decidida en una ronda larga de feedback (quitar
-- "Status", Reparación auto-detectada como ya pasaba con Prueba
-- hidrostática, notas del técnico sobre el regulador, y la nueva
-- pantalla "Accesos a apps" desde /espacio).

-- 1) Notas del técnico sobre el regulador (item 12, pedido explícito:
--    "abajo de lo repuestos, agrega una seccion para que el tecnico
--    ponga notas del regulador... para que el buzo lo tenga pendiente"
--    -- visible en la ficha de la orden y en el reporte).
alter table public.ordenes_equipos add column if not exists notas_tecnico_regulador text;

-- 2) Acceso a App Interno como permiso propio (item 9, pedido explícito:
--    nueva pantalla "Accesos a apps" desde /espacio, con un check para
--    App Equipos de clientes -- ya existía, es profiles.permisos.
--    equipos_clientes -- y uno nuevo para App Interno).
--
--    IMPORTANTE (avisado antes de hacer esto): /dashboard nunca había
--    tenido un gate propio -- cualquiera con sesión podía entrar. Si
--    este permiso naciera en `false` para todo el mundo, la primera vez
--    que alguien que no sea el Titular entre a /dashboard después de
--    esta actualización se quedaría afuera de golpe. Este UPDATE le pone
--    el permiso en `true` a TODOS los perfiles que ya existen hoy, para
--    que nadie que ya estuviera usando App Interno pierda el acceso --
--    de aquí en adelante, un perfil nuevo nace sin este acceso hasta que
--    el Titular se lo dé desde /espacio/accesos. No borra ni cambia
--    ningún otro dato de profiles.permisos -- solo le agrega esta llave
--    si todavía no la tiene.
update public.profiles
  set permisos = coalesce(permisos, '{}'::jsonb) || '{"acceso_app_interno": true}'::jsonb
  where not (coalesce(permisos, '{}'::jsonb) ? 'acceso_app_interno');

-- 3) Recrea la vista ordenes_equipos_con_nombre para que exponga
--    notas_tecnico_regulador -- mismo gotcha de Postgres de siempre
--    (una vista con "select o.*" no ve columnas nuevas de la tabla de
--    abajo sin recrearse).
drop view if exists public.ordenes_equipos_con_nombre;
create view public.ordenes_equipos_con_nombre
  with (security_invoker = on) as
  select o.*, coalesce(o.nombre_usuario_snapshot, p.full_name) as full_name, c.telefono as cliente_telefono
  from public.ordenes_equipos o
  join public.profiles p on p.id = o.user_id
  left join public.clientes_equipos c on c.id = o.cliente_id
  order by o.created_at desc;
