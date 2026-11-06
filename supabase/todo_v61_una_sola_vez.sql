-- =====================================================================
-- todo_v61_una_sola_vez.sql -- Todo lo de la V58 a la V61 en una sola
-- corrida. Si ya corriste el de la V59 o el de la V60, no pasa nada: se
-- puede correr más de una vez y no borra nada.
--   * migration_83 a migration_86 (V58, V59 y V60).
--   * migration_87.sql: Alquiler (factura de la mora, Estudiante OWD,
--     etiqueta Alquilado en App Interno, borrar clientes y alquileres) (V61).
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

-- =====================================================================
-- migration_87.sql -- V61. Alquiler. Se puede correr más de una vez. No
-- borra nada.
--
-- 1. Número de factura de la mora (nota del 2-nov: "cuando los artículos
--    cogen mora, debería haber una opción para poner número de factura").
-- 2. "Estudiante OWD": alquiler a un estudiante, con el equipo incluido en
--    su curso (nota del 2-nov).
-- 3. Etiqueta "Alquilado" en App Interno: quien ve los tanques y los
--    reguladores puede saber cuáles están afuera, aunque no tenga Alquiler
--    (solo los códigos, nada del cliente).
-- 4. Borrar clientes desde Alquiler (Titular). La base no deja borrar a
--    alguien que tenga alquileres, buceos o cursos.
-- 5. Borrar alquileres: el Titular o un administrador.
-- =====================================================================
alter table public.alq_alquileres add column if not exists factura_mora text;
alter table public.alq_alquileres add column if not exists estudiante text;

create or replace function public.equipos_alquilados()
returns table (codigo text, numero bigint, devolver date)
language sql
stable
security definer
set search_path = public
as $$
  select upper(i.codigo), a.numero, a.devolver
    from public.alq_items i
    join public.alq_alquileres a on a.id = i.alquiler_id
   where i.devuelto_en is null;
$$;
grant execute on function public.equipos_alquilados() to authenticated;

drop policy if exists "viajes_buzos borrar (alquiler)" on public.viajes_buzos;
create policy "viajes_buzos borrar (alquiler)" on public.viajes_buzos for delete to authenticated using (public.is_titular());

drop policy if exists "alq_alquileres borrar" on public.alq_alquileres;
create policy "alq_alquileres borrar" on public.alq_alquileres for delete to authenticated using (public.is_titular() or public.is_admin());
