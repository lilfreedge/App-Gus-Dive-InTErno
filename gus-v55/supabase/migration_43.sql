-- BUG REAL corregido (30-sep-2026, reportado en vivo al poner una orden en
-- Hold: "new row for relation "ordenes_equipos" violates check constraint
-- "ordenes_equipos_estado_check""). Este es el bug de fondo detrás del
-- error genérico del item 5 de v47 ("No se pudo guardar. Intenta de
-- nuevo." al guardar un Hold) -- ese item se había dejado como "mejorada
-- la visibilidad del error, sin causa confirmada"; con el mensaje real ya
-- visible (gracias a mensajeError() de esa misma entrega), la causa quedó
-- confirmada acá.
--
-- Causa: el check constraint original de `ordenes_equipos.estado`
-- (migration_16.sql, cuando se creó la tabla) solo permite
-- ('Pendiente por trabajar', 'En proceso', 'Pendiente por despachar',
-- 'Entregado'). "En Hold" se volvió un valor real de `estado` desde que
-- calcularEstadoOrden() (lib/ordenes-estado.js) empezó a devolverlo
-- (feedback sobre v40/v41: "si la orden esta en hold, el estado deberia
-- ser en hold") -- pero el constraint de la base de datos NUNCA se
-- actualizó para permitir ese valor nuevo. `guardarCampos()`, la función
-- compartida que usa TODO el wizard de "Actualizar estado de orden"
-- (incluida "Poner en Hold"), recalcula `estado` en cada guardado y lo
-- manda en el mismo UPDATE -- así que, desde que "En Hold" existe como
-- estado real, cualquier intento de crear o editar un Hold activo (o de
-- guardar cualquier otro campo de una orden que ya está en Hold) fallaba
-- siempre con este error, silenciado hasta ahora por el mensaje genérico.
alter table public.ordenes_equipos
  drop constraint if exists ordenes_equipos_estado_check;
alter table public.ordenes_equipos
  add constraint ordenes_equipos_estado_check
  check (estado in ('Pendiente por trabajar', 'En proceso', 'Pendiente por despachar', 'En Hold', 'Entregado'));

-- Igual que `migration_37.sql` (idempotente, mismo criterio: Hold activo Y
-- estado todavía no es "En Hold" Y no está Entregado) -- por si quedó
-- alguna orden con un Hold activo guardado de antes cuyo `estado` nunca
-- se pudo poner al día por este mismo bug. No debería encontrar filas
-- (ver la nota de arriba), pero no está de más dejarlo cubierto.
update public.ordenes_equipos
set estado = 'En Hold'
where fecha_entrega_cliente is null
  and estado <> 'En Hold'
  and exists (
    select 1
    from jsonb_array_elements(coalesce(holds, '[]'::jsonb)) elem
    where (elem->>'activo')::boolean is true
  );
