-- migration_62.sql  (V31, entregada con v60)
-- Tres cosas, independientes entre sí:
--
-- (1) Eliminar cuentas desde la app (pedido explícito: "para poder borrar
--     cuentas directamente desde el app en vez de ir a supabase"; decidido:
--     borrar la cuenta y CONSERVAR todo lo que registró, con su nombre).
--     Hasta ahora casi todas las tablas apuntaban a auth.users sin
--     "on delete", así que Supabase no dejaba borrar a nadie con actividad
--     ("Database error deleting user"). Ahora apuntan a public.profiles, y
--     el perfil ya no se borra junto con la cuenta: queda marcado como
--     eliminado (eliminado_en) para que sus registros sigan mostrando su
--     nombre. La cuenta de acceso (auth.users) sí se borra: esa persona ya
--     no puede entrar.
--
-- (2) Limpieza de ediciones vacías (pedido explícito: "borra si, así tenemos
--     menos cargada la base de datos"): borra de cambios_historial las
--     ediciones guardadas sin ningún cambio real (Antes y Después iguales).
--     Son todas de antes del 6-oct-2026: desde v53 la app ya no las guarda,
--     solo las ocultaba. Mismo criterio exacto que lib/cambios.js
--     (hayCambioReal). Las anulaciones y las ediciones reales no se tocan.
--
-- (3) Quita la columna clientes_equipos.numero (migration_58.sql, "número de
--     cliente"): el usuario decidió no usarla ("lo único que me interesa es
--     el número de contacto"). La app ya no la muestra desde v59. Se pierde
--     lo que se haya escrito ahí.

-- (1) ------------------------------------------------------------------
alter table public.profiles add column if not exists eliminado_en timestamptz;

do $$
declare
  c record;
  cols text;
begin
  for c in
    select con.oid, con.conname, con.conrelid::regclass as tabla
    from pg_constraint con
    join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = con.conrelid)
    where con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
      and n.nspname = 'public'
  loop
    select string_agg(quote_ident(a.attname), ', ' order by k.ord)
      into cols
      from unnest((select conkey from pg_constraint where oid = c.oid)) with ordinality as k(attnum, ord)
      join pg_attribute a on a.attrelid = c.tabla and a.attnum = k.attnum;

    execute format('alter table %s drop constraint %I', c.tabla, c.conname);

    -- El perfil (profiles.id) no lleva llave hacia sí mismo.
    if c.tabla::text <> 'profiles' then
      execute format(
        'alter table %s add constraint %I foreign key (%s) references public.profiles(id) not valid',
        c.tabla, c.conname, cols
      );
    end if;
  end loop;
end $$;

-- (2) ------------------------------------------------------------------
create or replace function public.normalizar_valor_cambio(v jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  t text;
  out_obj jsonb := '{}'::jsonb;
  out_arr jsonb := '[]'::jsonb;
  k text;
  n jsonb;
  e jsonb;
begin
  if v is null or v = 'null'::jsonb or v = 'false'::jsonb then
    return null;
  end if;
  case jsonb_typeof(v)
    when 'string' then
      t := btrim(v #>> '{}');
      return case when t = '' then null else to_jsonb(t) end;
    when 'array' then
      if jsonb_array_length(v) = 0 then return null; end if;
      for e in select value from jsonb_array_elements(v) loop
        out_arr := out_arr || jsonb_build_array(coalesce(public.normalizar_valor_cambio(e), 'null'::jsonb));
      end loop;
      return out_arr;
    when 'object' then
      for k in select key from jsonb_object_keys(v) as key loop
        if k in ('updated_at', 'created_at', 'actualizado_en') then continue; end if;
        n := public.normalizar_valor_cambio(v -> k);
        if n is not null then out_obj := out_obj || jsonb_build_object(k, n); end if;
      end loop;
      return case when out_obj = '{}'::jsonb then null else out_obj end;
    else
      return v;
  end case;
end;
$$;

create or replace function public.hay_cambio_real(antes jsonb, despues jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
begin
  if despues is null or jsonb_typeof(despues) <> 'object' then return true; end if;
  for k in select key from jsonb_object_keys(despues) as key loop
    if k in ('updated_at', 'created_at', 'actualizado_en') then continue; end if;
    if public.normalizar_valor_cambio(coalesce(antes, '{}'::jsonb) -> k)
       is distinct from public.normalizar_valor_cambio(despues -> k) then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

delete from public.cambios_historial
  where accion = 'editar'
    and datos_nuevos is not null
    and not public.hay_cambio_real(datos_anteriores, datos_nuevos);

-- (3) ------------------------------------------------------------------
alter table public.clientes_equipos drop column if exists numero;
