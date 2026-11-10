-- =====================================================================
-- migration_93.sql  (V65, 9-nov-2026)
-- Link del estudiante, los cursos ("286. ok", maqueta V64):
-- 1) Por grupos y por niveles: Cursos de buceo (Open Water, Advanced, Rescue,
--    Divemaster, Instructor), Primeros auxilios (BLS, OXY), Especialidades
--    (Nitrox, Pez León y las nuevas) y Otros (Refresh, Freediving). Solo a los
--    que todavía no tienen grupo.
-- 2) "Open Water + Nitrox" y "BLS + OXY" ya no salen en el link (ahora es una
--    opción dentro de Open Water y de BLS). No se borran.
-- 3) La información de cada curso (la "i"), con los textos que mandó Pipe.
--    Solo si el curso todavía no tiene información.
-- 4) Los precios que mandó Pipe ("¿actualizo los precios?" → "ok").
-- Se puede correr más de una vez. No borra nada.
-- =====================================================================

alter table public.est_cursos add column if not exists grupo text;
alter table public.est_cursos add column if not exists info jsonb;
alter table public.est_cursos add column if not exists en_link boolean not null default true;

-- 1) Grupos y orden
update public.est_cursos set grupo = 'buceo', orden = 1 where lower(nombre) = 'open water diver' and grupo is null;
update public.est_cursos set grupo = 'buceo', orden = 2 where lower(nombre) = 'advanced owd' and grupo is null;
update public.est_cursos set grupo = 'buceo', orden = 3 where lower(nombre) = 'rescue diver' and grupo is null;
update public.est_cursos set grupo = 'buceo', orden = 4 where lower(nombre) = 'divemaster' and grupo is null;
update public.est_cursos set grupo = 'buceo', orden = 5 where lower(nombre) = 'instructor course' and grupo is null;
update public.est_cursos set grupo = 'especialidad', orden = 29 where lower(nombre) = 'nitrox' and grupo is null;
update public.est_cursos set grupo = 'especialidad', orden = 35 where lower(nombre) = 'pez león' and grupo is null;
update public.est_cursos set grupo = 'otros', orden = 40 where lower(nombre) = 'refresh owd' and grupo is null;
update public.est_cursos set grupo = 'otros', orden = 41 where lower(nombre) = 'freediving' and grupo is null;

-- 2) Ya no salen en el link (se quedan en la base)
update public.est_cursos set en_link = false where lower(nombre) in ('owd + nitrox', 'open water diver + nitrox', 'bls + oxy');

-- 3) La información de cada curso
update public.est_cursos set info = '{"nivel": "Buceo básico", "que": "Tu primer curso de buceo. Aprendes a bucear con un compañero, de forma segura, hasta 18 metros (60 pies).", "aprenderas": "El equipo, cómo entrar al agua, las señales bajo el agua, qué hacer en una emergencia y a cuidar el mar.", "duracion": "Una semana: tres días de teoría, un día de piscina, examen y cuatro buceos en el mar (dos días).", "incluye": "El equipo en las clases, el manual y tu certificación internacional.", "requisitos": "Saber nadar y sentirte cómodo en el agua. Desde los 12 años."}'::jsonb where lower(nombre) = 'open water diver' and info is null;
update public.est_cursos set info = '{"nivel": "Buceo avanzado", "que": "Para buzos certificados que quieren ampliar sus habilidades y hacer buceos más exigentes. Te certifica hasta 39 metros (130 pies).", "aprenderas": "Buceo nocturno, buceo profundo, orientación con brújula, buceo con corriente y control avanzado de la flotabilidad.", "duracion": "Más o menos una semana: dos días de teoría, examen, cuatro buceos en el mar y un buceo nocturno.", "requisitos": "Open Water Diver, brújula, foco de buceo y equipo completo (propio o alquilado) con octopus."}'::jsonb where lower(nombre) = 'advanced owd' and info is null;
update public.est_cursos set info = '{"nivel": "Buceo de rescate", "que": "Aprendes a prevenir, reconocer y responder a emergencias de buceo, y ganas confianza para cuidar a tus compañeros.", "aprenderas": "Autorrescate, atención de emergencias, respiración de rescate en el agua, cómo sacar a un buzo del agua y qué hacer en un accidente.", "duracion": "Más o menos una semana: teoría, piscina y dos buceos en el mar.", "requisitos": "Advanced Open Water, primeros auxilios (BLS) y proveedor de oxígeno (OXY), y equipo completo con octopus."}'::jsonb where lower(nombre) = 'rescue diver' and info is null;
update public.est_cursos set info = '{"nivel": "Formación profesional", "que": "Para buzos con experiencia que quieren guiar, supervisar grupos y ayudar a los instructores.", "aprenderas": "Planificar y dirigir buceos, supervisar grupos, apoyar a los instructores, la seguridad y presentaciones básicas.", "duracion": "De 100 a 120 horas, con al menos cinco buceos en el mar.", "requisitos": "18 años o más; Rescue Diver, Nitrox, Deep y Nocturno; y experiencia: un año certificado y 60 buceos, o seis meses y 75 buceos."}'::jsonb where lower(nombre) = 'divemaster' and info is null;
update public.est_cursos set info = '{"nivel": "Formación de instructores", "que": "Para buzos profesionales que quieren enseñar buceo.", "aprenderas": "Cómo enseñar, planificar clases, dar la teoría, demostrar las habilidades en el agua, evaluar a los estudiantes y manejar la seguridad.", "duracion": "Diez sesiones de teoría y seis en el agua, y después la evaluación.", "requisitos": "18 años o más; Divemaster; Rescue Diver, Nitrox, primeros auxilios (BLS) y oxígeno (OXY) vigentes."}'::jsonb where lower(nombre) = 'instructor course' and info is null;
update public.est_cursos set info = '{"nivel": "Aire enriquecido", "que": "Para bucear con mezclas con más oxígeno (del 22 % al 40 %). Te deja estar más tiempo en ciertos buceos, pero no bajar más profundo.", "aprenderas": "Qué es el Nitrox, las mezclas, sus ventajas y cómo usarlo con seguridad.", "duracion": "Dos sesiones de teoría, con examen.", "requisitos": "Open Water Diver o más."}'::jsonb where lower(nombre) = 'nitrox' and info is null;
update public.est_cursos set info = '{"nivel": "Repaso para buzos", "que": "Para buzos certificados que llevan tiempo sin bucear y quieren recuperar la confianza.", "aprenderas": "Revisar el equipo, la flotabilidad, vaciar la careta, recuperar el regulador, cómo subir y qué hacer si algo pasa.", "duracion": "Un repaso de teoría y una práctica con instructor.", "requisitos": "Estar certificado como buzo."}'::jsonb where lower(nombre) = 'refresh owd' and info is null;
update public.est_cursos set info = '{"nivel": "Apnea · nivel 1", "que": "Bucear a pulmón, sin tanque, de forma controlada y segura.", "aprenderas": "La seguridad, cómo responde tu cuerpo, la respiración, la relajación y la apnea.", "duracion": "Más o menos una semana: un día de teoría, una práctica en piscina y una en el mar.", "requisitos": "Careta, chapaletas y cinturón de pesas."}'::jsonb where lower(nombre) = 'freediving' and info is null;
update public.est_cursos set info = '{"nivel": "Especialidad ecológica", "que": "Aprendes a identificar y capturar el pez león, una especie que daña los arrecifes del Caribe.", "aprenderas": "Identificarlo, encontrarlo y capturarlo, lo ecológico y lo legal, cómo manejarlo sin pincharte y a preparar ceviche de pez león.", "duracion": "Un día de teoría y un día en el mar.", "incluye": "Tanques, pesas y guantes contra pinchazos.", "requisitos": "Open Water Diver, jabalina propia y equipo completo."}'::jsonb where lower(nombre) = 'pez león' and info is null;

-- 4) Precios
update public.est_cursos set precio = 29500 where lower(nombre) = 'open water diver';
update public.est_cursos set precio = 29500 where lower(nombre) = 'advanced owd';
update public.est_cursos set precio = 29500 where lower(nombre) = 'rescue diver';
update public.est_cursos set precio = 29500 where lower(nombre) = 'freediving';
update public.est_cursos set precio = 7200 where lower(nombre) = 'nitrox';
update public.est_cursos set precio = 9100 where lower(nombre) = 'pez león';
