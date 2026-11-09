-- =====================================================================
-- todo_v62_una_sola_vez.sql -- Todo lo de la V62 en una sola corrida.
-- Si ya corriste el de la V61, solo falta este. Se puede correr más de
-- una vez y no borra nada.
--   * migration_88.sql: Interesados con seguimiento.
--   * migration_89.sql: registrar a un menor de edad (quién lo registró).
--   * migration_90.sql: Alquiler, "Vino con problemas" (cargos y su factura).
-- =====================================================================

-- =====================================================================
-- migration_88.sql  (V62, 8-nov-2026)
-- Control Estudiantes > Interesados con seguimiento ("245. ok").
-- Cada interesado guarda su historia: qué se le dijo, qué contestó y
-- cuándo volver a escribirle. Se guarda en una columna nueva (lista).
-- Se puede correr más de una vez. No borra nada.
-- =====================================================================

alter table public.est_interesados add column if not exists seguimiento jsonb not null default '[]'::jsonb;

-- =====================================================================
-- migration_89.sql  (V62, 8-nov-2026)
-- Link del estudiante: "Registrar a un menor de edad" ("229").
-- En la ficha del menor se guarda quién lo registró (nombre, documento,
-- celular y parentesco). Se puede correr más de una vez. No borra nada.
-- =====================================================================

alter table public.viajes_buzos add column if not exists tutor jsonb;

-- =====================================================================
-- migration_90.sql  (V62, 8-nov-2026)
-- Alquiler: "Vino con problemas" ("233. ok", maqueta V61).
-- A veces un tanque llega completamente vacío (hay que hacerle inspección
-- visual) o un regulador con el manómetro ahogado, y eso se le cobra al
-- cliente. Al registrar el retorno, cada equipo puede tener un cargo; el
-- cargo sale de una lista con precios (Más > Precios por tipo > Cargos por
-- problemas) y se suma al alquiler con su propio número de factura.
-- Se puede correr más de una vez. No borra ni cambia datos que ya existan.
-- =====================================================================

-- La lista de problemas con su precio.
create table if not exists public.alq_problemas (
  id text primary key,
  nombre text not null,
  tipo text,                -- prefijo del equipo (T, TX, RE...) o vacío = todos
  precio numeric,           -- vacío = se escribe el monto al registrar el retorno
  activo boolean not null default true,
  orden int not null default 0,
  actualizado_en timestamptz not null default now()
);
alter table public.alq_problemas enable row level security;
drop policy if exists "alq_problemas ver" on public.alq_problemas;
create policy "alq_problemas ver" on public.alq_problemas for select to authenticated using (public.alq_puede());
drop policy if exists "alq_problemas crear" on public.alq_problemas;
create policy "alq_problemas crear" on public.alq_problemas for insert to authenticated with check (public.alq_puede('alq_equipos'));
drop policy if exists "alq_problemas editar" on public.alq_problemas;
create policy "alq_problemas editar" on public.alq_problemas for update to authenticated using (public.alq_puede('alq_equipos'));
drop policy if exists "alq_problemas borrar" on public.alq_problemas;
create policy "alq_problemas borrar" on public.alq_problemas for delete to authenticated using (public.is_titular());

-- Los de la maqueta, para empezar (los precios se cambian en el app).
insert into public.alq_problemas (id, nombre, tipo, precio, orden) values
  ('p-vacio', 'Llegó vacío: inspección visual', 'T', 500, 1),
  ('p-valvula', 'Válvula dañada', 'T', null, 2),
  ('p-manometro', 'Manómetro ahogado', 'RE', 1200, 3),
  ('p-boquilla', 'Boquilla rota', 'RE', null, 4)
on conflict (id) do nothing;

-- El cargo de cada equipo devuelto: [{ problema, nombre, monto }].
alter table public.alq_items add column if not exists cargos jsonb not null default '[]'::jsonb;

-- La factura con que se cobraron los cargos.
alter table public.alq_alquileres add column if not exists factura_cargos text;
