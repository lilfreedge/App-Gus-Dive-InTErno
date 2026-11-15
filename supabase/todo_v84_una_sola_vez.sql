-- =====================================================================
-- todo_v84_una_sola_vez.sql -- Lo de la V83 y la V84 en una sola corrida.
-- Se puede correr más de una vez y no borra nada.
--   * migration_97.sql: Buceos, "Borrar buzo" (V83).
--   * migration_98.sql: avisos del app Gus Dive (V84).
-- =====================================================================

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

-- =====================================================================
-- migration_98.sql -- V84. App Gus Dive (la de los clientes): avisos en el
-- celular de cursos y buceos nuevos (maqueta V84, idea c). Se puede correr
-- más de una vez. No borra nada.
--
-- gus_push:   los celulares que tocaron "Activar avisos" en el app.
-- gus_avisos: cada aviso que ya salió (un curso o un buceo se avisa una
--             sola vez).
-- Las dos las usa solo el servidor (llave de servicio): sin políticas,
-- nadie más las puede leer ni escribir.
-- =====================================================================
create table if not exists public.gus_push (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);
alter table public.gus_push enable row level security;

create table if not exists public.gus_avisos (
  clave text primary key,          -- "curso:<fecha>" o "viaje:<id>"
  titulo text,
  texto text,
  enviados integer not null default 0,
  creado_en timestamptz not null default now()
);
alter table public.gus_avisos enable row level security;
