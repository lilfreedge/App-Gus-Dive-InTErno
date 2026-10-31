-- =====================================================================
-- migration_77.sql -- V52. Se puede correr más de una vez. No borra ni
-- cambia datos que ya existan.
--
--   (1) notificaciones: la campanita de App Interno y App Equipos de
--       clientes ("16. Haz una rueda nueva de notificaciones (así como
--       tenemos en el app de buceos)"; "29. a todos les sale"). Por ahora le
--       llega "Fulano leyó tu aviso" al que puso un aviso fijo con "Listo".
--       Las agrega el servidor; cada quien ve y marca como leídas las suyas.
--   (2) Borrar buceos: solo el Titular ("Necesito acceso para poder borrar
--       buceos, esto solo voy a poderlo hacer yo"; "32. si").
-- =====================================================================

-- (1) Notificaciones ------------------------------------------------------------
create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null default 'interno' check (app in ('interno', 'clientes')),
  titulo text not null,
  texto text not null default '',
  url text,
  creado_en timestamptz not null default now(),
  leida_en timestamptz
);
create index if not exists notificaciones_user_idx on public.notificaciones (user_id, app, creado_en desc);

alter table public.notificaciones enable row level security;

drop policy if exists "notificaciones ver" on public.notificaciones;
create policy "notificaciones ver" on public.notificaciones
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "notificaciones marcar" on public.notificaciones;
create policy "notificaciones marcar" on public.notificaciones
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- (2) Borrar buceos (solo el Titular). Sus inscritos se van con él; la
-- bitácora se queda (sin el buceo).
drop policy if exists "viajes borrar" on public.viajes;
create policy "viajes borrar" on public.viajes
  for delete to authenticated using (public.is_titular());
