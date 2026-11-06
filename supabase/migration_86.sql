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
