-- Permite borrar códigos del catálogo (28-sep-2026, feedback en vivo sobre
-- la pantalla rediseñada de "Códigos a cobrar", item 1: "Permiteme poder
-- borrar codigos") -- hasta ahora piezas_catalogo (migration_22.sql) solo
-- tenía política de insert/update, "desactivar" era la única forma de
-- retirar un código. Ningún dato de una orden ya registrada depende de esta
-- fila por llave foránea (repuestos_usados_detalle solo guarda el nombre
-- como texto suelto, autocompletado desde este catálogo), así que borrar un
-- código no deja nada huérfano.
drop policy if exists "Permiso equipos_clientes_catalogo borra piezas" on public.piezas_catalogo;
create policy "Permiso equipos_clientes_catalogo borra piezas"
  on public.piezas_catalogo for delete
  to authenticated
  using (
    public.is_titular() or public.is_admin()
    or coalesce((select (permisos->>'equipos_clientes_catalogo')::boolean from public.profiles where id = auth.uid()), false)
  );
