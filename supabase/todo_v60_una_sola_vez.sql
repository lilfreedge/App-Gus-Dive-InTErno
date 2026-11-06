-- =====================================================================
-- todo_v60_una_sola_vez.sql -- Todo lo de la V58, la V59 y la V60 en una
-- sola corrida. Si ya corriste el de la V59, no pasa nada: se puede correr
-- más de una vez y no borra nada.
--   * migration_83 a migration_85 (V58 y V59).
--   * migration_86.sql: link de Interesados con cédula y correo (V60).
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

-- =====================================================================
-- migration_85.sql -- V59. Se puede correr más de una vez. No borra nada.
--
-- 1. La nacionalidad de quien se registra con otro documento (pasaporte o
--    documento de otro país): "163" y la nota del 2-nov ("y en pasaporte
--    que pida la nacionalidad").
-- =====================================================================
alter table public.viajes_buzos add column if not exists nacionalidad text;

-- 2. El calendario de Control Estudiantes y el de Buceos son el mismo ("161"):
--    quien entra a Control Estudiantes ve los buceos, y quien entra a Buceos
--    ve los cursos (solo para verlos; no los puede cambiar).
drop policy if exists "viajes ver (estudiantes)" on public.viajes;
create policy "viajes ver (estudiantes)" on public.viajes for select to authenticated using (public.est_puede());
drop policy if exists "est_fechas ver (buceos)" on public.est_fechas;
create policy "est_fechas ver (buceos)" on public.est_fechas for select to authenticated using (public.viajes_puede());
drop policy if exists "est_cursos ver (buceos)" on public.est_cursos;
create policy "est_cursos ver (buceos)" on public.est_cursos for select to authenticated using (public.viajes_puede());

-- 3. V59 (165) -- Foto de la entrada ("¿Llegas directo?") de cada buceo del
-- Catálogo. Bucket PÚBLICO (la foto sale en el link de inscripción, sin
-- cuenta); la sube quien edita el Catálogo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('viajes-fotos', 'viajes-fotos', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "viajes fotos subir" on storage.objects;
create policy "viajes fotos subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'viajes-fotos' and public.viajes_puede('viajes_editar'));
drop policy if exists "viajes fotos ver" on storage.objects;
create policy "viajes fotos ver" on storage.objects for select to authenticated
  using (bucket_id = 'viajes-fotos');

-- =====================================================================
-- migration_86.sql -- V60. Se puede correr más de una vez. No borra nada.
--
-- Link de Interesados ("164" y la nota del 2-nov): primero pide la cédula o
-- el pasaporte. Si ya es buzo o estudiante de Gus, el interés queda ligado a
-- esa persona (sale en su ficha). También guarda el correo.
-- =====================================================================
alter table public.est_interesados add column if not exists buzo_id uuid references public.viajes_buzos(id) on delete set null;
alter table public.est_interesados add column if not exists documento text;
alter table public.est_interesados add column if not exists correo text;
create index if not exists est_interesados_buzo_idx on public.est_interesados (buzo_id);
create index if not exists est_interesados_documento_idx on public.est_interesados (documento);
