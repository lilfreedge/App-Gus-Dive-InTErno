-- =====================================================================
-- migration_98.sql -- V84. App Gus Dive (la de los clientes): avisos en el
-- celular de cursos y buceos nuevos (maqueta V84, idea c). Se puede correr
-- más de una vez. No borra nada.
--
-- gus_push:   los celulares que tocaron "Activar avisos" en el app.
-- gus_avisos: cada aviso que ya salió (un curso o un buceo se avisa una
--             sola vez).
-- Las dos las usa solo el servidor (llave de servicio): sin políticas,
-- nadie más las puede leer ni escribir.
-- =====================================================================
create table if not exists public.gus_push (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);
alter table public.gus_push enable row level security;

create table if not exists public.gus_avisos (
  clave text primary key,          -- "curso:<fecha>" o "viaje:<id>"
  titulo text,
  texto text,
  enviados integer not null default 0,
  creado_en timestamptz not null default now()
);
alter table public.gus_avisos enable row level security;
