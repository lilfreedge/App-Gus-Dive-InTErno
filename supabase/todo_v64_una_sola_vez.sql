-- =====================================================================
-- todo_v64_una_sola_vez.sql -- Lo de la V63 y la V64 en una sola corrida
-- (si ya corriste el de la V62). Se puede correr más de una vez y no
-- borra nada.
--   * migration_91.sql: Equipos › Recordatorios para técnicos (V63).
--   * migration_92.sql: perfil del buzo, celular una vez al mes,
--     certificación, No. de factura del estudiante y cursos nuevos (V64).
-- =====================================================================

-- =====================================================================
-- migration_91.sql  (V63, 8-nov-2026)
-- App Interno > Equipos > Recordatorios ("230. si", maqueta V61, pestaña 2).
-- Una sola sección de recordatorios para compresores, inspección visual de
-- tanques, mantenimiento de reguladores y otras cosas, cada uno con la
-- persona a la que le toca. Se usa la tabla de recordatorios que ya existe
-- (recordatorios_compresores): no se borra ni se cambia ninguno de los que
-- ya están. Se puede correr más de una vez.
-- =====================================================================

-- Qué es: 'compresor' (los de antes), 'inspeccion_visual', 'mant_reguladores' u 'otro'.
alter table public.recordatorios_compresores add column if not exists que text not null default 'compresor';
-- Cómo avisarle además de la campanita y el celular.
alter table public.recordatorios_compresores add column if not exists avisar_correo boolean not null default false;
alter table public.recordatorios_compresores add column if not exists avisar_whatsapp boolean not null default false;

-- "Cada cuánto" ahora también en semanas y meses.
alter table public.recordatorios_compresores drop constraint if exists recordatorios_compresores_unidad_check;
alter table public.recordatorios_compresores add constraint recordatorios_compresores_unidad_check
  check (unidad in ('dias', 'semanas', 'meses', 'horas'));
-- Se mueve solo a la próxima fecha al registrar una inspección visual o un
-- mantenimiento de reguladores.
alter table public.recordatorios_compresores drop constraint if exists recordatorios_compresores_reinicia_check;
alter table public.recordatorios_compresores add constraint recordatorios_compresores_reinicia_check
  check (reinicia in ('Inspección', 'Mantenimiento preventivo', 'Mantenimiento correctivo', 'Inspección visual', 'Mantenimiento de reguladores', 'hecho'));

-- Lo que ya se avisó (para no repetir el aviso): al asignarlo, unos días
-- antes y el día que toca. Lo escribe solo el servidor.
create table if not exists public.recordatorios_avisos (
  id uuid primary key default gen_random_uuid(),
  recordatorio_id uuid not null references public.recordatorios_compresores(id) on delete cascade,
  compresor_id uuid,
  para date not null,
  tipo text not null check (tipo in ('asignado', 'antes', 'dia')),
  user_id uuid not null,
  creado_en timestamptz not null default now()
);
create unique index if not exists recordatorios_avisos_unico
  on public.recordatorios_avisos (recordatorio_id, coalesce(compresor_id, '00000000-0000-0000-0000-000000000000'::uuid), para, tipo, user_id);
alter table public.recordatorios_avisos enable row level security;
drop policy if exists "recordatorios_avisos ver" on public.recordatorios_avisos;
create policy "recordatorios_avisos ver" on public.recordatorios_avisos
  for select to authenticated using (public.is_titular() or public.is_admin() or user_id = auth.uid());

-- =====================================================================
-- migration_92.sql  (V64, 9-nov-2026)
-- 1) Perfil del buzo y "Mis documentos" (275, 279, 281):
--    - cel_cambiado_en: cuándo cambió su celular por el link (una vez al mes).
--    - cert_foto: la imagen de su certificación (captura o foto), y
--      cert_revisada_en / cert_revisada_por: "Revisada por Gus".
-- 2) Ficha del estudiante (282): el No. de factura del pago del curso.
-- 3) Cursos nuevos (285): BLS, OXY, BLS + OXY y especialidades, con el
--    itinerario vacío. Solo se agregan si no existen (por el nombre).
-- Se puede correr más de una vez. No borra ni cambia datos que ya existan.
-- =====================================================================

alter table public.viajes_buzos add column if not exists cel_cambiado_en timestamptz;
alter table public.viajes_buzos add column if not exists cert_foto text;
alter table public.viajes_buzos add column if not exists cert_revisada_en timestamptz;
alter table public.viajes_buzos add column if not exists cert_revisada_por text;

alter table public.est_estudiantes add column if not exists factura text;

-- Para ordenar el link por grupos (cursos, primeros auxilios, especialidades).
alter table public.est_cursos add column if not exists grupo text;

insert into public.est_cursos (nombre, escuelas, pasos, lleva_examen, orden, grupo)
select v.nombre, v.escuelas::jsonb, v.pasos::jsonb, v.examen, v.orden, v.grupo
  from (values
    ('BLS', '["SNSI"]', '["teoria1","record","identificacion","foto"]', true, 20, 'primeros_auxilios'),
    ('OXY', '["SNSI"]', '["teoria1","record","identificacion","foto"]', true, 21, 'primeros_auxilios'),
    ('BLS + OXY', '["SNSI"]', '["teoria1","record","identificacion","foto"]', true, 22, 'primeros_auxilios'),
    ('Flotabilidad (Hovering Diver / Trim)', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 30, 'especialidad'),
    ('Navegación subacuática', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 31, 'especialidad'),
    ('Buceo nocturno', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 32, 'especialidad'),
    ('Buceo desde barco y con corriente (Boat & Drift Diver)', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 33, 'especialidad'),
    ('Buceo profundo (Deep Diver)', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 34, 'especialidad')
  ) as v(nombre, escuelas, pasos, examen, orden, grupo)
 where not exists (select 1 from public.est_cursos c where lower(c.nombre) = lower(v.nombre));
