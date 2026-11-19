"use client";

import { useState } from "react";
import { CampoCel } from "@/components/viajes/Piezas";
import { IconCheck } from "@/components/icons";
import { celValido } from "@/lib/viajes/modelo";
import { FUENTES } from "@/lib/estudiantes/modelo";
import { Privacidad } from "./Publico";
import InstalarApp, { VolverInicio } from "@/components/InstalarApp";

// El link de interesados ("Registro de interesado"). Historia:
// - V60/V62: primero pedía la cédula o el pasaporte para ligarlo con su
//   perfil de buzo o estudiante.
// - V74/V76: título "Registro de interesado", "¿Cómo te enteraste de
//   nosotros?", sin botón de WhatsApp al final.
// - V78: el correo es obligatorio (ahí le llega el link del curso).
// - V80 (notas del 13-nov, con foto: "No pedir cédula al interesado. Ya no
//   me interesa que esté vinculado para cuando se inscriban en registro de
//   estudiante. Que pida el contacto") -- ya no pide documento: una sola
//   pantalla con nombre, celular, correo, curso y cómo se enteró. Al
//   inscribirse por el link de cursos con el mismo celular, igual sale solo
//   de Interesados (V78 del link de cursos).
export default function MeInteresa({ cursos, niveles = {}, cursoInicial = null }) {
  const [paso, setPaso] = useState("datos"); // datos | listo
  const [f, setF] = useState({ nombre: "", cel: "", curso: cursoInicial || cursos[0] || "", fuente: "", fuenteOtro: "", correo: "", web: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nombreFin, setNombreFin] = useState("");
  const [cursoFin, setCursoFin] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function enviar() {
    setError("");
    setEnviando(true);
    try {
      const r = await fetch("/api/estudiantes/interesado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "enviar", ...f }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo enviar.");
      setNombreFin(j.nombre || f.nombre.trim().split(/\s+/)[0] || "");
      setCursoFin(f.curso);
      setPaso("listo");
    } catch (e) {
      setError(e.message);
    }
    setEnviando(false);
  }
  const correoBien = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim());
  const puedeEnviar = f.nombre.trim() && celValido(f.cel) && correoBien;

  return (
    <div className="pb ce-pub">
      <div className="pb-head">
        <img src="/logo-gus-icon.png" alt="Gus Dive Center" style={{ height: 24 }} />
        {/* V54: logo de SNSI ("77. si"). */}
        <img src="/logo-snsi.png" alt="SNSI" className="ce-logo-snsi" />
        <span>Gus Dive</span>
      </div>
      <div className="pb-body">
        {paso === "listo" && (
          <div className="pb-card" style={{ textAlign: "center" }}>
            <div className="pb-ok">
              <IconCheck size={34} />
            </div>
            <div className="pb-t">¡Listo{nombreFin ? `, ${nombreFin}` : ""}!</div>
            {/* V80 (notas del 13-nov, con foto: 'Cambiar texto a "Quedaste
                anotado para Open Water Diver. Te contactaremos cuando
                tengamos un curso disponible"'). */}
            <div className="pb-h">
              Quedaste anotado{cursoFin ? ` para ${cursoFin}` : ""}. Te contactaremos cuando tengamos un curso disponible.
            </div>
          </div>
        )}
        {paso === "listo" && <VolverInicio />}
        {paso === "listo" && <InstalarApp style={{ marginTop: 12 }} />}

        {paso === "datos" && (
          <div className="pb-card">
            <div className="pb-t">Registro de interesado</div>
            <label className="ce-pub-l">Nombre completo</label>
            <input className="pb-input" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre y apellido" autoComplete="name" />
            <label className="ce-pub-l">Celular (WhatsApp)</label>
            <CampoCel className="pb-input" value={f.cel} onChange={(v) => set("cel", v)} />
            <label className="ce-pub-l">Correo electrónico</label>
            <input className="pb-input" type="email" value={f.correo} onChange={(e) => set("correo", e.target.value)} placeholder="tucorreo@ejemplo.com" autoComplete="email" />
            <label className="ce-pub-l">¿Qué curso te interesa?</label>
            <select className="pb-input" value={f.curso} onChange={(e) => set("curso", e.target.value)}>
              {/* V105: con la descripción corta del Catálogo ("Open Water Diver · Curso básico"). */}
              {cursos.map((c) => (
                <option key={c} value={c}>
                  {niveles[c] ? `${c} · ${niveles[c]}` : c}
                </option>
              ))}
              <option value="">No sé, quiero información</option>
            </select>
            <label className="ce-pub-l">¿Cómo te enteraste de nosotros?</label>
            <select className="pb-input" value={f.fuente} onChange={(e) => set("fuente", e.target.value)}>
              <option value="">Escoge…</option>
              {FUENTES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            {/* V105 (con foto: "cuando le den a Otro, abre una sección donde puedan escribir"). */}
            {f.fuente === "Otro" && (
              <>
                <label className="ce-pub-l">Cuéntanos cómo nos conociste</label>
                <input className="pb-input" value={f.fuenteOtro} maxLength={80} onChange={(e) => set("fuenteOtro", e.target.value)} placeholder="Escríbelo aquí" autoFocus />
              </>
            )}
            <input className="ce-pub-trampa" tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => set("web", e.target.value)} aria-hidden="true" />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={enviando || !puedeEnviar} onClick={enviar}>
              {enviando ? "Enviando…" : "Enviar"}
            </button>
            <Privacidad />
          </div>
        )}
      </div>
    </div>
  );
}
