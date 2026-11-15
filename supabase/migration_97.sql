-- =====================================================================
-- migration_97.sql -- V83. Buceos: borrar un buzo desde su ficha.
-- Se puede correr más de una vez. Esta corrida no borra nada: solo crea
-- la función que usa el botón "Borrar buzo".
--
-- Pedido explícito (15-nov): "permíteme borrarlos yo así como lo tenemos
-- en otros apps". Solo el Titular. En un solo paso se van la persona y
-- sus inscripciones en buceos (con sus pagos). No deja si la persona es
-- estudiante en Control Estudiantes o tiene alquileres (es la misma
-- persona en esos apps): primero se borra allá.
-- =====================================================================
create or replace function public.viajes_borrar_buzo(p_buzo uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
begin
  if not public.is_titular() then
    raise exception 'solo_titular';
  end if;
  if exists (select 1 from public.est_estudiantes where buzo_id = p_buzo) then
    raise exception 'es_estudiante';
  end if;
  if exists (select 1 from public.alq_alquileres where buzo_id = p_buzo) then
    raise exception 'tiene_alquileres';
  end if;
  delete from public.viajes_inscripciones where buzo_id = p_buzo;
  get diagnostics n = row_count;
  delete from public.viajes_buzos where id = p_buzo;
  if not found then
    raise exception 'no_existe';
  end if;
  return n;
end;
$$;
revoke all on function public.viajes_borrar_buzo(uuid) from public;
grant execute on function public.viajes_borrar_buzo(uuid) to authenticated;
