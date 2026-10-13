-- Migration 35 (27-sep-2026) -- v40: políticas RLS de cambios_historial
-- para los permisos granulares nuevos de la ronda grande de feedback.
--
-- migration_24.sql había dejado el SELECT de cambios_historial en
-- 'ordenes_equipos'/'equipos_del_cliente' exclusivo del Titular (ni
-- siquiera Administradores podían verlo) -- correcto en su momento
-- ("eso que solamente lo pueda ver yo como titular, por el momento"),
-- pero con el permiso nuevo `equipos_clientes_historial` (gatea la
-- pantalla Historial de App Clientes, ver lib/roles.js) alguien SIN ser
-- Titular ya puede entrar a esa pantalla -- sin este cambio, entraría y
-- vería la lista vacía (RLS se lo escondería igual), pareciendo un bug.
--
-- También se suma 'clientes_equipos' a ambas políticas -- tabla nueva
-- para el historial de ediciones de "Editar cliente" (nombre/teléfono),
-- feature nueva de esta misma entrega (permiso equipos_clientes_editar_cliente).
drop policy if exists "Solo administradores ven el historial de cambios" on public.cambios_historial;
create policy "Solo administradores ven el historial de cambios"
  on public.cambios_historial for select
  to authenticated
  using (
    public.is_titular()
    or (public.is_admin() and tabla not in ('ordenes_equipos', 'equipos_del_cliente', 'clientes_equipos'))
    or (
      tabla in ('ordenes_equipos', 'equipos_del_cliente', 'clientes_equipos')
      and coalesce((select (permisos->>'equipos_clientes_historial')::boolean from public.profiles where id = auth.uid()), false)
    )
  );

drop policy if exists "Solo administradores registran cambios" on public.cambios_historial;
create policy "Solo administradores registran cambios"
  on public.cambios_historial for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      tabla = 'ordenes_equipos'
      and coalesce((select (permisos->>'equipos_clientes')::boolean from public.profiles where id = auth.uid()), false)
    )
    or (
      tabla = 'equipos_del_cliente'
      and coalesce((select (permisos->>'equipos_clientes_editar_equipo')::boolean from public.profiles where id = auth.uid()), false)
    )
    or (
      tabla = 'clientes_equipos'
      and coalesce((select (permisos->>'equipos_clientes_editar_cliente')::boolean from public.profiles where id = auth.uid()), false)
    )
  );
