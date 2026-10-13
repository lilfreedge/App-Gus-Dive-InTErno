-- Migration 18: corrige un bug de migration_17 -- la política de INSERT
-- de cambios_historial se quedó sin is_titular(), así que las ediciones
-- de seguimiento de órdenes hechas por el Titular (Pipe) nunca se
-- guardaban en el historial (la política solo dejaba pasar a is_admin()
-- o a quien tuviera el permiso equipos_clientes explícitamente marcado
-- en su perfil -- el Titular no necesariamente tiene ninguna de las dos
-- cosas, porque siempre tiene acceso total sin depender de esos campos).
-- Reportado por el usuario: "en el historial de ediciones no me aparece
-- la edicion que le hice a una orden".
drop policy if exists "Solo administradores registran cambios" on public.cambios_historial;
create policy "Solo administradores registran cambios"
  on public.cambios_historial for insert
  to authenticated
  with check (
    public.is_admin()
    or public.is_titular()
    or (
      tabla = 'ordenes_equipos'
      and coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
    )
  );

-- ============================================================
-- No. Serie del equipo (pedido explícito, mismo día): aplica a
-- Reguladores, Tanques y Computadora -- BC y Otro no lo piden. En
-- Tanques además no se pide ni marca ni modelo, solo "Fabricante"
-- (reutiliza la misma columna "marca", solo cambia la etiqueta en
-- pantalla) y No. Serie.
-- ============================================================
alter table public.equipos_del_cliente add column if not exists serie text;
