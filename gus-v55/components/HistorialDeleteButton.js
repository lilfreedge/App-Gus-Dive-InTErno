"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconTrash } from "./icons";

// Borrar una entrada de cambios_historial. Solo se muestra al Titular
// (gateado por el llamador); la política RLS también solo permite
// DELETE al Titular, así que esto es defensa en profundidad.
export default function HistorialDeleteButton({ cambioId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    if (!window.confirm("¿Borrar esta entrada del historial? Esta acción no se puede deshacer.")) {
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("cambios_historial").delete().eq("id", cambioId);
    setLoading(false);

    if (error) {
      alert("No se pudo borrar. Intenta de nuevo.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      className="icon-btn icon-btn-danger"
      onClick={handleClick}
      disabled={loading}
      aria-label="Borrar del historial"
      title="Borrar del historial"
      type="button"
    >
      <IconTrash size={15} />
    </button>
  );
}
