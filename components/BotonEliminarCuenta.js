"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// V31 — botón "Eliminar cuenta" (solo Titular). Pide confirmar en la misma
// pantalla antes de borrar (sin ventanas emergentes del navegador).
export default function BotonEliminarCuenta({ id, nombre, volverA }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function eliminar() {
    setCargando(true);
    setError("");
    const res = await fetch("/api/admin/eliminar-cuenta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setCargando(false);
    if (!res.ok) {
      setError(data.error || "No se pudo eliminar la cuenta.");
      return;
    }
    setConfirmando(false);
    if (volverA) router.push(volverA);
    router.refresh();
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        style={{ border: "none", background: "none", padding: 0, color: "var(--rojo)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
      >
        Eliminar cuenta
      </button>
    );
  }

  return (
    <div className="error-box" style={{ marginTop: 8, width: "100%" }}>
      ¿Eliminar la cuenta de <b>{nombre}</b>? Ya no podrá entrar a la app. Todo lo que registró se queda guardado con
      su nombre. No se puede deshacer.
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={eliminar}
          disabled={cargando}
          style={{ marginTop: 0, width: "auto", background: "var(--rojo)", borderColor: "var(--rojo)" }}
        >
          {cargando ? "Eliminando..." : "Sí, eliminar"}
        </button>
        <button type="button" className="btn secondary" onClick={() => setConfirmando(false)} disabled={cargando} style={{ marginTop: 0, width: "auto" }}>
          Cancelar
        </button>
      </div>
      {error && <div style={{ marginTop: 8, fontWeight: 700 }}>{error}</div>}
    </div>
  );
}
