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
