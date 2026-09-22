-- Migration 11: permite que Titular/Admin restauren desde Historial
-- registros de "salidas" y "llenados_tanques" que originalmente fueron
-- creados por OTRO usuario.
--
-- Restaurar un registro borrado (HistorialRestoreButton.js) vuelve a
-- INSERTAR la fila con sus datos originales (incluyendo su user_id
-- original). Las políticas de INSERT de "salidas" y "llenados_tanques"
-- exigían siempre auth.uid() = user_id, sin excepción para Titular/Admin
-- -- a diferencia de "inspecciones_visuales"/"mantenimientos_reguladores",
-- que sí tenían el bypass. Por eso restaurar fallaba con
-- "No se pudo restaurar. Intenta de nuevo." cuando quien restauraba no
-- era quien había creado el registro original.

-- 1) Salidas
drop policy if exists "Los usuarios logueados pueden registrar salidas" on public.salidas;
create policy "Los usuarios logueados pueden registrar salidas"
  on public.salidas for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or public.is_titular()
    or public.is_admin()
  );

-- 2) Llenados de tanque (conserva el permiso "registrar_llenado" para
-- usuarios normales; Titular/Admin quedan exentos de ambas condiciones).
drop policy if exists "Permiso registrar_llenado inserta" on public.llenados_tanques;
create policy "Permiso registrar_llenado inserta"
  on public.llenados_tanques for insert
  to authenticated
  with check (
    (
      auth.uid() = user_id
      or public.is_titular()
      or public.is_admin()
    )
    and (
      public.is_titular() or public.is_admin()
      or coalesce((select (permisos->>'registrar_llenado')::boolean from public.profiles where id = auth.uid()), false)
    )
  );
