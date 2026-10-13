-- migration_58.sql
-- v58: agrega columna `numero` a clientes_equipos — número o código
-- identificador del cliente (ej. número de socio, código interno). Texto
-- libre, opcional. El campo `telefono` existente se reutiliza para "Contacto"
-- en la UI (teléfono, email, WhatsApp, etc.) sin renombrar la columna
-- porque las vistas ya lo exponen como `cliente_telefono`.

ALTER TABLE clientes_equipos
  ADD COLUMN IF NOT EXISTS numero text;

-- Permite a Administradores borrar clientes (antes solo Titular podía).
-- El FK en equipos_clientes es RESTRICT, así que la BD rechaza el borrado
-- si el cliente tiene equipos registrados -- el app lo informa al usuario.
DROP POLICY IF EXISTS "Solo Titular borra clientes de equipos" ON public.clientes_equipos;
CREATE POLICY "Titular y Admin borran clientes de equipos"
  ON public.clientes_equipos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.es_titular = true OR (p.permisos->>'equipos_clientes_editar_codigo')::boolean = true)
    )
  );
