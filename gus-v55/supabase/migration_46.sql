-- "Recomendación de próximo mantenimiento" guardada por equipo (feedback
-- en vivo, 1-oct-2026, pedido explícito: "Esto que cada equipo guarde
-- esta info para yo poder consultar en alguna parte en caso de ser
-- necesario... saber que cliente llamar"). Se escribe al generar un
-- Informe de mantenimiento con "6 meses" o "12 meses" marcado (ver
-- app/app-clientes/ordenes/[id]/informe/form-client.js, generarInforme) --
-- hoy + 6/12 meses, calculado con el mismo helper que ya usa App Interno
-- (lib/fechas.js, sumarMeses). Consultada desde la nueva pantalla
-- "Próximos mantenimientos" en Más.
alter table public.equipos_del_cliente add column if not exists proximo_mantenimiento_recomendado date;
