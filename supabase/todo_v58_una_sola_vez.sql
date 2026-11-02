-- =====================================================================
-- todo_v58_una_sola_vez.sql -- Lo que falta correr en Supabase para la V58,
-- en una sola corrida (ya corriste el de la V57):
--   * migration_83.sql: precios por tipo de Alquiler.
--   * migration_84.sql: La Caleta sin "(cuidan los carros…)" en No incluye.
-- Se puede correr más de una vez. No borra nada.
-- =====================================================================

-- =====================================================================
-- migration_83.sql -- V58. Alquiler: precios por tipo. Se puede correr más
-- de una vez. No borra ni cambia datos que ya existan.
--
-- Nota del 2-nov: "créame aquí un control para poder controlar los precios
-- de los equipos en base a su tipo, careta, regulador, etc.". Cada tipo
-- (prefijo) tiene su precio de alquiler por 3 días; un código sin precio
-- propio usa el de su tipo.
-- =====================================================================
create table if not exists public.alq_precios_tipo (
  tipo text primary key,                 -- RE, CA, BC, CH, CI, BOL, WE, T, TX...
  precio numeric,                        -- por 3 días
  actualizado_en timestamptz not null default now()
);
alter table public.alq_precios_tipo enable row level security;
drop policy if exists "alq_precios_tipo ver" on public.alq_precios_tipo;
create policy "alq_precios_tipo ver" on public.alq_precios_tipo for select to authenticated using (public.alq_puede());
drop policy if exists "alq_precios_tipo crear" on public.alq_precios_tipo;
create policy "alq_precios_tipo crear" on public.alq_precios_tipo for insert to authenticated with check (public.alq_puede('alq_equipos'));
drop policy if exists "alq_precios_tipo editar" on public.alq_precios_tipo;
create policy "alq_precios_tipo editar" on public.alq_precios_tipo for update to authenticated using (public.alq_puede('alq_equipos'));
drop policy if exists "alq_precios_tipo borrar" on public.alq_precios_tipo;
create policy "alq_precios_tipo borrar" on public.alq_precios_tipo for delete to authenticated using (public.is_titular());


-- =====================================================================
-- migration_84.sql -- V58. Solo cambia un texto. Se puede correr más de
-- una vez. No borra nada.
--
-- Buceos, La Caleta: en "No incluye" quitar "(cuidan los carros y ayudan
-- con los tanques)" (nota del 2-nov: "Quitar 'cuidan los carros'"). Queda
-- "Propina para los ayudantes del parque". En el Catálogo y en los buceos
-- ya creados.
-- =====================================================================
with cat as (
  update public.viajes_catalogo
     set datos = jsonb_set(datos, '{noIncluye}', to_jsonb(replace(datos->>'noIncluye', ' (cuidan los carros y ayudan con los tanques)', '')))
   where datos->>'noIncluye' like '%(cuidan los carros y ayudan con los tanques)%'
  returning id
),
via as (
  update public.viajes
     set datos = jsonb_set(datos, '{noIncluye}', to_jsonb(replace(datos->>'noIncluye', ' (cuidan los carros y ayudan con los tanques)', '')))
   where datos->>'noIncluye' like '%(cuidan los carros y ayudan con los tanques)%'
  returning id
)
select (select count(*) from cat) as catalogo_cambiado, (select count(*) from via) as buceos_cambiados;

select count(*) as precios_por_tipo from public.alq_precios_tipo;
