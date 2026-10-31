"use client";

import { useState } from "react";
import { cuandoAviso } from "@/lib/avisos-fijos";

// V51 -- Los avisos fijos arriba del Inicio (App Interno, App Equipos de
// clientes y la pantalla del técnico). Los que llevan "Listo" tienen su
// botón: al tocarlo se le quita a esta persona y le llega al que lo creó.
// `soloVer`: el Titular viendo la pantalla de otra persona (no marca nada).
export default function AvisosFijos({ avisos = [], grande = false, soloVer = false }) {
  const [lista, setLista] = useState(avisos);
  const [hechos, setHechos] = useState({});
  const [marcando, setMarcando] = useState(null);
  const [error, setError] = useState("");

  if (!lista.length) return null;

  async function listo(a) {
    setMarcando(a.id);
    setError("");
    try {
      const res = await fetch("/api/avisos-fijos/listo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avisoId: a.id, vez: a.vez }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo marcar. Intenta de nuevo.");
      setHechos((h) => ({ ...h, [a.id]: true }));
      setTimeout(() => setLista((l) => l.filter((x) => x.id !== a.id)), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setMarcando(null);
    }
  }

  return (
    <div className={`avisos-fijos${grande ? " grande" : ""}`}>
      {lista.map((a) =>
        hechos[a.id] ? (
          <div key={a.id} className={`af ${a.color}`}>
            <div className="af-t">
              <b>✓ Listo.</b>
              <small>Se le avisó a quien lo puso.</small>
            </div>
          </div>
        ) : (
          <div key={a.id} className={`af ${a.color}`}>
            <div className="af-t">
              <b>{a.texto}</b>
              <small>
                {cuandoAviso(a)}
                {a.creado_por_nombre ? ` · ${a.creado_por_nombre.split(" ")[0]}` : ""}
              </small>
            </div>
            {a.pide_listo && !soloVer && (
              <button type="button" className="af-listo" disabled={marcando === a.id} onClick={() => listo(a)}>
                {marcando === a.id ? "..." : "Listo"}
              </button>
            )}
          </div>
        )
      )}
      {error && <div className="error-msg">⚠ {error}</div>}
    </div>
  );
}
