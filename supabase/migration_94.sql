-- =====================================================================
-- migration_94.sql  (V67, 10-nov-2026)
-- Control Estudiantes > Administración ("3. sí", maqueta V67): el permiso
-- "Borrar estudiantes". Antes solo el Titular podía borrar; ahora también
-- quien tenga ese permiso (y los administradores, que pueden todo).
-- Los otros permisos nuevos (Ver documentos, Cancelar cursos, Ver montos,
-- Ver la bitácora y Ver estadísticas) no necesitan nada en la base.
-- No borra nada. Se puede correr más de una vez.
-- =====================================================================
drop policy if exists "est_estudiantes borrar" on public.est_estudiantes;
create policy "est_estudiantes borrar" on public.est_estudiantes for delete to authenticated
  using (public.is_titular() or public.est_puede('est_borrar'));
