-- Reiniciar el folio de "Mantenimiento de reguladores" (App Interno).
-- PASO 2: cambia los números. No borra nada: renumera los mantenimientos
-- desde el #1, en el orden en que se registraron, y el próximo sale con el
-- número que sigue (hoy hay uno, el #4: queda #1 y el próximo sale #2).
begin;
-- primero en negativo, para que los números no choquen mientras se cambian
update public.mantenimientos_reguladores set folio = -folio;
with orden as (
  select id, row_number() over (order by created_at, id) as n
    from public.mantenimientos_reguladores
)
update public.mantenimientos_reguladores m set folio = o.n from orden o where o.id = m.id;
select setval('public.mantenimientos_folio_seq',
              coalesce((select max(folio) from public.mantenimientos_reguladores), 0) + 1, false) as proximo_folio;
commit;
