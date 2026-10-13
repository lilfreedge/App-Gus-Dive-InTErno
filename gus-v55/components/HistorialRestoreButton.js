"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Restaura un registro borrado a partir de su snapshot en
// cambios_historial.datos_anteriores: lo vuelve a insertar en su tabla
// original y, si el insert funciona, borra la entrada del historial
// (ya no aplica mostrarla como anulada). Solo se muestra para tablas que
// son registros propios de la operación (no para "profiles", que es un
// log de cambio de nombre, no algo borrable/restaurable).
export default function HistorialRestoreButton({ cambio }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    if (!window.confirm("¿Restaurar este registro? Volverá a aparecer como si nunca se hubiera borrado.")) {
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase.from(cambio.tabla).insert(cambio.datos_anteriores);

      if (insertError) {
        // Se deja el detalle del error en consola y (para Titular/Admin,
        // únicos con acceso a Historial) también en la alerta, para poder
        // diagnosticar sin tener que abrir las herramientas de desarrollador.
        console.error("No se pudo restaurar el registro:", cambio.tabla, insertError);
        if (insertError.code === "23505") {
          alert("No se pudo restaurar: ya existe un registro con ese identificador.");
        } else {
          alert(
            "No se pudo restaurar. Intenta de nuevo." +
              (insertError.message ? `\n\n(${insertError.message})` : "")
          );
        }
        return;
      }

      const { error: deleteError } = await supabase.from("cambios_historial").delete().eq("id", cambio.id);
      if (deleteError) {
        alert("Se restauró el registro, pero no se pudo quitar la entrada del historial.");
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="icon-btn"
      onClick={handleClick}
      disabled={loading}
      aria-label="Restaurar"
      title="Restaurar"
      type="button"
    >
      ↺
    </button>
  );
}
