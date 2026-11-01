"use client";

import { useState } from "react";
import { CampoCel } from "@/components/viajes/Piezas";
import { IconCheck } from "@/components/icons";
import { soloDigitos } from "@/lib/viajes/modelo";

// El link "Me interesa": nombre, celular y el curso que le interesa.
export default function MeInteresa({ cursos }) {
  const [f, setF] = useState({ nombre: "", cel: "", curso: cursos[0] || "", cuando: "", web: "" });
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function enviar() {
    setError("");
    setEnviando(true);
    try {
      const r = await fetch("/api/estudiantes/interesado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo enviar.");
      setListo(true);
    } catch (e) {
      setError(e.message);
    }
    setEnviando(false);
  }
  return (
    <div className="pb ce-pub">
      <div className="pb-head">
        <img src="/logo-gus-icon.png" alt="Gus Dive Center" style={{ height: 24 }} />
        <span>Gus Dive Center</span>
      </div>
      <div className="pb-body">
        {listo ? (
          <div className="pb-card" style={{ textAlign: "center" }}>
            <div className="pb-ok">
              <IconCheck size={34} />
            </div>
            <div className="pb-t">¡Gracias, {f.nombre.trim().split(/\s+/)[0]}!</div>
            <div className="pb-h">Te escribimos pronto por WhatsApp.</div>
          </div>
        ) : (
          <div className="pb-card">
            <div className="pb-t">¡Aprende a bucear con Gus!</div>
            <div className="pb-h">Déjanos tus datos y te escribimos.</div>
            <label className="ce-pub-l">Nombre</label>
            <input className="pb-input" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Tu nombre" />
            <label className="ce-pub-l">Celular</label>
            <CampoCel className="pb-input" value={f.cel} onChange={(v) => set("cel", v)} />
            <label className="ce-pub-l">¿Qué curso te interesa?</label>
            <select className="pb-input" value={f.curso} onChange={(e) => set("curso", e.target.value)}>
              {cursos.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option value="">No sé, quiero información</option>
            </select>
            <label className="ce-pub-l">¿Cuándo te gustaría empezar?</label>
            <input className="pb-input" value={f.cuando} onChange={(e) => set("cuando", e.target.value)} placeholder="Ej. en diciembre" />
            <input className="ce-pub-trampa" tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => set("web", e.target.value)} aria-hidden="true" />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={enviando || !f.nombre.trim() || soloDigitos(f.cel).length !== 10} onClick={enviar}>
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
