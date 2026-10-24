"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// V37 -- "Hecho" de un recordatorio que no se reinicia solo (por ejemplo
// "Limpiar el cuarto de compresores"): lo anota y el recordatorio vuelve a
// contar desde hoy.
export default function BotonRecordatorioHecho({ recordatorioId, compresorId = null, nombre = "" }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function marcar() {
    setLoading(true);
    setError("");
    const { error: err } = await supabase
      .from("recordatorios_hechos")
      .insert({ recordatorio_id: recordatorioId, compresor_id: compresorId, nombre_usuario: nombre || null });
    setLoading(false);
    if (err) return setError("No se pudo anotar.");
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        className="btn secondary"
        disabled={loading}
        onClick={marcar}
        style={{ marginTop: 0, width: "auto", padding: "4px 12px", fontSize: 12.5 }}
      >
        {loading ? "..." : "Hecho"}
      </button>
      {error && <span style={{ color: "var(--rojo)", fontSize: 12 }}>{error}</span>}
    </span>
  );
}
