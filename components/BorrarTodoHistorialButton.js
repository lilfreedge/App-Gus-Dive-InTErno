"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconTrash } from "./icons";

// Borrar TODAS las entradas de cambios_historial visibles en esta pantalla
// (no solo las que caben en el límite de 300 filas que trae cada página) --
// pedido explícito del Titular, 28-sep-2026: "ponme un boton aqui para
// borrar toda la bitacora de movimientos, eso solo tendre acceso yo" (en
// Bitácora movimientos en órdenes) y "ponme un boton para borrar aqui
// también, acceso para mi nada mas" (en Historial). Solo se muestra al
// Titular -- gateado por quien llama a este componente, mismo patrón que
// HistorialDeleteButton (borrado de una sola fila). La política RLS "Solo
// el Titular borra historial" (migration_05.sql) también solo deja borrar
// al Titular, así que esto es defensa en profundidad.
//
// `filtro` arma el WHERE exactamente igual que la consulta que trae los
// datos de cada pantalla (columna -> valor, o columna -> [valores] para
// un .in()) -- cambios_historial es una tabla compartida con App Interno,
// así que nunca se borra "todo" sin acotar por tabla/acción.
export default function BorrarTodoHistorialButton({ filtro, etiqueta }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    if (!window.confirm(`¿Borrar PERMANENTEMENTE ${etiqueta}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    let query = supabase.from("cambios_historial").delete();
    for (const [columna, valor] of Object.entries(filtro || {})) {
      query = Array.isArray(valor) ? query.in(columna, valor) : query.eq(columna, valor);
    }
    const { error } = await query;
    setLoading(false);

    if (error) {
      alert("No se pudo borrar. Intenta de nuevo.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      className="btn danger"
      onClick={handleClick}
      disabled={loading}
      style={{ width: "auto", marginTop: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <IconTrash size={14} />
      {loading ? "Borrando..." : `Borrar ${etiqueta}`}
    </button>
  );
}
