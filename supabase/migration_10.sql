-- ============================================================
-- GUS DIVE - Migración 10 (V6): rediseño del formulario de
-- Mantenimiento de reguladores — quita "Detalle del mantenimiento"
-- como campo obligatorio y agrega una lista de chequeo (Limpieza
-- ultrasonido / Presión intermedia / O-rings) + una nota opcional.
-- Ejecuta este script completo en: Supabase > SQL Editor > New query
-- (Es seguro correrlo sobre tu proyecto ya existente, no borra nada.)
-- ============================================================

-- 1) "detalle" deja de ser obligatorio — ahora es la "Nota" opcional
-- del formulario (se sigue guardando en la misma columna para no
-- tener que tocar todo lo que ya la muestra: lista, ficha, historial).
alter table public.mantenimientos_reguladores alter column detalle drop not null;

-- 2) Nueva lista de chequeo del mantenimiento.
alter table public.mantenimientos_reguladores add column if not exists limpieza_ultrasonido boolean not null default false;
alter table public.mantenimientos_reguladores add column if not exists presion_intermedia boolean not null default false;
-- o_rings: null/vacío = "Ninguno"; si aplica, el texto describe cuáles.
alter table public.mantenimientos_reguladores add column if not exists o_rings text;

-- ============================================================
-- No hace falta ningún paso manual adicional — los mantenimientos que
-- ya existan quedan con la lista de chequeo en "No"/"Ninguno" hasta
-- que se editen.
-- ============================================================
