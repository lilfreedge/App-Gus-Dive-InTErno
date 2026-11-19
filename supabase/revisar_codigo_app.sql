-- Revisar por qué no llega el código para entrar al app Gus Dive (V105, 119).
-- Solo enseña, no cambia nada. NO hay que cambiar nada: enseña las 10 personas
-- agregadas más recientemente a la base de clientes (sin cédula ni celular).
--   es_staff = true        -> el app de clientes deja fuera al staff.
--   tiene_cedula = false   -> no puede entrar con la cédula.
--   tiene_correo = false   -> no hay a dónde mandar el código.
--   codigos_pedidos > 0    -> el app sí pidió el código y se mandó al correo.
select
  b.nombre,
  b.es_staff,
  (coalesce(b.documento, '') <> '') as tiene_cedula,
  (coalesce(b.correo, '') <> '') as tiene_correo,
  (select count(*) from public.gus_codigos c where c.buzo_id = b.id) as codigos_pedidos,
  to_char(b.creado_en at time zone 'America/Santo_Domingo', 'DD/MM HH24:MI') as agregado
from public.viajes_buzos b
order by b.creado_en desc
limit 10;
