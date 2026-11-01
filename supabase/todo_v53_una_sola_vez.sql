-- =====================================================================
-- todo_v53_una_sola_vez.sql -- V52 + V53. TODO EN UNO, PARA UNA SOLA CORRIDA.
--
-- Pedido (1-nov-2026): "me falta correr los códigos en supabase, dámelos
-- juntos para hacer una sola corrida". Trae, en orden:
--   1  migraciones 73 a 77 (V50, V51 y V52: notas internas, borrador del
--      informe, avisos fijos, manuales, la campanita, borrar buceos,
--      profundímetro, textos del aviso del equipo)
--   2  migration_78 (V53: Control Estudiantes)
--   3  folios de Inspecciones visuales, Salidas, Solicitudes al almacén y
--      Mantenimiento de reguladores desde el #1 -- SOLO si todavía no se
--      reiniciaron (si el más viejo ya es el #1, no se toca)
--   4  una tablita con el resumen
--
-- Se puede correr aunque ya hayas corrido algo de esto, y más de una vez.
-- No borra datos.
-- =====================================================================


-- ####################################################################
-- 1. Migraciones 73 a 77
-- ####################################################################
-- =====================================================================
-- migraciones_73_a_77_combinado.sql -- V50, V51 y V52. TODO EN UNO.
--
-- Pedido (31-oct-2026): "las migraciones pásamelas junto para correrlo en
-- supabase". Aquí van juntas, en orden:
--   73  Buceos: textos del aviso del equipo (V45; solo cambia los que
--       siguen con el texto viejo)
--   74  Profundímetro en los reguladores de alquiler (V49)
--   75  V50: notas internas de las órdenes, borrador del informe,
--       componentes del regulador al darle mantenimiento, restaurar
--       solicitudes borradas
--   76  V51: avisos fijos y manuales
--   77  V52: notificaciones (la campanita) y borrar buceos (solo Titular)
--
-- Se puede correr aunque ya hayas corrido alguna (por ejemplo la 73 o la
-- 74), y más de una vez, sin problema. No borra datos.
-- =====================================================================


-- ####################################################################
-- migration_73.sql
-- ####################################################################
-- =====================================================================
-- migration_73.sql -- Viajes/Buceos: textos del aviso del equipo (V45).
-- Se puede correr más de una vez sin problema. No borra nada.
--
-- Cambia SOLO el aviso del equipo ("nota") del catálogo y de los viajes
-- ya creados, y solo si el texto sigue exactamente como lo cargó
-- migration_71.sql. Si alguien ya lo había cambiado a mano, no se toca.
--
-- Pedido explícito (27-oct-2026): quitar los dos puntos, decir "buceo" en
-- vez de "viaje", "Si te hace falta equipo en Gus contamos con equipos para
-- alquilar", y los textos nuevos de Tiburones y de "Buzo + equipo".
-- =====================================================================

-- (1) La Caleta y Salinas
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('Este buceo no incluye alquiler de equipo. ¿Te falta algo? En Gus tenemos equipos para alquilar.'::text))
 where datos->'equipo'->>'nota' = 'Este viaje no incluye alquiler de equipo: trae tu equipo completo.';
update public.viajes
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('Este buceo no incluye alquiler de equipo. ¿Te falta algo? En Gus tenemos equipos para alquilar.'::text))
 where datos->'equipo'->>'nota' = 'Este viaje no incluye alquiler de equipo: trae tu equipo completo.';

-- (2) La Caleta Nocturno
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('Este buceo no incluye alquiler de equipo. No olvides tu linterna. ¿Te falta algo? En Gus tenemos equipos para alquilar.'::text))
 where datos->'equipo'->>'nota' = 'Este viaje no incluye alquiler de equipo: trae tu equipo completo (y tu linterna).';
update public.viajes
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('Este buceo no incluye alquiler de equipo. No olvides tu linterna. ¿Te falta algo? En Gus tenemos equipos para alquilar.'::text))
 where datos->'equipo'->>'nota' = 'Este viaje no incluye alquiler de equipo: trae tu equipo completo (y tu linterna).';

-- (3) Tiburones
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('No incluye equipo. Puedes alquilarlo en la tienda o pagar US$35 adicional para alquilarlo directo en el punto de buceo. Los tanques y pesas se entregan allá.'::text))
 where datos->'equipo'->>'nota' = 'No incluye equipo: se alquila en la tienda o allá directo (US$35). Los tanques y pesas se entregan en el punto de buceo.';
update public.viajes
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('No incluye equipo. Puedes alquilarlo en la tienda o pagar US$35 adicional para alquilarlo directo en el punto de buceo. Los tanques y pesas se entregan allá.'::text))
 where datos->'equipo'->>'nota' = 'No incluye equipo: se alquila en la tienda o allá directo (US$35). Los tanques y pesas se entregan en el punto de buceo.';

-- (4) Bayahibe, Bayahibe Avanzado e Isla Catalina
update public.viajes_catalogo
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('No incluye equipo. Si te falta equipo, elige “Buzo + equipo” (US$10 adicional).'::text))
 where datos->'equipo'->>'nota' = 'No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más).';
update public.viajes
   set datos = jsonb_set(datos, '{equipo,nota}', to_jsonb('No incluye equipo. Si te falta equipo, elige “Buzo + equipo” (US$10 adicional).'::text))
 where datos->'equipo'->>'nota' = 'No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más).';

-- Para revisar (sale abajo después de correrlo): cuántos quedaron con el
-- texto nuevo y cuántos todavía tienen el viejo (debería ser 0).
select
  (select count(*) from public.viajes_catalogo where datos->'equipo'->>'nota' in ('Este buceo no incluye alquiler de equipo. ¿Te falta algo? En Gus tenemos equipos para alquilar.', 'Este buceo no incluye alquiler de equipo. No olvides tu linterna. ¿Te falta algo? En Gus tenemos equipos para alquilar.', 'No incluye equipo. Puedes alquilarlo en la tienda o pagar US$35 adicional para alquilarlo directo en el punto de buceo. Los tanques y pesas se entregan allá.', 'No incluye equipo. Si te falta equipo, elige “Buzo + equipo” (US$10 adicional).')) as catalogo_nuevo,
  (select count(*) from public.viajes          where datos->'equipo'->>'nota' in ('Este buceo no incluye alquiler de equipo. ¿Te falta algo? En Gus tenemos equipos para alquilar.', 'Este buceo no incluye alquiler de equipo. No olvides tu linterna. ¿Te falta algo? En Gus tenemos equipos para alquilar.', 'No incluye equipo. Puedes alquilarlo en la tienda o pagar US$35 adicional para alquilarlo directo en el punto de buceo. Los tanques y pesas se entregan allá.', 'No incluye equipo. Si te falta equipo, elige “Buzo + equipo” (US$10 adicional).')) as viajes_nuevo,
  (select count(*) from public.viajes_catalogo where datos->'equipo'->>'nota' in ('Este viaje no incluye alquiler de equipo: trae tu equipo completo.', 'Este viaje no incluye alquiler de equipo: trae tu equipo completo (y tu linterna).', 'No incluye equipo: se alquila en la tienda o allá directo (US$35). Los tanques y pesas se entregan en el punto de buceo.', 'No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más).'))
  + (select count(*) from public.viajes        where datos->'equipo'->>'nota' in ('Este viaje no incluye alquiler de equipo: trae tu equipo completo.', 'Este viaje no incluye alquiler de equipo: trae tu equipo completo (y tu linterna).', 'No incluye equipo: se alquila en la tienda o allá directo (US$35). Los tanques y pesas se entregan en el punto de buceo.', 'No incluye equipo. Si te falta equipo, escoge “Buzo + equipo” (US$10 más).')) as todavia_viejo;


-- ####################################################################
-- migration_74.sql
-- ####################################################################
-- =====================================================================
-- migration_74.sql -- App Interno: Profundímetro en los reguladores de
-- alquiler (V49). Se puede correr más de una vez. No borra ni cambia nada:
-- solo agrega la columna.
--
-- Pedido explícito (nota "App Gus interno", 28-oct-2026): "En app interno,
-- al editar o agregar un equipo de alquiler, incluye la parte de
-- profundímetro".
-- =====================================================================
alter table public.reguladores_alquiler add column if not exists profundimetro text;


-- ####################################################################
-- migration_75.sql
-- ####################################################################
-- =====================================================================
-- migration_75.sql -- V50 (nota "App Gus interno", respuestas del
-- 30-oct-2026 a la maqueta maqueta-v50-notas.html). Se puede correr más de
-- una vez. No borra ni cambia datos que ya existan: solo agrega tablas,
-- columnas y un trigger.
--
--   (1) ordenes_notas_internas  notas internas de cada orden ("solo es para
--       casos internos. Por si dejo el regulador o cualquier cosa en un
--       lugar particular"). Las ve y escribe cualquiera ("si. Cualquiera
--       puede"); el cliente nunca. Cada quien quita las suyas; el Titular y
--       los administradores, cualquiera.
--   (2) informes_borrador  el informe de mantenimiento que se va guardando
--       solo mientras se llena ("Excelente"). Cuando se guarda el informe de
--       verdad, su borrador se quita (ya no hace falta).
--   (3) Componentes del regulador al registrar su mantenimiento ("si"):
--       columna componentes_cambios en mantenimientos_reguladores y un
--       trigger que le pone al regulador el componente nuevo.
--   (4) profundimetro en reguladores_alquiler (por si migration_74.sql no
--       se corrió todavía).
--   (5) Solicitudes al almacén: el Titular las puede borrar desde la app
--       (eso ya lo dejaba la base de datos) y restaurarlas desde el
--       Historial. Para restaurar una que hizo otra persona hace falta este
--       permiso nuevo (solo el Titular).
-- =====================================================================

-- (1) Notas internas de las órdenes ----------------------------------------
create table if not exists public.ordenes_notas_internas (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_equipos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  nombre text not null default '',
  texto text not null check (length(trim(texto)) > 0),
  creado_en timestamptz not null default now()
);
create index if not exists ordenes_notas_internas_orden_idx on public.ordenes_notas_internas (orden_id, creado_en desc);

alter table public.ordenes_notas_internas enable row level security;

drop policy if exists "notas internas ver" on public.ordenes_notas_internas;
create policy "notas internas ver" on public.ordenes_notas_internas
  for select to authenticated using (true);

drop policy if exists "notas internas escribir" on public.ordenes_notas_internas;
create policy "notas internas escribir" on public.ordenes_notas_internas
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "notas internas quitar" on public.ordenes_notas_internas;
create policy "notas internas quitar" on public.ordenes_notas_internas
  for delete to authenticated using (user_id = auth.uid() or public.is_titular() or public.is_admin());

-- (2) Borrador del informe de mantenimiento ----------------------------------
create table if not exists public.informes_borrador (
  orden_id uuid primary key references public.ordenes_equipos(id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  nombre text not null default ''
);

alter table public.informes_borrador enable row level security;

drop policy if exists "informes borrador ver" on public.informes_borrador;
create policy "informes borrador ver" on public.informes_borrador
  for select to authenticated using (true);

drop policy if exists "informes borrador crear" on public.informes_borrador;
create policy "informes borrador crear" on public.informes_borrador
  for insert to authenticated with check (
    public.is_titular() or public.is_admin() or public.tiene_permiso('equipos_clientes_informe_mantenimiento')
  );

drop policy if exists "informes borrador editar" on public.informes_borrador;
create policy "informes borrador editar" on public.informes_borrador
  for update to authenticated using (
    public.is_titular() or public.is_admin() or public.tiene_permiso('equipos_clientes_informe_mantenimiento')
  );

drop policy if exists "informes borrador quitar" on public.informes_borrador;
create policy "informes borrador quitar" on public.informes_borrador
  for delete to authenticated using (
    public.is_titular() or public.is_admin() or public.tiene_permiso('equipos_clientes_informe_mantenimiento')
  );

-- (4) Profundímetro (igual que migration_74.sql) ------------------------------
alter table public.reguladores_alquiler add column if not exists profundimetro text;

-- (3) Componentes que cambiaron en el mantenimiento -------------------------
-- La vista mantenimientos_con_nombre usa "select m.*": se quita y se vuelve
-- a crear igual que en migration_59.sql (drop + create, nunca create or
-- replace) para que traiga la columna nueva.
drop view if exists public.mantenimientos_con_nombre;

alter table public.mantenimientos_reguladores add column if not exists componentes_cambios jsonb;

create view public.mantenimientos_con_nombre
  with (security_invoker = on) as
  select m.*, coalesce(m.nombre_usuario_snapshot, p.full_name) as full_name
  from public.mantenimientos_reguladores m
  join public.profiles p on p.id = m.user_id
  order by m.created_at desc;

grant select on public.mantenimientos_con_nombre to authenticated;

-- Al registrar un mantenimiento con componentes cambiados, el regulador
-- queda con el componente nuevo. "security definer" porque quien registra
-- mantenimientos (el técnico) no puede editar el catálogo de reguladores.
-- componentes_cambios = [{ "campo": "segunda_etapa", "etiqueta": "2da etapa",
--                          "antes": "Cressi XS2", "despues": "Apeks XTX50" }]
create or replace function public.aplicar_componentes_mantenimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb;
  v text;
begin
  if new.regulador_id is null
     or new.componentes_cambios is null
     or jsonb_typeof(new.componentes_cambios) <> 'array' then
    return null;
  end if;
  for c in select value from jsonb_array_elements(new.componentes_cambios) loop
    v := nullif(trim(coalesce(c->>'despues', '')), '');
    if v is null then
      continue;
    end if;
    case c->>'campo'
      when 'primera_etapa' then update public.reguladores_alquiler set primera_etapa = v where id = new.regulador_id;
      when 'segunda_etapa' then update public.reguladores_alquiler set segunda_etapa = v where id = new.regulador_id;
      when 'octopus' then update public.reguladores_alquiler set octopus = v where id = new.regulador_id;
      when 'manometro' then update public.reguladores_alquiler set manometro = v where id = new.regulador_id;
      when 'profundimetro' then update public.reguladores_alquiler set profundimetro = v where id = new.regulador_id;
      else null;
    end case;
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_componentes_mantenimiento on public.mantenimientos_reguladores;
create trigger trg_componentes_mantenimiento
  after insert on public.mantenimientos_reguladores
  for each row execute function public.aplicar_componentes_mantenimiento();

-- (5) Restaurar solicitudes borradas (solo el Titular) -----------------------
drop policy if exists "Titular restaura solicitudes" on public.solicitudes_almacen;
create policy "Titular restaura solicitudes" on public.solicitudes_almacen
  for insert to authenticated with check (public.is_titular());


-- ####################################################################
-- migration_76.sql
-- ####################################################################
-- =====================================================================
-- migration_76.sql -- V51: avisos fijos y manuales (maqueta
-- maqueta-v51-todo-junto.html, respuestas del 31-oct-2026). Se puede
-- correr más de una vez. No borra ni cambia datos que ya existan.
--
--   (1) avisos_fijos / avisos_fijos_leidos: avisos arriba del Inicio de App
--       Interno y de App Equipos de clientes. Los crean el Titular y los
--       administradores ("9. yo y administradores"). Tipos: fijo, se
--       repite y una sola vez ("15. si. Pero también pon una opción para
--       poner un reminder de one time"). Con "Listo" opcional; al marcarlo
--       le llega al que lo creó por celular y correo ("16. las dos"). Al
--       técnico solo le salen los que le asignen ("17").
--   (2) manuales + carpeta "manuales" (PDF): los mismos en los dos apps
--       ("20"); todos los ven, también el técnico; los agrega y quita el
--       Titular, o a quien le dé el permiso manuales_editar ("19. solo yo
--       por ahora pero pon para poder dar acceso").
-- =====================================================================

-- (1) Avisos fijos ------------------------------------------------------------
create table if not exists public.avisos_fijos (
  id uuid primary key default gen_random_uuid(),
  app text not null check (app in ('interno', 'clientes')),
  texto text not null check (length(trim(texto)) > 0),
  color text not null default 'amarillo' check (color in ('rojo', 'amarillo', 'azul')),
  tipo text not null default 'fijo' check (tipo in ('fijo', 'repite', 'una_vez')),
  hasta date,                                   -- fijo: último día (vacío = hasta que se quite)
  cada text check (cada in ('dia', 'semana', 'mes')),  -- se repite
  dia_semana integer check (dia_semana between 0 and 6), -- 0 = domingo
  dia_mes integer check (dia_mes between 1 and 31),
  fecha date,                                   -- una sola vez
  sigue_hasta_listo boolean not null default false, -- una sola vez: si no lo marcan, sigue saliendo
  para jsonb not null default '[]'::jsonb,      -- ids de perfiles; vacío = a todos menos los técnicos
  pide_listo boolean not null default false,
  activo boolean not null default true,
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado_por_nombre text not null default '',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists avisos_fijos_app_idx on public.avisos_fijos (app, activo);

create table if not exists public.avisos_fijos_leidos (
  aviso_id uuid not null references public.avisos_fijos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ocurrencia date not null,        -- qué vez del aviso (para los que se repiten)
  nombre text not null default '',
  leido_en timestamptz not null default now(),
  primary key (aviso_id, user_id, ocurrencia)
);

alter table public.avisos_fijos enable row level security;
alter table public.avisos_fijos_leidos enable row level security;

drop policy if exists "avisos fijos ver" on public.avisos_fijos;
create policy "avisos fijos ver" on public.avisos_fijos
  for select to authenticated using (true);
drop policy if exists "avisos fijos crear" on public.avisos_fijos;
create policy "avisos fijos crear" on public.avisos_fijos
  for insert to authenticated with check (public.is_titular() or public.is_admin());
drop policy if exists "avisos fijos editar" on public.avisos_fijos;
create policy "avisos fijos editar" on public.avisos_fijos
  for update to authenticated using (public.is_titular() or public.is_admin());
drop policy if exists "avisos fijos borrar" on public.avisos_fijos;
create policy "avisos fijos borrar" on public.avisos_fijos
  for delete to authenticated using (public.is_titular());

drop policy if exists "avisos leidos ver" on public.avisos_fijos_leidos;
create policy "avisos leidos ver" on public.avisos_fijos_leidos
  for select to authenticated using (true);
drop policy if exists "avisos leidos marcar" on public.avisos_fijos_leidos;
create policy "avisos leidos marcar" on public.avisos_fijos_leidos
  for insert to authenticated with check (user_id = auth.uid());

-- (2) Manuales ----------------------------------------------------------------
create or replace function public.puede_manuales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_titular()
    or coalesce((select (permisos->>'manuales_editar')::boolean from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.puede_manuales() to authenticated;

create table if not exists public.manuales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'Reguladores',
  marca text not null check (length(trim(marca)) > 0),
  modelos text not null check (length(trim(modelos)) > 0),  -- separados por coma
  descripcion text,
  archivo_path text,            -- PDF en la carpeta "manuales"
  url text,                     -- o un enlace
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.manuales enable row level security;

drop policy if exists "manuales ver" on public.manuales;
create policy "manuales ver" on public.manuales
  for select to authenticated using (true);
drop policy if exists "manuales crear" on public.manuales;
create policy "manuales crear" on public.manuales
  for insert to authenticated with check (public.puede_manuales());
drop policy if exists "manuales editar" on public.manuales;
create policy "manuales editar" on public.manuales
  for update to authenticated using (public.puede_manuales());
drop policy if exists "manuales quitar" on public.manuales;
create policy "manuales quitar" on public.manuales
  for delete to authenticated using (public.puede_manuales());

-- Carpeta privada para los PDF (hasta 50 MB cada uno).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manuales', 'manuales', false, 52428800, array['application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "manuales archivos ver" on storage.objects;
create policy "manuales archivos ver" on storage.objects
  for select to authenticated using (bucket_id = 'manuales');
drop policy if exists "manuales archivos subir" on storage.objects;
create policy "manuales archivos subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'manuales' and public.puede_manuales());
drop policy if exists "manuales archivos quitar" on storage.objects;
create policy "manuales archivos quitar" on storage.objects
  for delete to authenticated using (bucket_id = 'manuales' and public.puede_manuales());


-- ####################################################################
-- migration_77.sql
-- ####################################################################
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


-- ####################################################################
-- 2. migration_78.sql (Control Estudiantes)
-- ####################################################################
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



-- ####################################################################
-- 3. Folios desde el #1 (solo si todavía no se reiniciaron)
-- ####################################################################
-- Cada lista se renumera desde el #1 (en el orden en que se registraron)
-- solo si la más vieja todavía no es el #1. Si ya lo es, se deja quieta,
-- para no cambiarle el número a nada que ya se haya anotado.
do $$
begin
  if exists (select 1 from public.inspecciones_visuales)
     and (select folio from public.inspecciones_visuales order by created_at, id limit 1) <> 1 then
    update public.inspecciones_visuales set folio = -folio;
    with orden as (select id, row_number() over (order by created_at, id) as n from public.inspecciones_visuales)
    update public.inspecciones_visuales t set folio = o.n from orden o where o.id = t.id;
    perform setval('public.inspecciones_folio_seq', coalesce((select max(folio) from public.inspecciones_visuales), 0) + 1, false);
  end if;

  if exists (select 1 from public.salidas)
     and (select folio from public.salidas order by created_at, id limit 1) <> 1 then
    update public.salidas set folio = -folio;
    with orden as (select id, row_number() over (order by created_at, id) as n from public.salidas)
    update public.salidas t set folio = o.n from orden o where o.id = t.id;
    perform setval('public.salidas_folio_seq', coalesce((select max(folio) from public.salidas), 0) + 1, false);
  end if;

  if exists (select 1 from public.solicitudes_almacen)
     and (select folio from public.solicitudes_almacen order by created_at, id limit 1) <> 1 then
    update public.solicitudes_almacen set folio = -folio;
    with orden as (select id, row_number() over (order by created_at, id) as n from public.solicitudes_almacen)
    update public.solicitudes_almacen t set folio = o.n from orden o where o.id = t.id;
    perform setval('public.solicitudes_almacen_folio_seq', coalesce((select max(folio) from public.solicitudes_almacen), 0) + 1, false);
  end if;

  if exists (select 1 from public.mantenimientos_reguladores)
     and (select folio from public.mantenimientos_reguladores order by created_at, id limit 1) <> 1 then
    update public.mantenimientos_reguladores set folio = -folio;
    with orden as (select id, row_number() over (order by created_at, id) as n from public.mantenimientos_reguladores)
    update public.mantenimientos_reguladores t set folio = o.n from orden o where o.id = t.id;
    perform setval('public.mantenimientos_folio_seq', coalesce((select max(folio) from public.mantenimientos_reguladores), 0) + 1, false);
  end if;
end $$;


-- ####################################################################
-- 4. Resumen
-- ####################################################################
select 'Inspecciones visuales' as que, (select count(*) from public.inspecciones_visuales)::text as cuantos, ('próximo folio #' || (coalesce((select max(folio) from public.inspecciones_visuales), 0) + 1)) as detalle
union all select 'Salidas', (select count(*) from public.salidas)::text, 'próximo folio #' || (coalesce((select max(folio) from public.salidas), 0) + 1)
union all select 'Solicitudes al almacén', (select count(*) from public.solicitudes_almacen)::text, 'próximo folio #' || (coalesce((select max(folio) from public.solicitudes_almacen), 0) + 1)
union all select 'Mantenimiento de reguladores', (select count(*) from public.mantenimientos_reguladores)::text, 'próximo folio #' || (coalesce((select max(folio) from public.mantenimientos_reguladores), 0) + 1)
union all select 'Control Estudiantes: cursos', (select count(*) from public.est_cursos)::text, ''
union all select 'Control Estudiantes: instructores', (select count(*) from public.est_instructores)::text, ''
union all select 'Control Estudiantes: con acceso', (select count(*) from public.profiles where coalesce((permisos->>'acceso_estudiantes')::boolean, false))::text, 'el Titular y los administradores'
union all select 'Campanita (notificaciones)', case when to_regclass('public.notificaciones') is null then 'falta' else 'lista' end, '';
