-- migration_102 (V97): códigos para entrar al app Gus Dive con la cédula o con
-- el celular. Al pedirlo, le llega a su correo un código de 6 números que vence
-- a los 10 minutos (máximo 5 intentos por código y 3 códigos cada 15 minutos).
-- Solo lo usa el servidor (sin políticas para el navegador).
-- Se puede correr más de una vez. No borra datos.
create table if not exists public.gus_codigos (
  id uuid primary key,
  buzo_id uuid not null references public.viajes_buzos(id) on delete cascade,
  hash text not null,
  expira timestamptz not null,
  intentos integer not null default 0,
  usado boolean not null default false,
  creado_en timestamptz not null default now()
);
create index if not exists gus_codigos_buzo_idx on public.gus_codigos (buzo_id, creado_en desc);
alter table public.gus_codigos enable row level security;
