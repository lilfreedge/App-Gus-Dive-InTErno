-- migration_59.sql  (V31, entregada con v60)
-- Arreglo de migration_57.sql.
--
-- migration_57.sql (v57) cambiaba presion_intermedia (boolean -> text) y
-- o_rings (text -> jsonb) en mantenimientos_reguladores, pero falla en
-- Postgres con "cannot alter type of a column used by a view or rule":
-- la vista mantenimientos_con_nombre (select m.*) depende de esas columnas.
-- Como el SQL Editor de Supabase corre todo junto, si salió ese error no
-- se aplicó nada y la pantalla de mantenimiento de reguladores no puede
-- guardar la presión escrita ("135 psi") ni los o-rings nuevos.
--
-- Esta migración hace lo mismo que la 57, pero bien: quita la vista,
-- cambia los tipos SOLO si todavía no se cambiaron (se puede correr
-- aunque la 57 sí haya funcionado) y vuelve a crear la vista igual que
-- en migration_51.sql (drop + create, nunca create or replace).

drop view if exists public.mantenimientos_con_nombre;

do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'mantenimientos_reguladores'
        and column_name = 'presion_intermedia') = 'boolean' then
    alter table public.mantenimientos_reguladores alter column presion_intermedia drop default;
    alter table public.mantenimientos_reguladores alter column presion_intermedia drop not null;
    alter table public.mantenimientos_reguladores
      alter column presion_intermedia type text
      using case when presion_intermedia = true then 'Sí' else null end;
  end if;

  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'mantenimientos_reguladores'
        and column_name = 'o_rings') = 'text' then
    alter table public.mantenimientos_reguladores
      alter column o_rings type jsonb
      using case
        when o_rings is null or trim(o_rings) = '' then null::jsonb
        else jsonb_build_array(jsonb_build_object('descripcion', trim(o_rings), 'parte', ''))
      end;
  end if;
end $$;

create view public.mantenimientos_con_nombre
  with (security_invoker = on) as
  select m.*, coalesce(m.nombre_usuario_snapshot, p.full_name) as full_name
  from public.mantenimientos_reguladores m
  join public.profiles p on p.id = m.user_id
  order by m.created_at desc;

grant select on public.mantenimientos_con_nombre to authenticated;
