-- Corrección de datos, de una sola vez (item 6.2, feedback sobre v40,
-- pedido explícito: "si la orden esta en hold, el estado deberia ser 'en
-- hold'. y que no figure en 'ordenes pendientes por trabajar' en inicio,
-- ahora mismo esta ahi y en hold al mismo tiempo. no debe de ser").
--
-- Antes de este cambio de código, un Hold activo no tocaba la columna
-- `estado` (solo se veía aparte, en `en_espera`) -- así que una orden con
-- un Hold puesto ANTES de este deploy puede seguir mostrando un estado
-- viejo ("Pendiente por trabajar", "En proceso", etc.) aunque ya esté en
-- Hold. lib/ordenes-estado.js ya quedó arreglado para que esto no vuelva
-- a pasar con Holds nuevos (se recalcula solo en cada guardado desde
-- "Actualizar estado de orden") -- esta migración solo pone al día las
-- órdenes que ya tenían un Hold activo guardado de antes.
--
-- Idempotente: solo toca filas que de verdad lo necesitan (Hold activo Y
-- estado todavía no es "En Hold" Y no está Entregado -- Entregado manda
-- por encima de todo, igual que en calcularEstadoOrden), así que correrla
-- de nuevo no hace nada la segunda vez.
update public.ordenes_equipos
set estado = 'En Hold'
where fecha_entrega_cliente is null
  and estado <> 'En Hold'
  and exists (
    select 1
    from jsonb_array_elements(coalesce(holds, '[]'::jsonb)) elem
    where (elem->>'activo')::boolean is true
  );
