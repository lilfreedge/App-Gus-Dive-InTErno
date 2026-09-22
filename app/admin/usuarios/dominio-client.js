"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DominioPersonalizado({ dominioActual }) {
  const router = useRouter();
  const supabase = createClient();
  const [valor, setValor] = useState(dominioActual || "");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function guardar() {
    setLoading(true);
    setMensaje(null);

    const { error } = await supabase
      .from("app_config")
      .update({ dominio_personalizado: valor.trim() || null })
      .eq("id", true);

    setLoading(false);

    if (error) {
      setMensaje({ tipo: "error", texto: "No se pudo guardar el cambio." });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Guardado." });
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="midominio.com"
          disabled={loading}
          style={{ flex: "1 1 220px" }}
        />
        <button
          type="button"
          className="btn secondary"
          style={{ width: "auto", marginTop: 0 }}
          disabled={loading}
          onClick={guardar}
        >
          Guardar
        </button>
      </div>
      <p className="hint-text" style={{ marginTop: 8 }}>
        Esto solo guarda el nombre de dominio como referencia dentro de la
        app — no configura nada automáticamente. Para que el dominio
        realmente funcione, sigue apuntando su DNS hacia Vercel y agrégalo
        en la configuración del proyecto en Vercel.
      </p>
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
