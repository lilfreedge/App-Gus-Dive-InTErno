"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Acción irreversible: borra TODAS las salidas y llenados de tanque, y
// reinicia la numeración (folio) desde 1. Por eso las 3 confirmaciones
// encadenadas antes de llamar a la función de base de datos (que además
// valida adentro que quien la llama sea el Titular). Los textos de las
// confirmaciones son intencionales, tal cual los pidió el dueño de la
// app — no cambiarlos.
export default function FormatearRegistros() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function handleClick() {
    if (!window.confirm("¿Tú ta seguro broth? Se borra to'")) return;
    if (!window.confirm("¿SEGURO???????")) return;
    if (!window.confirm("Tato")) return;

    setLoading(true);
    setMensaje(null);

    const { error } = await supabase.rpc("formatear_registros");

    setLoading(false);

    if (error) {
      setMensaje({ tipo: "error", texto: "No se pudo formatear: " + error.message });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Registros formateados. La numeración vuelve a empezar en 1." });
    router.refresh();
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--texto-suave)", marginBottom: 12, marginTop: 0 }}>
        Borra permanentemente todas las salidas y llenados de tanque, y
        reinicia la numeración desde 1. No se puede deshacer.
      </p>
      <button
        type="button"
        className="btn danger"
        style={{ width: "auto" }}
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? "Formateando..." : "Formatear registros"}
      </button>
      {mensaje && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--azul)",
          }}
        >
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}
