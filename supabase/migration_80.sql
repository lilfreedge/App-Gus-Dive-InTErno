-- =====================================================================
-- migration_80.sql -- V55. Se puede correr más de una vez. No borra ni
-- cambia datos que ya existan.
--
-- Control Estudiantes:
--   1. Las fechas de cada curso ("64": el estudiante escoge entre los cursos
--      próximos; "71. B"; "72. sí" cupo). Tabla est_fechas.
--   2. Cada estudiante con su fecha (fecha_id) y el estado "espera" (lista de
--      espera: curso sin fecha o fecha llena, "65").
--   3. "Cómo es la semana" de cada curso (semana). Por ahora solo Open Water:
--      teoría lunes a miércoles, examen jueves, piscina viernes, mar sábado y
--      buceo recreativo domingo ("79").
--   4. Base de datos de cursos en Más: solo el Titular borra cursos,
--      instructores y fechas ("yo seré el único que va a poder borrar").
-- =====================================================================

-- 1. Fechas -----------------------------------------------------------------
create table if not exists public.est_fechas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.est_cursos(id) on delete cascade,
  inicio date not null,                 -- siempre lunes
  cupo integer check (cupo is null or cupo > 0),  -- vacío = sin límite
  instructor text,
  nota text,
  activo boolean not null default true,
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create index if not exists est_fechas_curso_idx on public.est_fechas (curso_id, inicio);

alter table public.est_fechas enable row level security;
drop policy if exists "est_fechas ver" on public.est_fechas;
create policy "est_fechas ver" on public.est_fechas for select to authenticated using (public.est_puede());
drop policy if exists "est_fechas crear" on public.est_fechas;
create policy "est_fechas crear" on public.est_fechas for insert to authenticated with check (public.est_puede('est_cursos'));
drop policy if exists "est_fechas editar" on public.est_fechas;
create policy "est_fechas editar" on public.est_fechas for update to authenticated using (public.est_puede('est_cursos'));
drop policy if exists "est_fechas borrar" on public.est_fechas;
create policy "est_fechas borrar" on public.est_fechas for delete to authenticated using (public.is_titular());

-- 2. La fecha de cada estudiante y la lista de espera ---------------------
alter table public.est_estudiantes add column if not exists fecha_id uuid references public.est_fechas(id) on delete set null;
create index if not exists est_estudiantes_fecha_idx on public.est_estudiantes (fecha_id);
alter table public.est_estudiantes drop constraint if exists est_estudiantes_estado_check;
alter table public.est_estudiantes add constraint est_estudiantes_estado_check
  check (estado in ('curso', 'espera', 'almacen', 'certificacion', 'avisado', 'entregada', 'cancelado'));

-- 3. Cómo es la semana -------------------------------------------------------
alter table public.est_cursos add column if not exists semana jsonb;  -- 7 textos, de lunes a domingo
update public.est_cursos
   set semana = '["Teoría", "Teoría", "Teoría", "Examen", "Práctica en piscina", "Práctica en el mar", "Buceo recreativo en el mar"]'::jsonb
 where semana is null and lower(nombre) like '%open water%' and lower(nombre) not like '%advanced%';

-- 4. Solo el Titular borra ---------------------------------------------------
drop policy if exists "est_cursos borrar" on public.est_cursos;
create policy "est_cursos borrar" on public.est_cursos for delete to authenticated using (public.is_titular());
drop policy if exists "est_instructores borrar" on public.est_instructores;
create policy "est_instructores borrar" on public.est_instructores for delete to authenticated using (public.is_titular());

-- 5. Solo SNSI ("Borra PADI, no ofrecemos PADI. Es SNSI exclusivamente") -----
-- Los cursos quedan solo con SNSI (antes "SNSI, PADI"). No toca a los
-- estudiantes que ya están registrados.
alter table public.est_cursos alter column escuelas set default '["SNSI"]'::jsonb;
update public.est_cursos set escuelas = '["SNSI"]'::jsonb where escuelas is distinct from '["SNSI"]'::jsonb;
