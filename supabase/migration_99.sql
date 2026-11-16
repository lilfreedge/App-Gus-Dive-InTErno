-- =====================================================================
-- migration_99.sql -- V85. Quién usa el app Gus Dive (la de los clientes).
-- Se puede correr más de una vez. No borra nada.
--
-- Nota del 15-nov: "algo para yo poder ver todos los buzos que interactúan
-- con el app Gus Dive. Solo yo tendré acceso a esto".
-- gus_uso: una fila por persona que entró al app con su cédula: la primera
-- vez, la última, cuántas visitas, si la tiene instalada y si activó los
-- avisos. La usa solo el servidor (sin políticas); la pantalla la ve solo
-- el Titular.
-- =====================================================================
create table if not exists public.gus_uso (
  buzo_id uuid primary key references public.viajes_buzos(id) on delete cascade,
  primera_vez timestamptz not null default now(),
  ultima_vez timestamptz not null default now(),
  veces integer not null default 1,
  instalada boolean not null default false,
  avisos boolean not null default false
);
alter table public.gus_uso enable row level security;
