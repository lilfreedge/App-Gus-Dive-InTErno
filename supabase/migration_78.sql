-- =====================================================================
-- migration_78.sql -- Control Estudiantes (app nuevo). Se puede correr más
-- de una vez. No borra ni cambia datos que ya existan: solo agrega.
--
-- Pedido (31-oct-2026): "Quiero que empieces a trabajar en un nuevo espacio
-- que tendremos. Se llamará 'Control Estudiantes' ... fíjate en el sheet
-- llamado 'Control Estudiantes' en mi drive ... hagamos algo similar como
-- hicimos con el app de buceo, que se le puede enviar enlace a los
-- estudiantes". Respuestas (1-nov): permisos como en Buceos ("47. si"),
-- pago completo con abonos ("50"), el estudiante y el buzo son la misma
-- persona en los dos apps ("53. si y viceversa"), "Descargo" pasa a ser
-- "Record de entrenamiento" ("54"), y un listado de interesados.
--
-- Trae:
--   1. est_puede(): quién puede qué (acceso_estudiantes + permisos).
--   2. Datos nuevos en la ficha de cada buzo (viajes_buzos), que comparten
--      Buceos y Control Estudiantes: fecha de nacimiento, dirección, foto y
--      foto de la cédula.
--   3. Tablas: est_cursos, est_instructores, est_estudiantes (cada curso que
--      toma una persona), est_interesados y est_bitacora.
--   4. Quién puede ver y cambiar cada cosa (RLS).
--   5. Bucket privado "estudiantes-docs" (fotos, cédulas, comprobantes).
--   6. Los cursos e instructores del sheet (pestaña DB), solo si la tabla
--      está vacía.
--   7. Acceso al app encendido para el Titular y los administradores. A los
--      demás se les da en "Accesos a apps".
-- =====================================================================

-- 1. Permisos ------------------------------------------------------------
create or replace function public.est_puede(p_clave text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select p.es_titular
        or (
          coalesce((p.permisos->>'acceso_estudiantes')::boolean, false)
          and (
            p_clave is null
            or p.is_admin
            or coalesce((p.permisos->>p_clave)::boolean, false)
          )
        )
      from public.profiles p
     where p.id = auth.uid()
  ), false);
$$;
grant execute on function public.est_puede(text) to authenticated;

-- 2. La ficha compartida con Buceos ---------------------------------------
alter table public.viajes_buzos add column if not exists fecha_nacimiento date;
alter table public.viajes_buzos add column if not exists direccion text;
alter table public.viajes_buzos add column if not exists foto text;            -- ruta en estudiantes-docs
alter table public.viajes_buzos add column if not exists documento_foto text;  -- ruta en estudiantes-docs

-- 3. Tablas ---------------------------------------------------------------
create table if not exists public.est_cursos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  escuelas jsonb not null default '["SNSI", "PADI"]'::jsonb,
  precio numeric,                                   -- RD$; vacío = sin precio
  pasos jsonb not null default '[]'::jsonb,         -- claves que aplican (ver lib/estudiantes/modelo.js)
  lleva_examen boolean not null default true,
  activo boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.est_instructores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activo boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists public.est_estudiantes (
  id uuid primary key default gen_random_uuid(),
  buzo_id uuid not null references public.viajes_buzos(id) on delete restrict,
  curso_id uuid references public.est_cursos(id) on delete set null,
  curso text not null,                              -- el nombre, por si el curso cambia
  escuela text,
  instructor text,
  fecha_inicio date,
  buceos_previos integer,
  pasos jsonb not null default '{}'::jsonb,         -- { clave: 'listo' | 'pendiente' | 'na' }
  examen text not null default 'pendiente'
    check (examen in ('pendiente', 'aprobado', 'repetir', 'reprobado', 'no_terminara', 'revisar', 'na')),
  precio numeric,
  pagos jsonb not null default '[]'::jsonb,         -- [{ id, fecha, monto, forma, por, conciliado, nota }]
  comprobantes jsonb not null default '[]'::jsonb,  -- [{ ruta, nombre, subido_en, via }]
  etapas jsonb not null default '{}'::jsonb,        -- { mandado, recibido, drive, procesado, cert, avisado, entregada, pago_instructor: { en, por } }
  numero_certificacion text,
  seguimiento jsonb not null default '[]'::jsonb,   -- [{ texto, por, en }]
  firma text,                                       -- ruta de la firma (si la firma el estudiante)
  estado text not null default 'curso'
    check (estado in ('curso', 'almacen', 'certificacion', 'avisado', 'entregada', 'cancelado')),
  via text not null default 'mano' check (via in ('link', 'mano')),
  interesado_id uuid,
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists est_estudiantes_buzo_idx on public.est_estudiantes (buzo_id);
create index if not exists est_estudiantes_estado_idx on public.est_estudiantes (estado);

create table if not exists public.est_interesados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  celular text,                                     -- solo dígitos
  curso text,
  cuando text,
  fuente text,                                      -- Instagram, pasó por la tienda, referido…
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'escribimos', 'va', 'inscrito', 'no')),
  recordar date,
  nota text not null default '',
  estudiante_id uuid references public.est_estudiantes(id) on delete set null,
  via text not null default 'mano' check (via in ('link', 'mano')),
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists est_interesados_estado_idx on public.est_interesados (estado);

create table if not exists public.est_bitacora (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid,                               -- sin FK: queda aunque se borre el estudiante
  user_id uuid references auth.users(id) on delete set null,
  nombre text,
  texto text not null,
  antes text,
  despues text,
  creado_en timestamptz not null default now()
);
create index if not exists est_bitacora_estudiante_idx on public.est_bitacora (estudiante_id);

-- 4. RLS ------------------------------------------------------------------
alter table public.est_cursos enable row level security;
alter table public.est_instructores enable row level security;
alter table public.est_estudiantes enable row level security;
alter table public.est_interesados enable row level security;
alter table public.est_bitacora enable row level security;

drop policy if exists "est_cursos ver" on public.est_cursos;
create policy "est_cursos ver" on public.est_cursos for select to authenticated using (public.est_puede());
drop policy if exists "est_cursos crear" on public.est_cursos;
create policy "est_cursos crear" on public.est_cursos for insert to authenticated with check (public.est_puede('est_cursos'));
drop policy if exists "est_cursos editar" on public.est_cursos;
create policy "est_cursos editar" on public.est_cursos for update to authenticated using (public.est_puede('est_cursos'));

drop policy if exists "est_instructores ver" on public.est_instructores;
create policy "est_instructores ver" on public.est_instructores for select to authenticated using (public.est_puede());
drop policy if exists "est_instructores crear" on public.est_instructores;
create policy "est_instructores crear" on public.est_instructores for insert to authenticated with check (public.est_puede('est_cursos'));
drop policy if exists "est_instructores editar" on public.est_instructores;
create policy "est_instructores editar" on public.est_instructores for update to authenticated using (public.est_puede('est_cursos'));

drop policy if exists "est_estudiantes ver" on public.est_estudiantes;
create policy "est_estudiantes ver" on public.est_estudiantes for select to authenticated using (public.est_puede());
drop policy if exists "est_estudiantes crear" on public.est_estudiantes;
create policy "est_estudiantes crear" on public.est_estudiantes for insert to authenticated with check (public.est_puede('est_estudiantes'));
drop policy if exists "est_estudiantes editar" on public.est_estudiantes;
create policy "est_estudiantes editar" on public.est_estudiantes for update to authenticated using (
  public.est_puede('est_estudiantes') or public.est_puede('est_pagos') or public.est_puede('est_conciliar')
  or public.est_puede('est_almacen') or public.est_puede('est_entregar') or public.est_puede('est_pago_instructor')
);
drop policy if exists "est_estudiantes borrar" on public.est_estudiantes;
create policy "est_estudiantes borrar" on public.est_estudiantes for delete to authenticated using (public.is_titular());

drop policy if exists "est_interesados ver" on public.est_interesados;
create policy "est_interesados ver" on public.est_interesados for select to authenticated using (public.est_puede('est_interesados') or public.est_puede('est_estudiantes'));
drop policy if exists "est_interesados crear" on public.est_interesados;
create policy "est_interesados crear" on public.est_interesados for insert to authenticated with check (public.est_puede('est_interesados'));
drop policy if exists "est_interesados editar" on public.est_interesados;
create policy "est_interesados editar" on public.est_interesados for update to authenticated using (public.est_puede('est_interesados') or public.est_puede('est_estudiantes'));
drop policy if exists "est_interesados borrar" on public.est_interesados;
create policy "est_interesados borrar" on public.est_interesados for delete to authenticated using (public.est_puede('est_interesados'));

drop policy if exists "est_bitacora ver" on public.est_bitacora;
create policy "est_bitacora ver" on public.est_bitacora for select to authenticated using (public.est_puede());
drop policy if exists "est_bitacora escribir" on public.est_bitacora;
create policy "est_bitacora escribir" on public.est_bitacora for insert to authenticated with check (public.est_puede());

-- La ficha de cada buzo: además de lo que ya permite Buceos, la ve quien
-- entra a Control Estudiantes, y la crea o cambia quien registra estudiantes.
drop policy if exists "viajes_buzos ver (estudiantes)" on public.viajes_buzos;
create policy "viajes_buzos ver (estudiantes)" on public.viajes_buzos for select to authenticated using (public.est_puede());
drop policy if exists "viajes_buzos crear (estudiantes)" on public.viajes_buzos;
create policy "viajes_buzos crear (estudiantes)" on public.viajes_buzos for insert to authenticated with check (public.est_puede('est_estudiantes'));
drop policy if exists "viajes_buzos editar (estudiantes)" on public.viajes_buzos;
create policy "viajes_buzos editar (estudiantes)" on public.viajes_buzos for update to authenticated using (public.est_puede('est_estudiantes'));

-- 5. Archivos -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('estudiantes-docs', 'estudiantes-docs', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "estudiantes docs ver" on storage.objects;
create policy "estudiantes docs ver" on storage.objects for select to authenticated
  using (bucket_id = 'estudiantes-docs' and public.est_puede());
drop policy if exists "estudiantes docs subir" on storage.objects;
create policy "estudiantes docs subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'estudiantes-docs' and (public.est_puede('est_estudiantes') or public.est_puede('est_pagos')));

-- 6. Cursos e instructores del sheet (pestaña DB) -------------------------
insert into public.est_cursos (nombre, escuelas, pasos, lleva_examen, orden)
select v.nombre, v.escuelas::jsonb, v.pasos::jsonb, v.examen, v.orden
  from (values
    ('Open Water Diver', '["SNSI","PADI"]', '["teoria1","teoria2","teoria3","piscina","caleta1","caleta2","record","identificacion","foto","equipos","gorra"]', true, 1),
    ('OWD + Nitrox', '["SNSI","PADI"]', '["teoria1","teoria2","teoria3","piscina","caleta1","caleta2","record","identificacion","foto","equipos","gorra"]', true, 2),
    ('Advanced OWD', '["SNSI","PADI"]', '["teoria1","teoria2","teoria3","caleta1","caleta2","record","identificacion","foto","equipos","gorra"]', true, 3),
    ('Rescue Diver', '["SNSI","PADI"]', '["teoria1","teoria2","teoria3","piscina","caleta1","caleta2","record","identificacion","foto","equipos","gorra"]', true, 4),
    ('Divemaster', '["SNSI","PADI"]', '["teoria1","teoria2","teoria3","piscina","caleta1","caleta2","record","identificacion","foto","equipos","gorra"]', true, 5),
    ('Instructor Course', '["SNSI","PADI"]', '["teoria1","teoria2","teoria3","piscina","caleta1","caleta2","record","identificacion","foto","equipos","gorra"]', true, 6),
    ('Nitrox', '["SNSI","PADI"]', '["teoria1","record","identificacion","foto"]', true, 7),
    ('Refresh OWD', '["SNSI","PADI"]', '["piscina","caleta1","record","identificacion","foto","equipos"]', false, 8),
    ('Freediving', '["PADI"]', '["teoria1","piscina","caleta1","record","identificacion","foto","equipos"]', true, 9),
    ('Pez León', '["SNSI"]', '["teoria1","caleta1","record","identificacion","foto"]', false, 10)
  ) as v(nombre, escuelas, pasos, examen, orden)
 where not exists (select 1 from public.est_cursos);

insert into public.est_instructores (nombre, orden)
select v.nombre, v.orden
  from (values
    ('Gustavo Torreira Martínez', 1),
    ('Andrés Gerardo Aquino', 2),
    ('Rebecca García', 3),
    ('Wilson Suarez', 4),
    ('Wascar Rosa', 5)
  ) as v(nombre, orden)
 where not exists (select 1 from public.est_instructores);

-- 7. Acceso al app ----------------------------------------------------------
update public.profiles
   set permisos = coalesce(permisos, '{}'::jsonb) || jsonb_build_object('acceso_estudiantes', true)
 where (es_titular or is_admin)
   and not (coalesce(permisos, '{}'::jsonb) ? 'acceso_estudiantes');

select
  (select count(*) from public.est_cursos) as cursos,
  (select count(*) from public.est_instructores) as instructores,
  (select count(*) from public.profiles where coalesce((permisos->>'acceso_estudiantes')::boolean, false)) as con_acceso_a_estudiantes;
