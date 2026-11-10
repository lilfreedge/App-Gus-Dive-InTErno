"use client";

import { useState } from "react";
import { CampoCel } from "@/components/viajes/Piezas";
import { IconCheck } from "@/components/icons";
import { soloDigitos, formatoCedula, celValido } from "@/lib/viajes/modelo";
import { numeroWhatsApp } from "@/lib/whatsapp-tecnico";
import { NACIONALIDADES, Privacidad } from "./Publico";

// El link "Me interesa". V60 ("164", maqueta V59 aprobada, y la nota del
// 2-nov "el link de interesados aún me pide esto en vez de cédula"):
// - Sin "Aprende a bucear con Gus" (puede ser alguien que va a tomar Rescue).
// - Primero la cédula o el pasaporte. Si ya es buzo o estudiante de Gus, lo
//   saluda por su nombre y solo le pregunta el curso (y el correo).
// - Sin "¿Cuándo te gustaría empezar?"; con correo.
export default function MeInteresa({ cursos, whatsapp }) {
  const [paso, setPaso] = useState("doc"); // doc | datos | listo
  // V62 ("193"): igual que el registro de estudiantes: "Cédula" (con su
  // formato) u "Otro documento" (pasaporte, con la nacionalidad).
  const [tipoDoc, setTipoDoc] = useState("cedula");
  const [avisoDni, setAvisoDni] = useState(false);
  const [nacionalidad, setNacionalidad] = useState("");
  const [nacOtra, setNacOtra] = useState("");
  const [cursoFin, setCursoFin] = useState("");
  const [doc, setDoc] = useState("");
  const [conocido, setConocido] = useState(null); // { primer } si ya lo tenemos
  const [f, setF] = useState({ nombre: "", cel: "", curso: cursos[0] || "", correo: "", web: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nombreFin, setNombreFin] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const docListo = tipoDoc === "cedula" ? soloDigitos(doc).length === 11 : doc.replace(/[\s-]/g, "").length >= 6;
  const nac = tipoDoc === "pasaporte" ? (nacionalidad === "Otra" ? nacOtra.trim() : nacionalidad) : "";

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
      const j = await api({ accion: "doc", tipoDoc, doc, web: f.web });
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
      const j = await api({ accion: "enviar", tipoDoc, doc, nacionalidad: nac, ...f });
      setNombreFin(j.nombre || f.nombre.trim().split(/\s+/)[0] || "");
      setCursoFin(f.curso);
      setPaso("listo");
    } catch (e) {
      setError(e.message);
    }
    setEnviando(false);
  }
  const puedeEnviar = conocido ? true : f.nombre.trim() && celValido(f.cel);

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
            {/* V62 ("193"): como el final de los otros registros. */}
            <div className="pb-t">¡Listo{nombreFin ? `, ${nombreFin}` : ""}!</div>
            <div className="pb-h">
              Ya tenemos tus datos{cursoFin ? ` para ${cursoFin}` : ""}. Te escribiremos por WhatsApp para darte toda la información. Si quieres, escríbenos tú ahora.
            </div>
            {whatsapp && (
              <a className="pb-btn ce-pub-wa" href={`https://wa.me/${numeroWhatsApp(whatsapp)}?text=${encodeURIComponent(`Hola, soy ${nombreFin || ""}. Me interesa ${cursoFin ? `el curso ${cursoFin}` : "un curso"}.`)}`} target="_blank" rel="noopener noreferrer">
                Escribir por WhatsApp
              </a>
            )}
          </div>
        )}

        {paso === "doc" && (
          <div className="pb-card">
            {/* V62 ("244. D"). */}
            <div className="pb-t">Información de cursos</div>
            <div className="pb-h">Déjanos tus datos y te mandamos toda la información.</div>
            <div className="pb-seg">
              <button className={tipoDoc === "cedula" ? "sel" : ""} onClick={() => (setTipoDoc("cedula"), setDoc(""), setAvisoDni(false))}>
                Cédula
              </button>
              <button className={tipoDoc === "pasaporte" ? "sel" : ""} onClick={() => (setTipoDoc("pasaporte"), setDoc(""), setAvisoDni(false))}>
                Otro documento
              </button>
            </div>
            {tipoDoc === "pasaporte" && <label className="ce-pub-l">Pasaporte o documento de tu país</label>}
            <input
              className="pb-input"
              inputMode={tipoDoc === "cedula" ? "numeric" : "text"}
              value={doc}
              onChange={(e) => {
                const v = e.target.value;
                if (tipoDoc === "cedula") {
                  setAvisoDni(/[a-z]/i.test(v) || soloDigitos(v).length > 11);
                  setDoc(formatoCedula(v));
                } else setDoc(v.toUpperCase());
              }}
              onKeyDown={(e) => e.key === "Enter" && docListo && !enviando && buscar()}
              placeholder={tipoDoc === "cedula" ? "000-0000000-0" : "Ej. AB123456 o 12345678Z"}
              autoComplete="off"
            />
            {avisoDni && tipoDoc === "cedula" && (
              <div className="pb-error" style={{ fontWeight: 600 }}>
                ¿No es cédula dominicana?{" "}
                <a style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => (setTipoDoc("pasaporte"), setDoc(""), setAvisoDni(false))}>
                  Toca &quot;Otro documento&quot;
                </a>
              </div>
            )}
            {tipoDoc === "pasaporte" && (
              <>
                <label className="ce-pub-l">Nacionalidad</label>
                <select className="pb-input" value={nacionalidad} onChange={(e) => setNacionalidad(e.target.value)}>
                  <option value="">Escoge…</option>
                  {NACIONALIDADES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                {nacionalidad === "Otra" && <input className="pb-input" style={{ marginTop: 6 }} value={nacOtra} onChange={(e) => setNacOtra(e.target.value)} placeholder="¿Cuál?" />}
              </>
            )}
            <input className="ce-pub-trampa" tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => set("web", e.target.value)} aria-hidden="true" />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={enviando || !docListo} onClick={buscar}>
              {enviando ? "Un momento…" : "Seguir"}
            </button>
            {/* V62 ("193"): el mismo texto de los otros registros. */}
            <Privacidad />
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
                <div className="pb-t">Información de cursos</div>
                <div className="pb-h">Déjanos tus datos y te mandamos toda la información.</div>
                <label className="ce-pub-l">Nombre completo</label>
                <input className="pb-input" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre y apellido" />
                <label className="ce-pub-l">Celular (WhatsApp)</label>
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
