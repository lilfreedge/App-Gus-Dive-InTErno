-- =====================================================================
-- migration_71.sql -- App Viajes/Buceos (V42, primera versión de verdad).
-- Se puede correr más de una vez sin problema.
--
-- Pedido explícito (26-oct-2026): reemplazar el Google Form + Google Sheet
-- de cada viaje. Maqueta aprobada en la idea ("me gusta tu idea, ve
-- trabajando en el código"): maqueta-viajes-v2.html.
--
--   viajes_catalogo       los viajes que ofrecen, con su info de siempre
--   viajes                cada viaje programado (copia del catálogo + fecha)
--   viajes_buzos          base de buzos (se identifican por cédula/pasaporte)
--   viajes_inscripciones  quién va a cada viaje (pagos dentro, en jsonb)
--   viajes_recordatorios  generales (para todos los viajes) y sueltos
--   viajes_hechos         recordatorios marcados como hechos
--   viajes_bitacora       cada movimiento (quién, cuándo, antes -> después)
--
-- Permisos nuevos (en profiles.permisos, se dan en Viajes > Accesos):
--   viajes_editar, viajes_inscribir, viajes_grupo, viajes_pagos,
--   viajes_buzos, viajes_web  -> se le pueden dar a cualquiera
--   viajes_conciliar, viajes_numeros, viajes_cerrar, viajes_bitacora,
--   viajes_estadisticas       -> solo Titular y Administradores
-- A los Administradores se les encienden todos; a los demás, ninguno (el
-- Titular los da). El Titular siempre tiene todo.
-- =====================================================================

-- (0) ¿Puede la persona hacer esto en Viajes? ------------------------------
create or replace function public.viajes_puede(p_clave text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select p.es_titular
        or (
          coalesce((p.permisos->>'acceso_viajes')::boolean, false)
          and (
            p_clave is null
            or (
              coalesce((p.permisos->>p_clave)::boolean, false)
              and (
                p_clave not in ('viajes_conciliar', 'viajes_numeros', 'viajes_cerrar', 'viajes_bitacora', 'viajes_estadisticas')
                or p.is_admin
              )
            )
          )
        )
      from public.profiles p
     where p.id = auth.uid()
  ), false);
$$;

grant execute on function public.viajes_puede(text) to authenticated;

-- (1) Tablas ----------------------------------------------------------------
create table if not exists public.viajes_catalogo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  datos jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.viajes (
  id uuid primary key default gen_random_uuid(),
  catalogo_id uuid references public.viajes_catalogo(id) on delete set null,
  nombre text not null,
  fecha date not null,
  estado text not null default 'abierto'
    check (estado in ('abierto', 'cerrado_insc', 'realizado', 'cerrado', 'cancelado')),
  web boolean not null default true,
  slug text unique,
  datos jsonb not null default '{}'::jsonb,
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists viajes_fecha_idx on public.viajes (fecha);

create table if not exists public.viajes_buzos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  documento text,              -- cédula 000-0000000-0
  pasaporte text,
  celular text,                -- solo dígitos
  correo text,
  agencia text,
  nivel text,
  certificacion text,
  tallas jsonb not null default '{}'::jsonb,
  emergencia text,
  abono numeric not null default 0,  -- abono a favor (RD$)
  es_staff boolean not null default false,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
-- Una cédula / un pasaporte = una sola persona.
create unique index if not exists viajes_buzos_documento_uq
  on public.viajes_buzos ((regexp_replace(documento, '\D', '', 'g')))
  where documento is not null and documento <> '';
create unique index if not exists viajes_buzos_pasaporte_uq
  on public.viajes_buzos ((upper(regexp_replace(pasaporte, '\s', '', 'g'))))
  where pasaporte is not null and pasaporte <> '';
create index if not exists viajes_buzos_celular_idx on public.viajes_buzos (celular);

create table if not exists public.viajes_inscripciones (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.viajes(id) on delete cascade,
  buzo_id uuid not null references public.viajes_buzos(id) on delete restrict,
  opcion_id text,
  rol text not null default 'buzo' check (rol in ('buzo', 'staff', 'curso', 'invitado')),
  equipo jsonb not null default '{"piezas": [], "donde": ""}'::jsonb,
  extras jsonb not null default '[]'::jsonb,
  respuestas jsonb not null default '{}'::jsonb,
  estado text not null default 'inscrito' check (estado in ('inscrito', 'espera', 'quitado')),
  grupo boolean not null default false,
  pagos jsonb not null default '[]'::jsonb,
  comprobantes jsonb not null default '[]'::jsonb,  -- fotos/PDF del pago (bucket viajes-comprobantes)
  usa_abono boolean not null default false,
  pagado_por uuid references public.viajes_buzos(id) on delete set null,
  asistio boolean,
  nota text not null default '',
  nuevo boolean not null default false,
  inscrito_por uuid references public.viajes_buzos(id) on delete set null,
  habitacion text not null default '',
  via text not null default 'mano' check (via in ('link', 'mano')),
  codigo text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (viaje_id, buzo_id)
);
alter table public.viajes_inscripciones add column if not exists comprobantes jsonb not null default '[]'::jsonb;
create index if not exists viajes_inscripciones_viaje_idx on public.viajes_inscripciones (viaje_id);
create index if not exists viajes_inscripciones_buzo_idx on public.viajes_inscripciones (buzo_id);

create table if not exists public.viajes_recordatorios (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('general', 'suelto')),
  dias integer,          -- general: días antes del viaje (negativo = después)
  fecha date,            -- suelto: el día
  texto text not null,
  para jsonb not null default '[]'::jsonb,   -- ids de perfiles; vacío = todos
  correo boolean not null default false,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists public.viajes_hechos (
  clave text primary key,
  hecho_por uuid references auth.users(id) on delete set null,
  hecho_en timestamptz not null default now()
);

create table if not exists public.viajes_bitacora (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid references public.viajes(id) on delete set null,
  quien_id uuid references auth.users(id) on delete set null,
  quien text not null,
  texto text not null,
  antes text,
  despues text,
  creado_en timestamptz not null default now()
);
create index if not exists viajes_bitacora_viaje_idx on public.viajes_bitacora (viaje_id, creado_en desc);
create index if not exists viajes_bitacora_creado_idx on public.viajes_bitacora (creado_en desc);

-- (2) Seguridad (RLS) ---------------------------------------------------------
alter table public.viajes_catalogo enable row level security;
alter table public.viajes enable row level security;
alter table public.viajes_buzos enable row level security;
alter table public.viajes_inscripciones enable row level security;
alter table public.viajes_recordatorios enable row level security;
alter table public.viajes_hechos enable row level security;
alter table public.viajes_bitacora enable row level security;

drop policy if exists "viajes_catalogo ver" on public.viajes_catalogo;
create policy "viajes_catalogo ver" on public.viajes_catalogo for select to authenticated using (public.viajes_puede());
drop policy if exists "viajes_catalogo crear" on public.viajes_catalogo;
create policy "viajes_catalogo crear" on public.viajes_catalogo for insert to authenticated with check (public.viajes_puede('viajes_editar'));
drop policy if exists "viajes_catalogo editar" on public.viajes_catalogo;
create policy "viajes_catalogo editar" on public.viajes_catalogo for update to authenticated using (public.viajes_puede('viajes_editar'));

drop policy if exists "viajes ver" on public.viajes;
create policy "viajes ver" on public.viajes for select to authenticated using (public.viajes_puede());
drop policy if exists "viajes crear" on public.viajes;
create policy "viajes crear" on public.viajes for insert to authenticated with check (public.viajes_puede('viajes_editar'));
drop policy if exists "viajes editar" on public.viajes;
create policy "viajes editar" on public.viajes for update to authenticated using (
  public.viajes_puede('viajes_editar') or public.viajes_puede('viajes_numeros')
  or public.viajes_puede('viajes_cerrar') or public.viajes_puede('viajes_web')
  or public.viajes_puede('viajes_grupo')
);

drop policy if exists "viajes_buzos ver" on public.viajes_buzos;
create policy "viajes_buzos ver" on public.viajes_buzos for select to authenticated using (public.viajes_puede());
drop policy if exists "viajes_buzos crear" on public.viajes_buzos;
create policy "viajes_buzos crear" on public.viajes_buzos for insert to authenticated with check (public.viajes_puede('viajes_inscribir'));
drop policy if exists "viajes_buzos editar" on public.viajes_buzos;
create policy "viajes_buzos editar" on public.viajes_buzos for update to authenticated using (
  public.viajes_puede('viajes_inscribir') or public.viajes_puede('viajes_pagos') or public.viajes_puede('viajes_cerrar')
);

drop policy if exists "viajes_inscripciones ver" on public.viajes_inscripciones;
create policy "viajes_inscripciones ver" on public.viajes_inscripciones for select to authenticated using (public.viajes_puede());
drop policy if exists "viajes_inscripciones crear" on public.viajes_inscripciones;
create policy "viajes_inscripciones crear" on public.viajes_inscripciones for insert to authenticated with check (public.viajes_puede('viajes_inscribir'));
drop policy if exists "viajes_inscripciones editar" on public.viajes_inscripciones;
create policy "viajes_inscripciones editar" on public.viajes_inscripciones for update to authenticated using (
  public.viajes_puede('viajes_inscribir') or public.viajes_puede('viajes_grupo')
  or public.viajes_puede('viajes_pagos') or public.viajes_puede('viajes_conciliar')
);

drop policy if exists "viajes_recordatorios ver" on public.viajes_recordatorios;
create policy "viajes_recordatorios ver" on public.viajes_recordatorios for select to authenticated using (public.viajes_puede());
drop policy if exists "viajes_recordatorios crear" on public.viajes_recordatorios;
create policy "viajes_recordatorios crear" on public.viajes_recordatorios for insert to authenticated with check (public.viajes_puede('viajes_editar'));
drop policy if exists "viajes_recordatorios editar" on public.viajes_recordatorios;
create policy "viajes_recordatorios editar" on public.viajes_recordatorios for update to authenticated using (public.viajes_puede('viajes_editar'));
drop policy if exists "viajes_recordatorios quitar" on public.viajes_recordatorios;
create policy "viajes_recordatorios quitar" on public.viajes_recordatorios for delete to authenticated using (public.viajes_puede('viajes_editar'));

drop policy if exists "viajes_hechos ver" on public.viajes_hechos;
create policy "viajes_hechos ver" on public.viajes_hechos for select to authenticated using (public.viajes_puede());
drop policy if exists "viajes_hechos marcar" on public.viajes_hechos;
create policy "viajes_hechos marcar" on public.viajes_hechos for insert to authenticated with check (public.viajes_puede());
drop policy if exists "viajes_hechos desmarcar" on public.viajes_hechos;
create policy "viajes_hechos desmarcar" on public.viajes_hechos for delete to authenticated using (public.viajes_puede());

-- La bitácora: cualquiera con acceso escribe (lo hace el app solo, a su
-- nombre); solo la ven Titular y Administradores con el permiso. Nadie la
-- edita ni la borra.
drop policy if exists "viajes_bitacora ver" on public.viajes_bitacora;
create policy "viajes_bitacora ver" on public.viajes_bitacora for select to authenticated using (public.viajes_puede('viajes_bitacora'));
drop policy if exists "viajes_bitacora escribir" on public.viajes_bitacora;
create policy "viajes_bitacora escribir" on public.viajes_bitacora for insert to authenticated
  with check (public.viajes_puede() and quien_id = auth.uid());

-- Comprobantes de pago: bucket PRIVADO (son datos de banco). Los ve y los
-- sube quien registra pagos o concilia; el buzo los sube por el link (eso
-- pasa por el servidor).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('viajes-comprobantes', 'viajes-comprobantes', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "viajes comprobantes ver" on storage.objects;
create policy "viajes comprobantes ver" on storage.objects for select to authenticated
  using (bucket_id = 'viajes-comprobantes' and (public.viajes_puede('viajes_pagos') or public.viajes_puede('viajes_conciliar')));
drop policy if exists "viajes comprobantes subir" on storage.objects;
create policy "viajes comprobantes subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'viajes-comprobantes' and public.viajes_puede('viajes_pagos'));

-- (3) Lo fino: cada cambio exige su permiso (además de la política) --------
-- Inscripciones: grupo/asistencia/nota = viajes_grupo; pagos = viajes_pagos;
-- marcar conciliado = viajes_conciliar; lo demás = viajes_inscribir.
create or replace function public.viajes_inscripcion_revisar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conc_viejo jsonb;
  conc_nuevo jsonb;
  sin_conc_viejo jsonb;
  sin_conc_nuevo jsonb;
begin
  if auth.uid() is null or public.is_titular() then
    new.actualizado_en := now();
    return new;
  end if;

  if (new.grupo is distinct from old.grupo or new.asistio is distinct from old.asistio or new.nota is distinct from old.nota)
     and not public.viajes_puede('viajes_grupo') then
    raise exception 'No tienes permiso para marcar grupo, asistencia o notas.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', e->>'id', 'c', coalesce((e->>'conciliado')::boolean, false)) order by e->>'id'), '[]'::jsonb),
         coalesce(jsonb_agg(e - 'conciliado' - 'conciliadoPor' - 'conciliadoEn' order by e->>'id'), '[]'::jsonb)
    into conc_viejo, sin_conc_viejo
    from jsonb_array_elements(old.pagos) e;
  select coalesce(jsonb_agg(jsonb_build_object('id', e->>'id', 'c', coalesce((e->>'conciliado')::boolean, false)) order by e->>'id'), '[]'::jsonb),
         coalesce(jsonb_agg(e - 'conciliado' - 'conciliadoPor' - 'conciliadoEn' order by e->>'id'), '[]'::jsonb)
    into conc_nuevo, sin_conc_nuevo
    from jsonb_array_elements(new.pagos) e;

  if new.comprobantes is distinct from old.comprobantes
     and not (public.viajes_puede('viajes_pagos') or public.viajes_puede('viajes_conciliar')) then
    raise exception 'No tienes permiso para los comprobantes de pago.';
  end if;

  if sin_conc_nuevo is distinct from sin_conc_viejo or new.usa_abono is distinct from old.usa_abono
     or new.pagado_por is distinct from old.pagado_por then
    if not public.viajes_puede('viajes_pagos') then
      raise exception 'No tienes permiso para registrar pagos.';
    end if;
  end if;

  if conc_nuevo is distinct from conc_viejo and sin_conc_nuevo is not distinct from sin_conc_viejo
     and not public.viajes_puede('viajes_conciliar') then
    raise exception 'Solo Pipe o un administrador con permiso pueden conciliar.';
  end if;
  -- Un pago nuevo nunca entra ya conciliado si quien lo registra no concilia.
  if sin_conc_nuevo is distinct from sin_conc_viejo and not public.viajes_puede('viajes_conciliar') then
    if exists (
      select 1 from jsonb_array_elements(new.pagos) e
       where coalesce((e->>'conciliado')::boolean, false)
         and not exists (select 1 from jsonb_array_elements(old.pagos) o where o->>'id' = e->>'id' and coalesce((o->>'conciliado')::boolean, false))
    ) then
      raise exception 'Solo Pipe o un administrador con permiso pueden conciliar.';
    end if;
  end if;

  if (new.opcion_id is distinct from old.opcion_id or new.rol is distinct from old.rol or new.equipo is distinct from old.equipo
      or new.extras is distinct from old.extras or new.respuestas is distinct from old.respuestas or new.estado is distinct from old.estado
      or new.nuevo is distinct from old.nuevo or new.habitacion is distinct from old.habitacion or new.inscrito_por is distinct from old.inscrito_por
      or new.viaje_id is distinct from old.viaje_id or new.buzo_id is distinct from old.buzo_id)
     and not public.viajes_puede('viajes_inscribir') then
    raise exception 'No tienes permiso para editar la inscripción.';
  end if;

  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists viajes_inscripcion_revisar on public.viajes_inscripciones;
create trigger viajes_inscripcion_revisar before update on public.viajes_inscripciones
  for each row execute function public.viajes_inscripcion_revisar();

-- Viajes: cerrar/cancelar/reabrir = viajes_cerrar; gastos reales =
-- viajes_numeros; mostrar en la web = viajes_web; pendientes = viajes_editar
-- o viajes_grupo; lo demás = viajes_editar. Un viaje cerrado no se toca
-- (hay que reabrirlo).
create or replace function public.viajes_viaje_revisar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resto_viejo jsonb := old.datos - 'gastos' - 'pendientes' - 'cerradoPor' - 'cerradoEl' - 'motivoCancelado';
  resto_nuevo jsonb := new.datos - 'gastos' - 'pendientes' - 'cerradoPor' - 'cerradoEl' - 'motivoCancelado';
begin
  new.actualizado_en := now();
  if auth.uid() is null or public.is_titular() then
    return new;
  end if;

  if new.estado is distinct from old.estado
     and (new.estado in ('cerrado', 'cancelado') or old.estado in ('cerrado', 'cancelado'))
     and not public.viajes_puede('viajes_cerrar') then
    raise exception 'Solo Pipe o un administrador con permiso pueden cerrar, cancelar o reabrir un viaje.';
  end if;
  if old.estado in ('cerrado', 'cancelado') and new.estado = old.estado then
    raise exception 'Este viaje está cerrado. Hay que reabrirlo para cambiarlo.';
  end if;
  if (new.datos->'gastos') is distinct from (old.datos->'gastos') and not public.viajes_puede('viajes_numeros') then
    raise exception 'No tienes permiso para los números del viaje.';
  end if;
  if new.web is distinct from old.web and not public.viajes_puede('viajes_web') then
    raise exception 'No tienes permiso para publicar en la web.';
  end if;
  if (new.datos->'pendientes') is distinct from (old.datos->'pendientes')
     and not (public.viajes_puede('viajes_editar') or public.viajes_puede('viajes_grupo')) then
    raise exception 'No tienes permiso para marcar pendientes.';
  end if;
  if (resto_nuevo is distinct from resto_viejo or new.nombre is distinct from old.nombre or new.fecha is distinct from old.fecha
      or new.slug is distinct from old.slug or new.catalogo_id is distinct from old.catalogo_id
      or (new.estado is distinct from old.estado and new.estado not in ('cerrado', 'cancelado') and old.estado not in ('cerrado', 'cancelado')))
     and not public.viajes_puede('viajes_editar') then
    raise exception 'No tienes permiso para editar el viaje.';
  end if;
  return new;
end;
$$;

drop trigger if exists viajes_viaje_revisar on public.viajes;
create trigger viajes_viaje_revisar before update on public.viajes
  for each row execute function public.viajes_viaje_revisar();

-- (4) Catálogo inicial (sacado de los Google Sheets, 26-oct-2026) ------------
-- Solo si el catálogo está vacío (no pisa lo que ya editaron).
do $$
begin
  if not exists (select 1 from public.viajes_catalogo) then
    insert into public.viajes_catalogo (nombre, orden, datos) values
    ('La Caleta', 1, $j${
      "salida": "7:00 AM desde la tienda", "moneda": "DOP", "tasa": 62, "cupoMin": 0, "cupoMax": 15, "operador": "Yolero",
      "opciones": [
        {"id": "buzo", "nombre": "Buzo", "incluye": "2 buceos, embarcación, guía y Parque Nacional", "dop": 2600, "costo": null},
        {"id": "curso", "nombre": "Estudiante de curso", "incluye": "Va con su curso (no paga el viaje)", "dop": 0, "costo": null, "noPaga": true}
      ],
      "equipo": {"modo": "no", "nota": "Este viaje no incluye alquiler de equipo: trae tu equipo completo."},
      "extras": [], "preguntas": [], "reserva": null, "habitaciones": null, "requisito": "",
      "pendientes": ["Confirmar con el yolero (8:00 AM)", "Cantidad de yolas", "Crear grupo de WhatsApp"],
      "recordatorios": [{"dias": 1, "texto": "Confirmar con el yolero y cantidad de yolas"}],
      "mensajeGrupo": "¡Hola! Les recuerdo que salimos el [día] a las 7:00 AM desde la tienda. Lleven todo su equipo. ¡Nos vemos!"
    }$j$::jsonb),
    ('La Caleta Nocturno', 2, $j${
      "salida": "6:30 PM en La Caleta (salir 4:40 PM)", "moneda": "DOP", "tasa": 62, "cupoMin": 0, "cupoMax": 12, "operador": "Yolero (confirma Wilson)",
      "opciones": [
        {"id": "buzo", "nombre": "Buzo", "incluye": "1 buceo nocturno, embarcación, guía y permiso de parque", "dop": 1500, "costo": null},
        {"id": "curso", "nombre": "Estudiante de curso", "incluye": "Va con su curso (no paga el viaje)", "dop": 0, "costo": null, "noPaga": true}
      ],
      "equipo": {"modo": "no", "nota": "Este viaje no incluye alquiler de equipo: trae tu equipo completo (y tu linterna)."},
      "extras": [], "preguntas": [], "reserva": null, "habitaciones": null, "requisito": "",
      "pendientes": ["Confirmar la yola (Wilson)", "Crear grupo de WhatsApp"],
      "recordatorios": [{"dias": 2, "texto": "Confirmar la yola con Wilson"}],
      "mensajeGrupo": "¡Hola! Les recuerdo que nuestra excursión de buceo es este [día]. Debemos reunirnos a las 6:30 PM en La Caleta, por lo que les sugiero salir a las 4:40 PM para evitar retrasos. No olviden llevar todo su equipo. ¡Nos vemos pronto!"
    }$j$::jsonb),
    ('Bayahibe (OWD)', 3, $j${
      "salida": "6:45 AM desde la tienda", "moneda": "USD", "tasa": 60, "cupoMin": 0, "cupoMax": 20, "operador": "Scuba Caribe (Alberto Mercedes)",
      "opciones": [
        {"id": "propio", "nombre": "Buzo", "incluye": "Embarcación, 2 tanques, cinturón con pesas y guías", "usd": 85, "costo": 50},
        {"id": "equipo", "nombre": "Buzo + equipo", "incluye": "Lo mismo + el equipo que te falte (lo pone Scuba Caribe)", "usd": 95, "costo": 55, "conEquipo": true},
        {"id": "owd", "nombre": "Estudiante curso OWD", "incluye": "Embarcación, 2 tanques, cinturón con pesas y guías", "usd": 65, "costo": 45}
      ],
      "equipo": {"modo": "si", "soloConOpcion": true, "proveedor": "Scuba Caribe", "piezas": ["Careta", "Regulador", "BCD", "Chapaletas", "Wetsuit"],
                 "nota": "No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más)."},
      "extras": [], "preguntas": [], "reserva": null, "habitaciones": null, "requisito": "",
      "pendientes": ["Crear grupo de WhatsApp", "Enviar tallas a Alberto Mercedes"],
      "recordatorios": [{"dias": 2, "texto": "Enviar tallas a Alberto Mercedes (Scuba Caribe) — el viernes"}],
      "mensajeGrupo": "¡Hola! Recuerden que salimos el [día] a las 6:45 AM desde la tienda. Lleven su equipo y protector solar."
    }$j$::jsonb),
    ('Bayahibe Avanzado (AOWD)', 4, $j${
      "salida": "7:00 AM desde la tienda", "moneda": "USD", "tasa": 60, "cupoMin": 0, "cupoMax": 13, "operador": "Scuba Caribe (Alberto Mercedes)",
      "opciones": [
        {"id": "propio", "nombre": "Buzo", "incluye": "Embarcación, 2 tanques, cinturón con pesas y guías", "usd": 85, "costo": 50},
        {"id": "equipo", "nombre": "Buzo + equipo", "incluye": "Lo mismo + el equipo que te falte (lo pone Scuba Caribe)", "usd": 95, "costo": 55, "conEquipo": true},
        {"id": "aowd", "nombre": "Estudiante curso AOWD", "incluye": "Embarcación, 2 tanques, cinturón con pesas y guías", "usd": 65, "costo": 45}
      ],
      "equipo": {"modo": "si", "soloConOpcion": true, "proveedor": "Scuba Caribe", "piezas": ["Careta", "Regulador", "BCD", "Chapaletas", "Wetsuit"],
                 "nota": "No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más)."},
      "extras": [], "preguntas": ["ultimoBuceo", "cantBuceos"], "reserva": null, "habitaciones": null, "requisito": "",
      "pendientes": ["Crear grupo de WhatsApp", "Enviar tallas a Alberto Mercedes"],
      "recordatorios": [{"dias": 2, "texto": "Enviar tallas a Alberto Mercedes (Scuba Caribe) — el viernes"}],
      "mensajeGrupo": ""
    }$j$::jsonb),
    ('Isla Catalina (desde La Romana)', 5, $j${
      "salida": "6:30 AM desde la tienda", "moneda": "USD", "tasa": 61, "cupoMin": 0, "cupoMax": 20, "operador": "Scuba Caribe Romana (Alberto Mercedes)", "costoStaff": 20,
      "opciones": [
        {"id": "propio", "nombre": "Buzo", "incluye": "Embarcación, 2 tanques, cinturón de pesas, guía, bebidas y comida", "usd": 130, "costo": 95},
        {"id": "equipo", "nombre": "Buzo + equipo", "incluye": "Lo mismo + el equipo que te falte (lo pone Scuba Caribe)", "usd": 140, "costo": 100, "conEquipo": true},
        {"id": "snorkel", "nombre": "Acompañante / snorkel", "incluye": "Embarcación, careta, snorkel, chapaletas, guía, bebidas y comida", "usd": 90, "costo": 50},
        {"id": "nino", "nombre": "Niños (4 a 12 años)", "incluye": "Embarcación, bebidas y comida", "usd": 50, "costo": 25},
        {"id": "owd", "nombre": "Estudiante curso OWD", "incluye": "Embarcación, 2 tanques, pesas, guía, bebidas y comida", "usd": 105, "costo": null}
      ],
      "equipo": {"modo": "si", "soloConOpcion": true, "proveedor": "Scuba Caribe", "piezas": ["Careta", "Regulador", "BCD", "Chapaletas", "Wetsuit"],
                 "nota": "No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más)."},
      "extras": [], "preguntas": [], "reserva": null, "habitaciones": null, "requisito": "",
      "pendientes": ["Crear grupo de WhatsApp", "Enviar tallas a Alberto Mercedes"],
      "recordatorios": [{"dias": 2, "texto": "Enviar tallas a Alberto Mercedes (Scuba Caribe Romana) — el viernes"}],
      "mensajeGrupo": ""
    }$j$::jsonb),
    ('Buceo con Tiburones, Bávaro', 6, $j${
      "salida": "6:00 AM desde la tienda", "moneda": "USD", "tasa": 62, "cupoMin": 8, "cupoMax": 12, "operador": "Nobel",
      "opciones": [
        {"id": "buzo", "nombre": "Buzo", "incluye": "Embarcación, 2 tanques, cinturón con pesas, guías, agua y frutas", "usd": 140, "dop": 9000, "costo": 100}
      ],
      "equipo": {"modo": "si", "proveedor": "Nobel", "piezas": ["Careta", "Regulador", "BCD", "Chapaletas", "Wetsuit"],
                 "donde": [{"id": "gus", "t": "Lo alquilo en Gus", "precio": "aprox. US$18 (varía según lo que necesites)"},
                           {"id": "alla", "t": "Lo alquilo allá directo", "precio": "US$35"}],
                 "nota": "No incluye equipo: se alquila en la tienda o allá directo (US$35). Los tanques y pesas se entregan en el punto de buceo."},
      "extras": [], "preguntas": [], "reserva": null, "habitaciones": null,
      "requisito": "Declaro que soy buzo certificado, que cuento con un mínimo de treinta (30) buceos registrados y que puedo demostrarlo con mi logbook físico o digital, o aplicación de buceo.",
      "pendientes": ["Crear grupo de WhatsApp", "Confirmar cantidad de buzos a Nobel"],
      "recordatorios": [{"dias": 2, "texto": "Confirmarle a Nobel la cantidad de buzos y las tallas — el viernes"}],
      "mensajeGrupo": "¡Hola! Les recuerdo que nuestro buceo con tiburones es este [día]. Salimos a las 6:00 AM desde la tienda. Los tanques y pesas se entregan en el punto de buceo. ¡Nos vemos!"
    }$j$::jsonb),
    ('Salinas (Baní)', 7, $j${
      "salida": "7:00 AM desde la tienda", "moneda": "DOP", "tasa": 62, "cupoMin": 0, "cupoMax": 15, "operador": "",
      "opciones": [{"id": "buzo", "nombre": "Buzo", "incluye": "2 tanques, embarcación y guía", "dop": 2600, "costo": null}],
      "equipo": {"modo": "no", "nota": "Este viaje no incluye alquiler de equipo: trae tu equipo completo."},
      "extras": [], "preguntas": [], "reserva": null, "habitaciones": null, "requisito": "",
      "pendientes": ["Crear grupo de WhatsApp"], "recordatorios": [], "mensajeGrupo": ""
    }$j$::jsonb),
    ('Monte Cristi (fin de semana)', 8, $j${
      "salida": "Viernes 2:00 PM desde la tienda", "moneda": "DOP", "tasa": 62, "cupoMin": 0, "cupoMax": 20, "operador": "Hotel El Cayito", "finDeSemana": true,
      "opciones": [
        {"id": "ind", "nombre": "Habitación individual", "incluye": "Precio por persona", "dop": 23500, "costo": null},
        {"id": "comp", "nombre": "Habitación compartida (2 personas, camas separadas)", "incluye": "Precio por persona", "dop": 22100, "costo": null},
        {"id": "pareja", "nombre": "Habitación de pareja (2 personas, una cama)", "incluye": "Precio por persona", "dop": 19850, "costo": null},
        {"id": "tres", "nombre": "Habitación para 3 personas", "incluye": "Precio por persona", "dop": 20150, "costo": null},
        {"id": "cuatro", "nombre": "Habitación para 4 personas", "incluye": "Precio por persona", "dop": 19150, "costo": null}
      ],
      "incluye": "2 noches de hotel en El Cayito, 3 buceos con tanques, plomos y guía, 2 desayunos, cena del viernes, almuerzo del sábado y Museo Arqueológico Marino.",
      "noIncluye": "Transporte terrestre, cena del sábado, alquiler de equipo y propinas.",
      "equipo": {"modo": "si", "proveedor": "Gus", "piezas": ["Regulador", "BCD / chaleco", "Traje", "Computador de buceo", "Aletas, máscara y snorkel"],
                 "nota": "El alquiler de equipo va aparte."},
      "extras": [{"id": "nocturno", "nombre": "Buceo nocturno", "dop": 4650}],
      "preguntas": ["buzoOSnorkel", "nivel", "ultimoBuceo", "emergencia", "conQuien"],
      "reserva": {"monto": 5000, "nota": "Depósito de RD$5,000 para separar. No reembolsable."},
      "habitaciones": ["Sencilla 1", "Sencilla 2", "Sencilla 3", "Doble 1", "Doble 2", "Doble 3", "Doble 4"],
      "requisito": "",
      "pendientes": ["Crear grupo de WhatsApp", "Confirmar habitaciones con el hotel", "Asignar habitaciones"],
      "recordatorios": [{"dias": 21, "texto": "Cobrar el completivo a los que solo pagaron la reserva"},
                        {"dias": 7, "texto": "Asignar habitaciones y confirmarlas con El Cayito"}],
      "mensajeGrupo": ""
    }$j$::jsonb);
  end if;

  if not exists (select 1 from public.viajes_recordatorios where tipo = 'general') then
    insert into public.viajes_recordatorios (tipo, dias, texto, para, correo, orden) values
      ('general', 30, 'Falta 1 mes: publicar el viaje y abrir la inscripción', '[]', true, 1),
      ('general', 7, 'Falta 1 semana: cobrarle a los que no han pagado', '[]', true, 2),
      ('general', 1, 'Mañana es el viaje: mandar el mensaje al grupo', '[]', false, 3),
      ('general', -1, 'Ya pasó el viaje: marcar asistencia y poner los números reales', '[]', true, 4);
  end if;
end $$;

-- (5) Permisos: a los Administradores se les encienden todos los de Viajes.
update public.profiles
   set permisos = coalesce(permisos, '{}'::jsonb) || jsonb_build_object(
     'viajes_editar', true, 'viajes_inscribir', true, 'viajes_grupo', true, 'viajes_pagos', true,
     'viajes_buzos', true, 'viajes_web', true, 'viajes_conciliar', true, 'viajes_numeros', true,
     'viajes_cerrar', true, 'viajes_bitacora', true, 'viajes_estadisticas', true)
 where is_admin and not (coalesce(permisos, '{}'::jsonb) ? 'viajes_editar');

-- Resumen.
select
  (select count(*) from public.viajes_catalogo) as viajes_en_catalogo,
  (select count(*) from public.viajes_recordatorios where tipo = 'general') as recordatorios_generales,
  (select count(*) from public.profiles where is_admin and coalesce((permisos->>'viajes_conciliar')::boolean, false)) as admins_con_viajes;
