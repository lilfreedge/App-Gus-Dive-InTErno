-- =====================================================================
-- migration_72.sql -- Viajes/Buceos: avisos (V44).
-- Se puede correr más de una vez sin problema. No borra nada: agrega
-- tablas nuevas y pone en puntos el "Incluye" de Monte Cristi (parte 5).
--
-- Pedido explícito (26-oct-2026): "busca la manera de que aparezca una
-- notificación cuando se inscriba una persona en un viaje y así ya uno
-- sabe" ... "pon que puedan ser las diferentes vías, y que yo pueda
-- controlarlo, a quién le llega notificaciones y cuáles, para cuando se lo
-- vaya a asignar a la tienda".
--
--   viajes_avisos_config   qué avisos le llegan a cada persona y por dónde
--                          (en el app, correo, celular). Solo el Titular
--                          lo cambia; cada quien puede ver lo suyo.
--   viajes_notificaciones  los avisos "en el app" (la campanita). Cada
--                          quien ve y marca como leídos solo los suyos.
--                          Los crea el servidor (llave de servicio).
--   viajes_push            los celulares/computadoras donde cada quien
--                          activó las notificaciones.
--   viajes_push_llaves     el par de llaves de las notificaciones push; las
--                          genera el servidor la primera vez. Nadie del app
--                          las puede leer (solo el servidor).
-- =====================================================================

-- (1) Qué le llega a cada quien ------------------------------------------------
create table if not exists public.viajes_avisos_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- { "inscripcion": {"app": true, "correo": true, "cel": false}, "comprobante": {...}, "lleno": {...} }
  avisos jsonb not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now()
);
alter table public.viajes_avisos_config enable row level security;

drop policy if exists "viajes_avisos_config ver" on public.viajes_avisos_config;
create policy "viajes_avisos_config ver" on public.viajes_avisos_config
  for select to authenticated using (user_id = auth.uid() or public.is_titular());
drop policy if exists "viajes_avisos_config crear" on public.viajes_avisos_config;
create policy "viajes_avisos_config crear" on public.viajes_avisos_config
  for insert to authenticated with check (public.is_titular());
drop policy if exists "viajes_avisos_config editar" on public.viajes_avisos_config;
create policy "viajes_avisos_config editar" on public.viajes_avisos_config
  for update to authenticated using (public.is_titular()) with check (public.is_titular());

-- Para empezar: al Titular le llegan los tres avisos en el app y por correo
-- (lo puede cambiar en ⚙ › Administración). A los demás, nada todavía.
insert into public.viajes_avisos_config (user_id, avisos)
select p.id,
       '{"inscripcion": {"app": true, "correo": true, "cel": true},
         "comprobante": {"app": true, "correo": true, "cel": true},
         "lleno":       {"app": true, "correo": true, "cel": true}}'::jsonb
  from public.profiles p
 where p.es_titular
on conflict (user_id) do nothing;

-- (2) Avisos en el app (la campanita) -----------------------------------------
create table if not exists public.viajes_notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evento text not null,
  titulo text not null,
  texto text not null default '',
  viaje_id uuid references public.viajes(id) on delete cascade,
  url text,
  leida boolean not null default false,
  creado_en timestamptz not null default now()
);
create index if not exists viajes_notificaciones_user_idx on public.viajes_notificaciones (user_id, leida, creado_en desc);
alter table public.viajes_notificaciones enable row level security;

drop policy if exists "viajes_notificaciones ver" on public.viajes_notificaciones;
create policy "viajes_notificaciones ver" on public.viajes_notificaciones
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "viajes_notificaciones leer" on public.viajes_notificaciones;
create policy "viajes_notificaciones leer" on public.viajes_notificaciones
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Que solo se pueda cambiar "leida" (nada más del aviso).
create or replace function public.viajes_notificaciones_revisar()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and (
       new.user_id is distinct from old.user_id
    or new.evento is distinct from old.evento
    or new.titulo is distinct from old.titulo
    or new.texto is distinct from old.texto
    or new.viaje_id is distinct from old.viaje_id
    or new.url is distinct from old.url
    or new.creado_en is distinct from old.creado_en
  ) then
    raise exception 'Solo se puede marcar el aviso como leído.';
  end if;
  return new;
end;
$$;
drop trigger if exists viajes_notificaciones_revisar on public.viajes_notificaciones;
create trigger viajes_notificaciones_revisar before update on public.viajes_notificaciones
  for each row execute function public.viajes_notificaciones_revisar();

-- Para que el aviso salga al momento en el app abierto (Realtime).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'viajes_notificaciones'
     ) then
    alter publication supabase_realtime add table public.viajes_notificaciones;
  end if;
end $$;

-- (3) Celulares con notificaciones activadas ----------------------------------
create table if not exists public.viajes_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  dispositivo text not null default '',
  creado_en timestamptz not null default now()
);
create index if not exists viajes_push_user_idx on public.viajes_push (user_id);
alter table public.viajes_push enable row level security;

drop policy if exists "viajes_push ver" on public.viajes_push;
create policy "viajes_push ver" on public.viajes_push
  for select to authenticated using (user_id = auth.uid() or public.is_titular());
drop policy if exists "viajes_push quitar" on public.viajes_push;
create policy "viajes_push quitar" on public.viajes_push
  for delete to authenticated using (user_id = auth.uid());
-- (Se agregan desde el servidor, después de verificar quién es.)

-- (4) Llaves de las notificaciones push (solo el servidor) --------------------
create table if not exists public.viajes_push_llaves (
  id boolean primary key default true check (id),
  publica text not null,
  privada text not null,
  creado_en timestamptz not null default now()
);
alter table public.viajes_push_llaves enable row level security;
-- Sin políticas a propósito: nadie del app la puede leer; solo el servidor.

-- (5) "Incluye" / "No incluye" de Monte Cristi en puntos (pedido: "pon esto
-- lo que incluye y lo que no incluye tipo bullets"). Ahora cada línea es un
-- punto. Solo se cambia si el texto sigue exactamente como lo cargó
-- migration_71.sql; si alguien ya lo había cambiado, no se toca.
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{incluye}', to_jsonb(E'2 noches de hotel en El Cayito\n3 buceos con tanques, plomos y guía\n2 desayunos\nCena del viernes\nAlmuerzo del sábado\nMuseo Arqueológico Marino'::text))
 where datos->>'incluye' = '2 noches de hotel en El Cayito, 3 buceos con tanques, plomos y guía, 2 desayunos, cena del viernes, almuerzo del sábado y Museo Arqueológico Marino.';
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{noIncluye}', to_jsonb(E'Transporte terrestre\nCena del sábado\nAlquiler de equipo\nPropinas'::text))
 where datos->>'noIncluye' = 'Transporte terrestre, cena del sábado, alquiler de equipo y propinas.';
-- Los viajes de Monte Cristi ya creados (copiaron el texto del catálogo).
update public.viajes
   set datos = jsonb_set(datos, '{incluye}', to_jsonb(E'2 noches de hotel en El Cayito\n3 buceos con tanques, plomos y guía\n2 desayunos\nCena del viernes\nAlmuerzo del sábado\nMuseo Arqueológico Marino'::text))
 where datos->>'incluye' = '2 noches de hotel en El Cayito, 3 buceos con tanques, plomos y guía, 2 desayunos, cena del viernes, almuerzo del sábado y Museo Arqueológico Marino.';
update public.viajes
   set datos = jsonb_set(datos, '{noIncluye}', to_jsonb(E'Transporte terrestre\nCena del sábado\nAlquiler de equipo\nPropinas'::text))
 where datos->>'noIncluye' = 'Transporte terrestre, cena del sábado, alquiler de equipo y propinas.';
