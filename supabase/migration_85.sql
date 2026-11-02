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
