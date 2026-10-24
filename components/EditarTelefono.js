"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// V37 -- WhatsApp de una persona (para avisarle cuando le asignan una
// orden). Cada quien lo pone en Mi perfil; el Titular también lo puede
// poner o cambiar desde la ficha de la persona.
export default function EditarTelefono({ perfilId, telefono = "" }) {
  const router = useRouter();
  const supabase = createClient();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(telefono || "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    setGuardando(true);
    setError("");
    const { data, error: err } = await supabase
      .from("profiles")
      .update({ telefono: valor.trim() || null })
      .eq("id", perfilId)
      .select("id");
    setGuardando(false);
    if (err || !data || data.length === 0) return setError("No se pudo guardar.");
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {telefono || <span style={{ color: "var(--texto-suave)" }}>Sin número</span>}
        <button
          type="button"
          onClick={() => setEditando(true)}
          style={{ background: "none", border: "none", padding: 0, color: "var(--azul-claro)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
        >
          {telefono ? "Cambiar" : "Poner"}
        </button>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="tel"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="809 555 0123"
        style={{ marginTop: 0, width: 160, padding: "6px 10px" }}
        autoFocus
      />
      <button type="button" className="btn btn-primary" disabled={guardando} onClick={guardar} style={{ marginTop: 0, width: "auto", padding: "6px 12px" }}>
        {guardando ? "..." : "Guardar"}
      </button>
      <button type="button" className="btn secondary" disabled={guardando} onClick={() => setEditando(false)} style={{ marginTop: 0, width: "auto", padding: "6px 12px" }}>
        Cancelar
      </button>
      {error && <span style={{ color: "var(--rojo)", fontSize: 12 }}>{error}</span>}
    </span>
  );
}
