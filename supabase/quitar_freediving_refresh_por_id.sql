-- 18-nov-2026: el link de registro y el app Gus Dive (en vivo) traen estos dos
-- cursos con estos id. Si el PASO 1 no devuelve nada, este SQL se está corriendo
-- en otro proyecto de Supabase (no en el que usa el app).

-- PASO 1 (solo ver):
select id, nombre, activo, en_link
from public.est_cursos
where id in ('0a7bb82a-772d-4434-8356-7d8605a6bb2c', '8c76024b-1afa-44de-bb26-509b309c2d5a');

-- PASO 2 (los pasa a "Quitados"; no borra nada):
update public.est_cursos
  set activo = false, actualizado_en = now()
  where id in ('0a7bb82a-772d-4434-8356-7d8605a6bb2c', '8c76024b-1afa-44de-bb26-509b309c2d5a')
  returning id, nombre, activo;
