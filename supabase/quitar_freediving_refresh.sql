-- 18-nov-2026 (97: "aún me sigue saliendo [Freediving], igualmente Refresh OWD").
-- El link de registro y el app Gus Dive leen la misma tabla que el Catálogo
-- (est_cursos, solo los activos). Si salen ahí, en la base siguen activos.
-- No borra nada: los pasa a "Quitados" (se pueden volver a poner desde el
-- Catálogo con "volver a ponerlo").

-- PASO 1 (solo para ver; no cambia nada):
select c.id, c.nombre, c.activo, c.en_link, c.orden,
  (select count(*) from public.est_estudiantes e where e.curso_id = c.id) as estudiantes,
  (select count(*) from public.est_fechas f where f.curso_id = c.id) as fechas
from public.est_cursos c
where lower(trim(c.nombre)) in ('freediving', 'refresh owd');

-- PASO 2 (los quita del Catálogo, del link y del app; se puede correr más de una vez):
update public.est_cursos
  set activo = false, actualizado_en = now()
  where lower(trim(nombre)) in ('freediving', 'refresh owd');
