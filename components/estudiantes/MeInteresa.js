"use client";

import { useState } from "react";
import { CampoCel } from "@/components/viajes/Piezas";
import { IconCheck, IconLock } from "@/components/icons";
import { soloDigitos } from "@/lib/viajes/modelo";

// El link "Me interesa". V60 ("164", maqueta V59 aprobada, y la nota del
// 2-nov "el link de interesados aún me pide esto en vez de cédula"):
// - Sin "Aprende a bucear con Gus" (puede ser alguien que va a tomar Rescue).
// - Primero la cédula o el pasaporte. Si ya es buzo o estudiante de Gus, lo
//   saluda por su nombre y solo le pregunta el curso (y el correo).
// - Sin "¿Cuándo te gustaría empezar?"; con correo.
export default function MeInteresa({ cursos }) {
  const [paso, setPaso] = useState("doc"); // doc | datos | listo
  const [doc, setDoc] = useState("");
  const [conocido, setConocido] = useState(null); // { primer } si ya lo tenemos
  const [f, setF] = useState({ nombre: "", cel: "", curso: cursos[0] || "", correo: "", web: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nombreFin, setNombreFin] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const docListo = /[a-z]/i.test(doc) ? doc.replace(/[\s-]/g, "").length >= 6 : soloDigitos(doc).length === 11 || doc.replace(/[\s-]/g, "").length >= 6;

  async function api(cuerpo) {
    const r = await fetch("/api/estudiantes/interesado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "No se pudo enviar.");
    return j;
  }
  async function buscar() {
    setError("");
    setEnviando(true);
    try {
      const j = await api({ accion: "doc", doc, web: f.web });
      setConocido(j.encontrado ? { primer: j.primer } : null);
      setPaso("datos");
    } catch (e) {
      setError(e.message);
    }
    setEnviando(false);
  }
  async function enviar() {
    setError("");
    setEnviando(true);
    try {
      const j = await api({ accion: "enviar", doc, ...f });
      setNombreFin(j.nombre || f.nombre.trim().split(/\s+/)[0] || "");
      setPaso("listo");
    } catch (e) {
      setError(e.message);
    }
    setEnviando(false);
  }
  const puedeEnviar = conocido ? true : f.nombre.trim() && soloDigitos(f.cel).length === 10;

  return (
    <div className="pb ce-pub">
      <div className="pb-head">
        <img src="/logo-gus-icon.png" alt="Gus Dive Center" style={{ height: 24 }} />
        {/* V54: logo de SNSI ("77. si"). */}
        <img src="/logo-snsi.png" alt="SNSI" className="ce-logo-snsi" />
        <span>Gus Dive Center</span>
      </div>
      <div className="pb-body">
        {paso === "listo" && (
          <div className="pb-card" style={{ textAlign: "center" }}>
            <div className="pb-ok">
              <IconCheck size={34} />
            </div>
            <div className="pb-t">¡Gracias{nombreFin ? `, ${nombreFin}` : ""}!</div>
            <div className="pb-h">Te escribimos pronto por WhatsApp.</div>
          </div>
        )}

        {paso === "doc" && (
          <div className="pb-card">
            <div className="pb-t">¿Te interesa un curso?</div>
            <div className="pb-h">Déjanos tus datos y te escribimos.</div>
            <label className="ce-pub-l">Tu cédula o pasaporte</label>
            <input
              className="pb-input"
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && docListo && !enviando && buscar()}
              placeholder="000-0000000-0"
              autoComplete="off"
            />
            <input className="ce-pub-trampa" tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => set("web", e.target.value)} aria-hidden="true" />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={enviando || !docListo} onClick={buscar}>
              {enviando ? "Un momento…" : "Seguir"}
            </button>
            <div className="pb-priv">
              <IconLock size={15} />
              <span>Gus Dive Center no comparte esta información con nadie.</span>
            </div>
          </div>
        )}

        {paso === "datos" && (
          <div className="pb-card">
            {conocido ? (
              <>
                <div className="pb-t">¡Hola, {conocido.primer}! Ya te tenemos.</div>
                <div className="pb-h">Solo dinos qué curso te interesa.</div>
              </>
            ) : (
              <>
                <div className="pb-t">¿Te interesa un curso?</div>
                <div className="pb-h">Déjanos tus datos y te escribimos.</div>
                <label className="ce-pub-l">Nombre completo</label>
                <input className="pb-input" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre y apellido" />
                <label className="ce-pub-l">Celular</label>
                <CampoCel className="pb-input" value={f.cel} onChange={(v) => set("cel", v)} />
              </>
            )}
            <label className="ce-pub-l">¿Qué curso te interesa?</label>
            <select className="pb-input" value={f.curso} onChange={(e) => set("curso", e.target.value)}>
              {cursos.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option value="">No sé, quiero información</option>
            </select>
            <label className="ce-pub-l">Correo electrónico{conocido ? " (opcional)" : ""}</label>
            <input className="pb-input" type="email" value={f.correo} onChange={(e) => set("correo", e.target.value)} placeholder="tucorreo@ejemplo.com" />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={enviando || !puedeEnviar} onClick={enviar}>
              {enviando ? "Enviando…" : "Enviar"}
            </button>
            <button className="pb-btn sec" onClick={() => (setPaso("doc"), setError(""))}>
              ← Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
