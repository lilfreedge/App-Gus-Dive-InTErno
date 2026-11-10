-- =====================================================================
-- todo_v63_una_sola_vez.sql -- Lo de la V63 en una sola corrida (si ya
-- corriste el de la V62). Se puede correr más de una vez y no borra nada.
--   * migration_91.sql: Equipos › Recordatorios para técnicos.
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
