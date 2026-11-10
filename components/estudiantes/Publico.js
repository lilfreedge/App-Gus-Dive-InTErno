"use client";

import { useEffect, useRef, useState } from "react";
import { soloDigitos, formatoCedula, rd, fechaCorta, fechaLarga, primerNombre, celValido } from "@/lib/viajes/modelo";
import { semanaDe, menorDe12, edad as edadDe } from "@/lib/estudiantes/modelo";
import FechaNacimiento from "@/components/FechaNacimiento";
import { numeroWhatsApp } from "@/lib/whatsapp-tecnico";
import { CampoCel } from "@/components/viajes/Piezas";
import { IconCheck, IconLock, IconCamera } from "@/components/icons";
import { subirArchivo } from "@/lib/estudiantes/subir";

// Control Estudiantes -- el link de registro del estudiante (público, sin
// cuenta). Reemplaza el formulario de Google. Opción D de la maqueta:
// sus datos, su curso, su foto y su cédula, su firma, y cuando vuelve a
// entrar ve cómo va su certificación.

async function api(cuerpo) {
  const r = await fetch("/api/estudiantes/publico", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Algo salió mal. Intenta de nuevo.");
  return j;
}
// V54: subirArchivo vive en lib/estudiantes/subir.js (achica las fotos
// grandes y las sube directo al almacenamiento; antes salía "Failed to fetch").

function Subir({ id, que, titulo, sub, accept = "image/*", capture, estudianteId, listo, alSubir }) {
  const [estado, setEstado] = useState(listo ? "ok" : null);
  async function elegir(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setEstado("subiendo");
    try {
      await subirArchivo(id, que, f, estudianteId);
      setEstado("ok");
      alSubir && alSubir();
    } catch (err) {
      setEstado({ error: err.message });
    }
  }
  return (
    <label className={`ce-pub-foto${estado === "ok" ? " ok" : ""}`}>
      {estado === "ok" ? <IconCheck size={18} /> : <IconCamera size={18} />}
      <span>
        <b>{estado === "subiendo" ? "Subiendo…" : estado === "ok" ? `${titulo} ✓` : titulo}</b>
        {sub && estado !== "ok" && <small>{sub}</small>}
        {estado?.error && <small className="pb-error">{estado.error}</small>}
      </span>
      <input type="file" accept={accept} capture={capture} hidden onChange={elegir} />
    </label>
  );
}

// V54: la cédula o el pasaporte, en foto, escaneo o PDF (nota 1-nov: "pon que
// acepte formato png jpg, pdf o heic" y "En vez foto, pongamos 'cédula'... O
// algo relacionado con escaneo"). Sin capture, para que pueda escoger la
// cámara o un archivo.
function SubirCedula({ id, tipoDoc, listo }) {
  return (
    <Subir
      id={id}
      que="cedula"
      titulo={tipoDoc === "pasaporte" ? "Tu pasaporte" : "Tu cédula"}
      sub="Una foto o un escaneo donde se lea bien (JPG, PNG, PDF o HEIC)."
      accept="image/*,application/pdf,.heic,.heif"
      listo={listo}
    />
  );
}

// Firma con el dedo (o el mouse).
function Firma({ id, estudianteId, alFirmar }) {
  const ref = useRef(null);
  const [hay, setHay] = useState(false);
  const [estado, setEstado] = useState(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    const escala = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * escala;
    c.height = c.offsetHeight * escala;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a2733";
    let dibujando = false;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return [t.clientX - r.left, t.clientY - r.top];
    };
    const ini = (e) => {
      e.preventDefault();
      dibujando = true;
      ctx.beginPath();
      ctx.moveTo(...pos(e));
    };
    const mover = (e) => {
      if (!dibujando) return;
      e.preventDefault();
      ctx.lineTo(...pos(e));
      ctx.stroke();
      setHay(true);
    };
    const fin = () => (dibujando = false);
    c.addEventListener("mousedown", ini);
    c.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", fin);
    c.addEventListener("touchstart", ini, { passive: false });
    c.addEventListener("touchmove", mover, { passive: false });
    c.addEventListener("touchend", fin);
    return () => {
      c.removeEventListener("mousedown", ini);
      c.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", fin);
      c.removeEventListener("touchstart", ini);
      c.removeEventListener("touchmove", mover);
      c.removeEventListener("touchend", fin);
    };
  }, []);
  function borrar() {
    const c = ref.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setHay(false);
  }
  async function guardar() {
    setEstado("subiendo");
    const blob = await new Promise((res) => ref.current.toBlob(res, "image/png"));
    try {
      await subirArchivo(id, "firma", new File([blob], "firma.png", { type: "image/png" }), estudianteId);
      setEstado("ok");
      alFirmar && alFirmar();
    } catch (err) {
      setEstado({ error: err.message });
    }
  }
  if (estado === "ok")
    return (
      <div className="ce-pub-foto ok">
        <IconCheck size={18} />
        <span>
          <b>Firma guardada ✓</b>
        </span>
      </div>
    );
  return (
    <div style={{ marginTop: 8 }}>
      <canvas ref={ref} className="ce-pub-firma" />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="pb-btn sec" onClick={borrar} disabled={!hay || estado === "subiendo"}>
          Borrar
        </button>
        <button className="pb-btn" onClick={guardar} disabled={!hay || estado === "subiendo"}>
          {estado === "subiendo" ? "Guardando…" : "Guardar firma"}
        </button>
      </div>
      {estado?.error && <div className="pb-error">{estado.error}</div>}
    </div>
  );
}

export function Privacidad() {
  return (
    <div className="pb-priv">
      <IconLock size={15} />
      <span>Gus Dive Center no comparte esta información con nadie. Solo la usa para el registro de sus estudiantes.</span>
    </div>
  );
}

const PROGRESO = ["datos", "curso", "docs"];

// V59: las nacionalidades más comunes de quienes vienen a la tienda.
export const NACIONALIDADES = ["Estados Unidos", "España", "Venezuela", "Haití", "Colombia", "Puerto Rico", "Canadá", "Italia", "Francia", "Alemania", "Argentina", "Cuba", "México", "Reino Unido", "Otra"];

// V65 ("286"): los grupos del link y la información de cada curso.
const GRUPOS_CURSO = [
  { k: "buceo", t: "Cursos de buceo" },
  { k: "primeros_auxilios", t: "Primeros auxilios" },
  { k: "especialidad", t: "Especialidades" },
  { k: "otros", t: "Otros" },
];
function gruposCursos(cursos) {
  if (!cursos.some((c) => c.grupo)) return [{ k: "todos", t: "", lista: cursos }];
  const conocidos = GRUPOS_CURSO.map((g) => ({ ...g, lista: cursos.filter((c) => (c.grupo || "buceo") === g.k) }));
  const resto = cursos.filter((c) => c.grupo && !GRUPOS_CURSO.some((g) => g.k === c.grupo));
  if (resto.length) conocidos[3].lista.push(...resto);
  return conocidos.filter((g) => g.lista.length);
}
// Open Water → Nitrox; BLS → OXY.
const PAREJAS = [
  [/^open water diver$/i, /^nitrox$/i],
  [/^bls$/i, /^oxy$/i],
];
function extraDe(cursos, c) {
  const par = PAREJAS.find(([a]) => a.test(String(c.nombre || "").trim()));
  return par ? cursos.find((x) => par[1].test(String(x.nombre || "").trim())) || null : null;
}
function InfoCurso({ c, cerrar, escoger }) {
  const i = c.info || {};
  const filas = [
    ["Qué es", i.que],
    ["Aprenderás", i.aprenderas],
    ["Duración", i.duracion],
    ["Incluye", i.incluye],
    ["Requisitos", i.requisitos],
  ].filter(([, v]) => v);
  return (
    <div className="ce-info-fondo" onClick={cerrar}>
      <div className="ce-info" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ce-info-x" onClick={cerrar} aria-label="Cerrar">
          ×
        </button>
        <b className="ce-info-t">{c.nombre}</b>
        <div className="pb-h" style={{ margin: "2px 0 6px" }}>
          {[i.nivel, c.precio != null ? rd(c.precio) : ""].filter(Boolean).join(" · ")}
        </div>
        {filas.map(([k, v]) => (
          <div key={k} className="ce-info-f">
            <span>{k}</span>
            <div>{v}</div>
          </div>
        ))}
        <button className="pb-btn" onClick={escoger}>
          Escoger este curso
        </button>
      </div>
    </div>
  );
}

// V55 -- La semana del curso (Open Water: "79"), para cuando escoge la fecha.
function Semana({ inicio, semana }) {
  const dias = semanaDe(inicio, semana);
  if (!dias.length) return null;
  return (
    <div className="ce-pub-semana">
      {dias.map((d) => (
        <div key={d.dia}>
          <span>{d.dia}</span>
          <span>{d.texto}</span>
        </div>
      ))}
    </div>
  );
}

export default function EstudiantePublico({ cursos, tienda, conFechas = false, fijo = "", noAbierto = false }) {
  const [paso, setPaso] = useState("doc"); // doc | hola | cel | datos | curso | docs | listo | estado
  const [tipoDoc, setTipoDoc] = useState("cedula");
  const [avisoDni, setAvisoDni] = useState(false);
  const [adelanto, setAdelanto] = useState(false); // V61: subió documentos desde la lista de espera
  const [nacionalidad, setNacionalidad] = useState("");
  const [nacOtra, setNacOtra] = useState("");
  const [doc, setDoc] = useState("");
  const [cel, setCel] = useState("");
  const [buzo, setBuzo] = useState(null); // lo que devuelve "doc"
  const [d, setD] = useState({ nombre: "", nac: "", correo: "", direccion: "", emergencia: "" });
  const [buceos, setBuceos] = useState("");
  const [cursoId, setCursoId] = useState(cursos[0]?.id || "");
  const [fechaInicio, setFechaInicio] = useState("");
  // V55: el curso escogido en la lista ("71. B": primero el curso, después la fecha).
  const [cursoSel, setCursoSel] = useState("");
  const [fechaVista, setFechaVista] = useState("");
  const [res, setRes] = useState(null); // lo que devuelve "registrar"
  // V65 ("286"): la "i" de un curso y "Agregar Nitrox / OXY" (por curso).
  const [infoDe, setInfoDe] = useState(null);
  const [tambien, setTambien] = useState({});
  // V66 ("313. ok", maqueta V66): el link de un curso con fecha (?curso=) no
  // pide escoger curso. "¿Es otro curso?" lo quita y sale la lista de siempre.
  const [fijoId, setFijoId] = useState(fijo);
  // V62 ("229. si", maqueta V61): "Registrar a un menor de edad". El adulto
  // pone primero sus datos (documento y celular) y después los del menor.
  const [menor, setMenor] = useState(false);
  const [tutorNombre, setTutorNombre] = useState("");
  const [m, setM] = useState({ nombre: "", nac: "", parentesco: "" });
  const edadM = edadDe(m.nac);
  const primerM = primerNombre(m.nombre) || "El menor";
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  // Para subir las fotos: con la cédula y el celular; si es un menor, con el
  // permiso que da el servidor al registrarlo.
  const id = res?.menor ? { buzoId: res.buzoId, token: res.token } : { tipoDoc, doc, cel: soloDigitos(cel) };
  const curso = cursos.find((c) => c.id === cursoId);
  const wa = `https://wa.me/${numeroWhatsApp(tienda.whatsapp)}`;
  const ir = (p) => {
    setError("");
    setPaso(p);
    window.scrollTo(0, 0);
  };
  const correr = async (fn) => {
    setError("");
    setCargando(true);
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  };

  const buscar = () =>
    correr(async () => {
      const r = await api({ accion: "doc", tipoDoc, doc });
      setBuzo(r.encontrado ? r : null);
      ir(menor ? "tutor" : r.encontrado ? "hola" : "datos");
    });
  const verEstado = () =>
    correr(async () => {
      setEstado(await api({ accion: "estado", tipoDoc, doc, cel }));
      ir("estado");
    });
  const registrar = (extra = {}) =>
    correr(async () => {
      // V59: el contacto de emergencia se guarda como "Nombre · 809-000-0000".
      const emergencia = [String(d.emergenciaNombre || "").trim(), String(d.emergenciaCel || "").trim()].filter(Boolean).join(" · ") || d.emergencia;
      const nac = tipoDoc === "pasaporte" ? (nacionalidad === "Otra" ? nacOtra.trim() : nacionalidad) : "";
      const r = menor
        ? await api({ accion: "registrar", tipoDoc, doc, cel, tutorNombre, menor: m, datos: {}, buceos, cursoId: extra.cursoId || cursoId, fechaInicio, tambien: tambien[extra.cursoId || cursoId] || null, ...extra })
        : await api({ accion: "registrar", tipoDoc, doc, cel, datos: { ...d, emergencia, ...(nac ? { nacionalidad: nac } : {}) }, buceos, cursoId: extra.cursoId || cursoId, fechaInicio, tambien: tambien[extra.cursoId || cursoId] || null, ...extra });
      setRes(r);
      // V61 ("201"): si queda en lista de espera, va directo a "¡Listo!"; los
      // documentos son opcionales ("¿Quieres adelantar?").
      ir(r.espera && !r.ya ? "listo" : "docs");
    });
  const cursoElegido = cursos.find((c) => c.id === cursoSel);
  const fijoCurso = fijoId ? cursos.find((c) => c.fechas.some((f) => f.id === fijoId)) || null : null;
  const fijoFecha = fijoCurso ? fijoCurso.fechas.find((f) => f.id === fijoId) : null;
  const fijoLleno = fijoFecha?.quedan === 0;
  const fijoExtra = fijoCurso ? extraDe(cursos, fijoCurso) : null;

  const falta = buzo?.falta || { nac: true, direccion: true, emergencia: true, correo: true, foto: true, cedula: true };
  const pasoN = PROGRESO.indexOf(paso === "tutor" || paso === "menor" ? "datos" : paso);

  return (
    <div className="pb ce-pub">
      <div className="pb-head">
        <img src="/logo-gus-icon.png" alt="Gus Dive Center" style={{ height: 24 }} />
        {/* V54: logo de SNSI ("77. si"). */}
        <img src="/logo-snsi.png" alt="SNSI" className="ce-logo-snsi" />
        <span>Registro de estudiante</span>
      </div>
      <div className="pb-body">
        {pasoN >= 0 && (
          <div className="ce-pub-prog">
            {PROGRESO.map((x, i) => (
              <i key={x} className={i <= pasoN ? "ya" : ""} />
            ))}
          </div>
        )}

        {fijoCurso && (paso === "doc" || paso === "hola") && (
          <div className="ce-pub-banda">
            {menor ? "Vas a registrar a un menor en" : "Te vas a registrar en"}
            <b>{fijoCurso.nombre}</b>
            Empieza el {fechaLarga(fijoFecha.inicio)}
          </div>
        )}
        {noAbierto && !fijoCurso && paso === "doc" && <div className="ce-pub-banda gris">Ese curso ya no está abierto. Más adelante escoges tu curso.</div>}

        {paso === "doc" && (
          <div className="pb-card">
            {/* V59 ("163", maqueta-v59 pestaña 6): "¡Bienvenido!", "Cédula" y "Otro
                documento" (pasaporte o documento de otro país, con la nacionalidad). */}
            {menor ? (
              <>
                <div className="pb-t">Registrar a un menor</div>
                <div className="pb-h">Primero pon tu documento (el tuyo, del adulto). Después pones los datos del menor.</div>
              </>
            ) : (
              <>
                <div className="pb-t">¡Bienvenido!</div>
                <div className="pb-h">Pon tu documento para empezar.</div>
              </>
            )}
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
                  // Si escriben letras o más de 11 números, no es cédula dominicana.
                  setAvisoDni(/[a-z]/i.test(v) || soloDigitos(v).length > 11);
                  setDoc(formatoCedula(v));
                } else setDoc(v.toUpperCase());
              }}
              placeholder={tipoDoc === "cedula" ? "000-0000000-0" : "Ej. AB123456 o 12345678Z"}
              onKeyDown={(e) => e.key === "Enter" && doc && !cargando && buscar()}
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
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={cargando || !doc} onClick={buscar}>
              {cargando ? "Buscando…" : "Seguir"}
            </button>
            <Privacidad />
            {menor ? (
              <button className="pb-link" onClick={() => setMenor(false)}>
                ← No, me voy a registrar yo
              </button>
            ) : (
              <div className="ce-pub-menor">
                <b>¿Vas a registrar a un menor de edad?</b>
                <div className="pb-h" style={{ margin: "2px 0 8px" }}>
                  Hijo, hija o alguien a tu cargo. Primero pones tus datos y después los suyos.
                </div>
                <button className="pb-btn sec" onClick={() => (setMenor(true), setError(""), window.scrollTo(0, 0))}>
                  Registrar a un menor de edad
                </button>
              </div>
            )}
          </div>
        )}

        {/* V62 ("229"): los datos del adulto que registra al menor. */}
        {paso === "tutor" && (
          <div className="pb-card">
            {buzo ? (
              <>
                <div className="pb-t">¡Hola, {buzo.primer}!</div>
            {/* V64 ("278. A"): el nombre completo, con el final del celular. */}
            {buzo.nombre && (
              <div className="pb-h" style={{ margin: "0 0 6px" }}>
                {buzo.nombre}
                {buzo.tieneCel ? ` · celular que termina en ${String(buzo.cel).slice(-4)}` : ""}
              </div>
            )}
                <div className="pb-h">{buzo.tieneCel ? `Para confirmar que eres tú, escribe tu celular (el que termina en ${String(buzo.cel).slice(-4)}).` : "Escribe tu celular. Por ahí te escribimos."}</div>
              </>
            ) : (
              <>
                <div className="pb-t">Tus datos</div>
                <div className="pb-h">Los tuyos, del adulto. Por WhatsApp te escribimos a ti.</div>
                <label className="ce-pub-l">Tu nombre completo</label>
                <input className="pb-input" value={tutorNombre} onChange={(e) => setTutorNombre(e.target.value)} placeholder="Nombre y apellido" />
                <label className="ce-pub-l">Tu celular (WhatsApp)</label>
              </>
            )}
            <CampoCel className="pb-input" value={cel} onChange={setCel} />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={!celValido(cel) || (!buzo && !tutorNombre.trim())} onClick={() => ir("menor")}>
              Seguir
            </button>
            <button className="pb-btn sec" onClick={() => ir("doc")}>
              Atrás
            </button>
          </div>
        )}

        {paso === "menor" && (
          <div className="pb-card">
            <div className="ce-pub-registra">
              Lo registra: <b>{buzo ? buzo.corto : tutorNombre.trim()}</b>
              {m.parentesco ? ` (${m.parentesco.toLowerCase()})` : ""} · <span style={{ whiteSpace: "nowrap" }}>{String(soloDigitos(cel)).replace(/^(\d{3})\d{3}(\d{4})$/, "$1-•••-$2")}</span>
            </div>
            <div className="pb-t">Datos del menor</div>
            <label className="ce-pub-l">Nombre completo</label>
            <input className="pb-input" value={m.nombre} onChange={(e) => setM({ ...m, nombre: e.target.value })} placeholder="Nombre y apellido del menor" />
            <label className="ce-pub-l">Fecha de nacimiento</label>
            <FechaNacimiento value={m.nac} onChange={(v) => setM({ ...m, nac: v })} selectClassName="pb-input" />
            {edadM != null && (
              <div className={edadM < 12 || edadM >= 18 ? "pb-error" : "pb-h"} style={{ marginTop: 6 }}>
                {primerM} tiene {edadM} año{edadM === 1 ? "" : "s"}.
                {edadM < 12 ? " El buceo es de 12 años en adelante. Escríbenos por WhatsApp si tienes dudas." : edadM >= 18 ? " Si tiene 18 años o más, que se registre con su propio documento." : ""}
              </div>
            )}
            <label className="ce-pub-l">Parentesco</label>
            <div className="pb-seg">
              {["Mamá", "Papá", "Tutor"].map((x) => (
                <button key={x} className={m.parentesco === x ? "sel" : ""} onClick={() => setM({ ...m, parentesco: x })}>
                  {x}
                </button>
              ))}
            </div>
            <label className="ce-pub-l">¿Cuántos buceos tiene?</label>
            <input className="pb-input" inputMode="numeric" value={buceos} onChange={(e) => setBuceos(e.target.value.replace(/\D/g, ""))} placeholder="0" />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={!m.nombre.trim() || edadM == null || edadM < 12 || edadM >= 18 || !m.parentesco} onClick={() => ir("curso")}>
              Seguir
            </button>
            <button className="pb-btn sec" onClick={() => ir("tutor")}>
              Atrás
            </button>
          </div>
        )}

        {paso === "hola" && buzo && (
          <div className="pb-card">
            <div className="pb-t">¡Hola, {buzo.primer}!</div>
            {/* V64 ("278. A"): el nombre completo, con el final del celular. */}
            {buzo.nombre && (
              <div className="pb-h" style={{ margin: "0 0 6px" }}>
                {buzo.nombre}
                {buzo.tieneCel ? ` · celular que termina en ${String(buzo.cel).slice(-4)}` : ""}
              </div>
            )}
            {/* V54: sin "Ya te tenemos registrado de antes" (nota 1-nov). */}
            <div className="pb-h">¿Qué quieres hacer?</div>
            {/* V59 (nota 2-nov): sin "Solo te pedimos lo que nos falta" ni "No soy yo";
                una flecha para volver. */}
            <button className="pb-op" onClick={() => ir("cel")}>
              Registrarme en un curso
            </button>
            {/* V63 ("162", Mi registro): "Mis documentos". */}
            <button className="pb-op" onClick={() => ir("cel-estado")}>
              Mis documentos
              <div className="pb-op-sub">Tus datos, tus cursos con tu pago, tu foto y tu firma.</div>
            </button>
            <button className="pb-link" onClick={() => ir("doc")}>
              ← Volver
            </button>
          </div>
        )}

        {(paso === "cel" || paso === "cel-estado") && (
          <div className="pb-card">
            <div className="pb-t">Tu celular</div>
            <div className="pb-h">{buzo?.tieneCel ? `Para confirmar que eres tú, escribe tu celular (el que termina en ${String(buzo.cel).slice(-4)}).` : "Escribe tu celular. Por ahí te escribimos."}</div>
            <CampoCel
              className="pb-input"
              value={cel}
              onChange={setCel}
              onKeyDown={(e) => e.key === "Enter" && !cargando && celValido(cel) && (paso === "cel-estado" ? verEstado() : ir("datos"))}
            />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={cargando || !celValido(cel)} onClick={() => (paso === "cel-estado" ? verEstado() : ir("datos"))}>
              {cargando ? "Un momento…" : "Seguir"}
            </button>
            <button className="pb-btn sec" onClick={() => ir("hola")}>
              Atrás
            </button>
          </div>
        )}

        {paso === "datos" && (
          <div className="pb-card">
            <div className="pb-t">Tus datos</div>
            {buzo && <div className="pb-h">Solo lo que nos falta de ti.</div>}
            {!buzo && (
              <>
                <label className="ce-pub-l">Nombre completo</label>
                <input className="pb-input" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} placeholder="Nombre y apellido" />
                <label className="ce-pub-l">Celular (WhatsApp)</label>
                <CampoCel className="pb-input" value={cel} onChange={setCel} />
              </>
            )}
            {falta.nac && (
              <>
                <label className="ce-pub-l">Fecha de nacimiento</label>
                <FechaNacimiento value={d.nac} onChange={(v) => setD({ ...d, nac: v })} selectClassName="pb-input" />
                {/* V60 (nota 2-nov): el buceo es de 12 años en adelante. */}
                {menorDe12(d.nac) && <div className="pb-error">Para bucear hay que tener 12 años o más. Escríbenos por WhatsApp si tienes dudas.</div>}
              </>
            )}
            {falta.correo && (
              <>
                <label className="ce-pub-l">Correo</label>
                <input className="pb-input" type="email" value={d.correo} onChange={(e) => setD({ ...d, correo: e.target.value })} placeholder="tucorreo@ejemplo.com" />
              </>
            )}
            {falta.direccion && (
              <>
                <label className="ce-pub-l">Dirección</label>
                <input className="pb-input" value={d.direccion} onChange={(e) => setD({ ...d, direccion: e.target.value })} placeholder="Calle, número, sector" />
              </>
            )}
            {falta.emergencia && (
              <>
                {/* V59 (nota 2-nov): "en contacto de emergencia pide nombre y número". */}
                <label className="ce-pub-l">Contacto de emergencia</label>
                <div className="ce-pub-dos">
                  <input className="pb-input" value={d.emergenciaNombre || ""} onChange={(e) => setD({ ...d, emergenciaNombre: e.target.value })} placeholder="Nombre" />
                  <CampoCel className="pb-input" value={d.emergenciaCel || ""} onChange={(v) => setD({ ...d, emergenciaCel: v })} placeholder="Su celular" />
                </div>
              </>
            )}
            <label className="ce-pub-l">¿Cuántos buceos tienes?</label>
            <input className="pb-input" inputMode="numeric" value={buceos} onChange={(e) => setBuceos(e.target.value.replace(/\D/g, ""))} placeholder="0" />
            {error && <div className="pb-error">{error}</div>}
            <button
              className="pb-btn"
              disabled={(!buzo && (!d.nombre.trim() || !celValido(cel))) || (falta.nac && !d.nac) || menorDe12(d.nac)}
              onClick={() => ir("curso")}
            >
              Seguir
            </button>
            <button className="pb-btn sec" onClick={() => ir(buzo ? "cel" : "doc")}>
              Atrás
            </button>
          </div>
        )}

        {paso === "curso" && !conFechas && (
          <div className="pb-card">
            <div className="pb-t">Tu curso</div>
            <label className="ce-pub-l">¿Qué curso vas a tomar?</label>
            <select className="pb-input" value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {curso?.precio != null && <div className="pb-h">Precio: {rd(curso.precio)}</div>}
            <label className="ce-pub-l">¿Cuándo empiezas?</label>
            <input className="pb-input" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={cargando || !cursoId} onClick={() => registrar()}>
              {cargando ? "Registrando…" : "Seguir"}
            </button>
            <button className="pb-btn sec" onClick={() => ir(menor ? "menor" : "datos")}>
              Atrás
            </button>
          </div>
        )}

        {/* V55: primero el curso y después la fecha ("71. B"), con precio ("74"),
            cupos ("72") y la semana de Open Water ("79"). Sin fecha o llena:
            lista de espera ("65"). */}
        {paso === "curso" && conFechas && !fijoCurso && !cursoElegido && (
          <div className="pb-card">
            <div className="pb-t">{menor ? `El curso de ${primerM}` : "Tu curso"}</div>
            <div className="pb-h">{menor ? "¿Qué curso va a tomar?" : "¿Qué curso vas a tomar?"}</div>
            {/* V65 ("286. ok", maqueta V64): por grupos y por niveles; la "i" con
                la información; Nitrox dentro de Open Water y OXY dentro de BLS. */}
            {gruposCursos(cursos).map((g) => (
              <div key={g.k}>
                {g.t && <div className="ce-op-grupo">{g.t}</div>}
                {g.lista.map((c) => {
                  const extra = extraDe(cursos, c);
                  return (
                    <div key={c.id} className={`pb-op ce-op${c.fechas.length ? "" : " gris"}`}>
                      <button
                        type="button"
                        className="ce-op-main"
                        onClick={() => {
                          setCursoSel(c.id);
                          setCursoId(c.id);
                          setFechaVista("");
                          if (!c.fechas.length) ir("espera");
                        }}
                      >
                        {c.nombre}
                        <div className="pb-op-sub">{c.fechas.length ? `${c.fechas.length} ${c.fechas.length === 1 ? "fecha próxima" : "fechas próximas"}` : "Todavía no hay fecha"}</div>
                        {c.precio != null && <div className="ce-pub-precio">{rd(c.precio)}</div>}
                        {!c.fechas.length && <span className="ce-pub-chip espera">Lista de espera</span>}
                      </button>
                      {c.info && (
                        <button type="button" className="ce-op-i" aria-label={`Información de ${c.nombre}`} onClick={() => setInfoDe(c)}>
                          i
                        </button>
                      )}
                      {extra && (
                        <label className="ce-op-extra">
                          <input type="checkbox" checked={tambien[c.id] === extra.id} onChange={(e) => setTambien({ ...tambien, [c.id]: e.target.checked ? extra.id : null })} />
                          Agregar {extra.nombre}
                          {extra.precio != null ? ` (+${rd(extra.precio)})` : ""}
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {infoDe && <InfoCurso c={infoDe} cerrar={() => setInfoDe(null)} escoger={() => (setInfoDe(null), setCursoSel(infoDe.id), setCursoId(infoDe.id), setFechaVista(""), !infoDe.fechas.length && ir("espera"))} />}
            <button className="pb-btn sec" onClick={() => ir(menor ? "menor" : "datos")}>
              Atrás
            </button>
          </div>
        )}

        {paso === "curso" && conFechas && !fijoCurso && cursoElegido && (
          <div className="pb-card">
            <div className="pb-t">{cursoElegido.nombre}</div>
            <div className="pb-h">
              ¿Cuándo quieres empezar?{cursoElegido.precio != null ? ` Precio: ${rd(cursoElegido.precio)}.` : ""}
            </div>
            {cursoElegido.fechas.map((f) => {
              const llena = f.quedan === 0;
              const abierta = fechaVista === f.id;
              return (
                <div key={f.id}>
                  <button className={`pb-op${abierta ? " sel" : ""}`} onClick={() => setFechaVista(abierta ? "" : f.id)}>
                    Empieza el {fechaLarga(f.inicio)}
                    {f.quedan != null && <span className={`ce-pub-chip ${llena ? "lleno" : "ok"}`}>{llena ? "Lleno · lista de espera" : `Quedan ${f.quedan} ${f.quedan === 1 ? "cupo" : "cupos"}`}</span>}
                  </button>
                  {abierta && (
                    <div style={{ margin: "-2px 0 10px" }}>
                      <Semana inicio={f.inicio} semana={cursoElegido.semana} />
                      {error && <div className="pb-error">{error}</div>}
                      <button className="pb-btn" disabled={cargando} onClick={() => registrar({ cursoId: cursoElegido.id, fechaId: f.id, espera: llena })}>
                        {cargando ? "Registrando…" : llena ? "Ponerme en la lista de espera" : "Escoger esta fecha"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <button className="pb-btn sec" onClick={() => (setCursoSel(""), setFechaVista(""))}>
              Escoger otro curso
            </button>
          </div>
        )}

        {paso === "curso" && conFechas && fijoCurso && (
          <div className="pb-card">
            <div className="pb-h" style={{ margin: 0 }}>{menor ? `El curso de ${primerM}` : "Tu curso"}</div>
            <div className="pb-t">{fijoCurso.nombre}</div>
            <div className="pb-h" style={{ marginTop: 0 }}>
              Empieza el {fechaLarga(fijoFecha.inicio)}
              {(fijoFecha.quedan != null || fijoLleno) && <> <span className={`ce-pub-chip ${fijoLleno ? "lleno" : "ok"}`}>{fijoLleno ? "Lleno" : `Quedan ${fijoFecha.quedan} ${fijoFecha.quedan === 1 ? "cupo" : "cupos"}`}</span></>}
            </div>
            {fijoLleno ? (
              <div className="pb-h">Esta fecha ya se llenó.</div>
            ) : (
              <>
                {fijoCurso.precio != null && <div className="ce-pub-precio">{rd(fijoCurso.precio)}</div>}
                <div style={{ textAlign: "left" }}>
                  <Semana inicio={fijoFecha.inicio} semana={fijoCurso.semana} />
                </div>
                {fijoExtra && (
                  <label className="ce-op-extra ce-fijo-extra">
                    <input type="checkbox" checked={tambien[fijoCurso.id] === fijoExtra.id} onChange={(e) => setTambien({ ...tambien, [fijoCurso.id]: e.target.checked ? fijoExtra.id : null })} />
                    Agregar {fijoExtra.nombre}
                    {fijoExtra.precio != null ? ` (+${rd(fijoExtra.precio)})` : ""}
                  </label>
                )}
              </>
            )}
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={cargando} onClick={() => registrar({ cursoId: fijoCurso.id, fechaId: fijoFecha.id, espera: fijoLleno })}>
              {cargando ? "Registrando…" : fijoLleno ? "Ponerme en la lista de espera" : "Inscribirme"}
            </button>
            {fijoLleno && fijoCurso.fechas.length > 1 ? (
              <button className="pb-btn sec" onClick={() => (setFijoId(""), setCursoSel(fijoCurso.id), setCursoId(fijoCurso.id), setFechaVista(""))}>
                Ver otras fechas de {fijoCurso.nombre}
              </button>
            ) : (
              <button className="pb-link" style={{ display: "block", margin: "12px auto 0" }} onClick={() => (setFijoId(""), setCursoSel(""), setFechaVista(""))}>
                ¿Es otro curso? Ver todos los cursos
              </button>
            )}
            <button className="pb-btn sec" onClick={() => ir(menor ? "menor" : "datos")}>
              Atrás
            </button>
          </div>
        )}

        {paso === "espera" && cursoElegido && (
          <div className="pb-card">
            {/* V59 (maqueta-v57 pestaña 2, "114"; nota 2-nov: "que el estudiante
                decida qué quiere hacer"): un título claro, una frase, y él decide. */}
            <div className="ce-pub-espera">
              <div className="ce-pub-espera-ic">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="4.5" width="18" height="16" rx="2" />
                  <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
                </svg>
              </div>
              <div className="pb-t">Todavía no hay fecha</div>
              <div className="pb-h">
                para <b>{cursoElegido.nombre}</b>
              </div>
            </div>
            <div className="ce-pub-aviso" style={{ textAlign: "center" }}>
              Déjanos tus datos y te avisamos por WhatsApp cuando abramos este curso.
            </div>
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={cargando} onClick={() => registrar({ cursoId: cursoElegido.id, espera: true })}>
              {/* V64 ("287. C") */}
              {cargando ? "Un momento…" : "Quiero que me avisen"}
            </button>
            <button className="pb-btn sec" onClick={() => (setCursoSel(""), ir("curso"))}>
              Ver otro curso
            </button>
          </div>
        )}

        {paso === "docs" && res && (
          <div className="pb-card">
            <div className="pb-t">Documentos</div>
            {res.menor ? (
              <>
                {/* V62 ("229"): las fotos son del menor y firma el adulto. */}
                <div className="pb-h">Con esto no tienen que traer copias a la tienda.</div>
                <Subir id={id} que="foto" titulo={`Una foto de ${res.primer} de frente`} sub="Para su certificación. Con buena luz y sin lentes de sol." capture="user" />
                <Subir id={id} que="cedula" titulo="Su acta de nacimiento o su pasaporte" sub="Una foto o un escaneo donde se lea bien (JPG, PNG, PDF o HEIC)." accept="image/*,application/pdf,.heic,.heif" />
              </>
            ) : (
              <>
                <div className="pb-h">Con esto no tienes que traer copias a la tienda. Si ahora no puedes, lo haces después entrando otra vez con tu cédula.</div>
                <Subir id={id} que="foto" titulo="Una foto tuya de frente" sub="Para tu certificación. Con buena luz y sin lentes de sol." capture="user" listo={buzo && !falta.foto} />
                <SubirCedula id={id} tipoDoc={tipoDoc} listo={buzo && !falta.cedula} />
              </>
            )}
            {/* V64 ("288"): en el registro ya no se pide la firma del récord de
                entrenamiento (todavía no ha visto nada). Se integra después con
                el récord, como diga Pipe. */}
            <button className="pb-btn" onClick={() => ir("listo")}>
              Terminar
            </button>
          </div>
        )}

        {paso === "listo" && res && (
          <div className={`pb-card${res.espera && !res.ya ? " ce-fin-espera" : ""}`} style={{ textAlign: "center" }}>
            <div className="pb-ok">
              <IconCheck size={res.espera && !res.ya ? 40 : 34} />
            </div>
            <div className="pb-t">{res.menor ? `¡Listo! ${res.primer} quedó ${res.espera && !res.ya ? "anotado" : "registrado"}.` : `¡Listo, ${res.primer}!`}</div>
            {/* V66 ("303. B", maqueta V65): la de lista de espera es sencilla y
                grande: el visto, "¡Listo, Juanito!" y una frase. */}
            {/* V54: sin lo del pago ni lo de la certificación (nota 1-nov: "porque
                le esta pidiendo eso si el estudiante ni sabe aún el curso... No
                hace sentido, el buzo ni siquiera ha empezado el curso"). */}
            <div className="pb-h">
              {res.menor
                ? res.ya
                  ? `Ya teníamos a ${res.primer} en ${res.curso}. Te escribiremos por WhatsApp para coordinar.`
                  : res.espera
                    ? <>Te avisamos por WhatsApp cuando haya fecha para <b>{res.curso}</b>.</>
                    : `Ya tenemos sus datos para ${res.curso}${res.fecha ? `, que empieza el ${fechaLarga(res.fecha)}` : ""}. Te escribiremos por WhatsApp para coordinar.`
                : res.ya
                ? `Ya te teníamos en ${res.curso}. Te escribiremos por WhatsApp para coordinar.`
                : res.espera
                  ? res.llena
                    ? <>Esa fecha se llenó. Te avisamos por WhatsApp si se abre un cupo o cuando haya otra fecha para <b>{res.curso}</b>.</>
                    : <>Te avisamos por WhatsApp cuando haya fecha para <b>{res.curso}</b>.</>
                  : res.fecha
                    ? `Ya tenemos tus datos para ${res.curso}, que empieza el ${fechaLarga(res.fecha)}. Te escribiremos por WhatsApp para coordinar.`
                    : `Ya tenemos tus datos para ${res.curso}. Te escribiremos por WhatsApp para coordinar.`}
            </div>
            {res.tambien && (
              <div className="pb-h" style={{ marginTop: 4 }}>
                También quedaste anotado en <b>{res.tambien}</b>: te escribimos para la fecha.
              </div>
            )}
            {res.fecha && res.semana && (
              <div style={{ textAlign: "left" }}>
                <Semana inicio={res.fecha} semana={res.semana} />
              </div>
            )}
            {res.espera && !res.ya ? (
              <>
                {/* V66 ("312. A", maqueta V66): el botón grande es para algo que puede
                    hacer ya (adelantar sus documentos, opcional); WhatsApp, chiquito
                    abajo, por si tiene una pregunta. */}
                {!adelanto && (
                  <>
                    <button className="pb-btn ce-fin-btn" onClick={() => (setAdelanto(true), ir("docs"))}>
                      Adelantar mis documentos
                    </button>
                    <div className="ce-fin-mini">
                      Opcional: {res.menor ? `la foto de ${res.primer} y su documento` : tipoDoc === "cedula" ? "tu foto y tu cédula" : "tu foto y tu documento"}, para que cuando haya fecha ya esté listo.
                    </div>
                  </>
                )}
                <a className="ce-fin-wa" href={wa} target="_blank" rel="noopener noreferrer">
                  ¿Tienes alguna pregunta? Escríbenos
                </a>
              </>
            ) : (
              <a className="pb-btn ce-pub-wa" href={wa} target="_blank" rel="noopener noreferrer">
                Escribir por WhatsApp
              </a>
            )}
          </div>
        )}

        {paso === "estado" && estado && <MisDocumentos estado={estado} setEstado={setEstado} id={id} tipoDoc={tipoDoc} doc={doc} cel={cel} setCel={setCel} tienda={tienda} wa={wa} ir={ir} />}
      </div>
    </div>
  );
}

// V63 ("162", Mi registro): cuando el estudiante vuelve a entrar con su
// cédula y su celular, ve "Mis documentos": sus datos (y los puede cambiar),
// sus cursos con cómo va y el pago adentro (con un aviso de lo que debe), su
// foto y su firma (se cambian cada 6 meses) y, si registró a un menor, cómo va.
const fechaDMA = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
function MisDocumentos({ estado, setEstado, id, tipoDoc, doc, cel, setCel, tienda, wa, ir }) {
  // V64 ("279"): cambiar su celular, una vez al mes.
  const [cambiaCel, setCambiaCel] = useState(false);
  const [nuevoCel, setNuevoCel] = useState({ a: "", b: "" });
  const [msjCel, setMsjCel] = useState("");
  async function guardarCel() {
    setMsjCel("");
    try {
      const r = await api({ accion: "cel-cambiar", tipoDoc, doc, cel, nuevo: nuevoCel.a, otraVez: nuevoCel.b });
      setCel(soloDigitos(nuevoCel.a));
      const desde = new Date(Date.now() + 30 * 86400000 - 4 * 3600000).toISOString().slice(0, 10);
      setEstado({ ...estado, datos: { ...estado.datos, cel: r.cel }, celCambio: { puede: false, desde } });
      setCambiaCel(false);
      setNuevoCel({ a: "", b: "" });
      setMsjCel("Listo, ya tenemos tu celular nuevo.");
    } catch (e) {
      setMsjCel(e.message);
    }
  }
  const [d, setD] = useState({ correo: estado.datos?.correo || "", direccion: estado.datos?.direccion || "", emergencia: estado.datos?.emergencia || "" });
  const [guardando, setGuardando] = useState(false);
  const [msj, setMsj] = useState("");
  const [firmando, setFirmando] = useState(null);
  const cambio = estado.datos && (d.correo !== (estado.datos.correo || "") || d.direccion !== (estado.datos.direccion || "") || d.emergencia !== (estado.datos.emergencia || ""));
  async function guardar() {
    setGuardando(true);
    setMsj("");
    try {
      await api({ accion: "datos", tipoDoc, doc, cel, datos: d });
      setEstado({ ...estado, datos: { ...estado.datos, ...d } });
      setMsj("Guardado.");
    } catch (e) {
      setMsj(e.message);
    }
    setGuardando(false);
  }
  const ORDEN = ["curso", "almacen", "certificacion", "entregada"];
  return (
    <div className="pb-card">
      <div className="pb-t">Mis documentos</div>
      <div className="pb-h">Hola, {estado.primer}.</div>

      {estado.datos && (
        <div className="ce-mis">
          <div className="ce-mis-t">Mis datos</div>
          <div className="ce-mis-fijo">
            <span>{estado.datos.nombre}</span>
            <span>
              Celular que termina en {String(estado.datos.cel || "").slice(-4)}
              {estado.celCambio?.puede !== false ? (
                !cambiaCel && (
                  <>
                    {" · "}
                    <a className="pb-perfil-link" onClick={() => (setCambiaCel(true), setMsjCel(""))}>
                      Cambiar mi celular
                    </a>
                  </>
                )
              ) : (
                <> · lo puedes cambiar desde el {fechaDMA(estado.celCambio.desde)}</>
              )}
            </span>
            {estado.datos.nac && <span>Nació el {fechaDMA(estado.datos.nac)}</span>}
          </div>
          {cambiaCel && (
            <div className="pb-perfil-caja">
              <b>Cambiar mi celular</b>
              <div className="pb-h" style={{ margin: "2px 0 6px" }}>
                Se puede cambiar una vez al mes. Por ese número te escribimos por WhatsApp y con él entras aquí.
              </div>
              <label className="ce-pub-l">Celular nuevo (WhatsApp)</label>
              <CampoCel className="pb-input" value={nuevoCel.a} onChange={(x) => setNuevoCel({ ...nuevoCel, a: x })} />
              <label className="ce-pub-l">Escríbelo otra vez</label>
              <CampoCel className="pb-input" value={nuevoCel.b} onChange={(x) => setNuevoCel({ ...nuevoCel, b: x })} />
              <button className="pb-btn" disabled={!celValido(nuevoCel.a) || !celValido(nuevoCel.b)} onClick={guardarCel}>
                Guardar mi celular nuevo
              </button>
              <button className="pb-btn sec pb-chico" onClick={() => (setCambiaCel(false), setMsjCel(""))}>
                Cancelar
              </button>
            </div>
          )}
          {msjCel && <div className={/^Listo/.test(msjCel) ? "pb-h" : "pb-error"}>{msjCel}</div>}
          <label className="ce-pub-l">Correo</label>
          <input className="pb-input" type="email" value={d.correo} onChange={(e) => setD({ ...d, correo: e.target.value })} placeholder="tucorreo@ejemplo.com" />
          <label className="ce-pub-l">Dirección</label>
          <input className="pb-input" value={d.direccion} onChange={(e) => setD({ ...d, direccion: e.target.value })} placeholder="Calle, número, sector" />
          <label className="ce-pub-l">Contacto de emergencia</label>
          <input className="pb-input" value={d.emergencia} onChange={(e) => setD({ ...d, emergencia: e.target.value })} placeholder="Nombre · celular" />
          {cambio && (
            <button className="pb-btn" disabled={guardando} onClick={guardar}>
              {guardando ? "Guardando…" : "Guardar mis datos"}
            </button>
          )}
          {msj && <div className={msj === "Guardado." ? "pb-h" : "pb-error"}>{msj}</div>}
          <div className="pb-h" style={{ fontSize: 12.5 }}>
            Para cambiar tu nombre o tu documento, escríbenos por WhatsApp.
          </div>
        </div>
      )}

      <div className="ce-mis-t" style={{ marginTop: 14 }}>
        Mis cursos
      </div>
      {!estado.estudios.length && <div className="pb-h">Todavía no tienes un curso registrado.</div>}
      {estado.estudios.map((e) => (
        <div key={e.id} className="ce-pub-curso">
          <b>{e.curso}</b>
          <div className="pb-h" style={{ margin: "2px 0 6px" }}>
            {[e.escuela, e.fechaInicio ? `${e.fechaInicio > new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10) ? "empieza" : "empezó"} el ${fechaCorta(e.fechaInicio)}` : ""].filter(Boolean).join(" · ")}
          </div>
          {e.estado === "espera" && <div className="ce-pub-aviso" style={{ marginBottom: 6 }}>Estás en la lista de espera. Te escribimos por WhatsApp cuando haya fecha.</div>}
          {e.estado !== "espera" &&
            [
              { k: "curso", t: "En curso", sub: "Terminando las clases, el pago y el examen." },
              { k: "almacen", t: "Estamos procesando tu certificación", sub: `La mandamos a ${e.escuela || "la escuela"}.` },
              { k: "certificacion", t: "Tu certificación está lista", sub: "Te vamos a avisar por WhatsApp." },
              { k: "entregada", t: "¡Listo, ya estás certificado!", sub: `${e.escuela || "La escuela"} te mandó un correo con tus datos para entrar a su app. ¡Felicidades!` },
            ].map((x) => {
              const actual = ORDEN.indexOf(e.estado === "avisado" ? "entregada" : e.estado);
              const yo = ORDEN.indexOf(x.k);
              return (
                <div key={x.k} className="ce-pub-et">
                  <i className={yo < actual ? "ok" : yo === actual ? "ya" : ""} />
                  <div>
                    <b>{x.t}</b>
                    {yo === actual && <div className="pb-h" style={{ margin: 0 }}>{x.sub}</div>}
                  </div>
                </div>
              );
            })}
          {e.estado === "curso" && e.avance && (
            <div className="ce-mis-avance">
              <div>
                Llevas {e.avance.hechos} de {e.avance.total}
                {e.falta?.length ? ` · te falta: ${e.falta.join(", ")}` : ""}
              </div>
              <span className="ce-barra">
                <i style={{ width: `${e.avance.pct}%` }} />
              </span>
            </div>
          )}
          {e.precio != null && (
            <div className={`ce-pub-pago${e.debe > 0 ? " debe" : ""}`}>
              <b>{e.debe > 0 ? `Te falta pagar ${rd(e.debe)}` : "Tu pago está completo"}</b>
              <div>
                Curso {rd(e.precio)} · pagado {rd(e.pagado)}
              </div>
            </div>
          )}
          {e.debe !== 0 && <Pago tienda={tienda} id={id} estudianteId={e.id} soloSubir={e.precio == null} />}
          {e.firma && e.estado !== "espera" && (
            <div className="ce-mis-firma">
              {e.firma.hay && !e.firma.puede ? (
                <div className="ce-pub-foto ok">
                  <IconCheck size={18} />
                  <span>
                    <b>Firma guardada ✓</b>
                    <small>Se puede cambiar desde el {fechaDMA(e.firma.desde)}.</small>
                  </span>
                </div>
              ) : firmando === e.id || !e.firma.hay ? (
                <>
                  <label className="ce-pub-l">Firma para tu récord de entrenamiento</label>
                  <Firma id={id} estudianteId={e.id} alFirmar={() => setFirmando(null)} />
                </>
              ) : (
                <button className="pb-btn sec pb-chico" onClick={() => setFirmando(e.id)}>
                  Cambiar mi firma
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="ce-mis-t" style={{ marginTop: 14 }}>
        Mi foto y mi documento
      </div>
      {estado.foto?.hay && !estado.foto.puede ? (
        <div className="ce-pub-foto ok">
          <IconCheck size={18} />
          <span>
            <b>Tu foto ✓</b>
            <small>Se puede cambiar desde el {fechaDMA(estado.foto.desde)}.</small>
          </span>
        </div>
      ) : (
        <Subir id={id} que="foto" titulo={estado.foto?.hay ? "Cambiar mi foto de frente" : "Una foto tuya de frente"} capture="user" listo={false} />
      )}
      <SubirCedula id={id} tipoDoc={tipoDoc} listo={!estado.falta?.cedula} />
      <div className="pb-h" style={{ fontSize: 12.5 }}>
        La foto y la firma se pueden cambiar cada 6 meses.
      </div>

      {estado.menores?.length > 0 && (
        <>
          <div className="ce-mis-t" style={{ marginTop: 14 }}>
            Los que registraste
          </div>
          {estado.menores.map((m, i) => (
            <div key={i} className="ce-pub-curso">
              <b>{m.primer}</b>
              {m.estudios.map((e) => (
                <div key={e.id} className="pb-h" style={{ margin: "2px 0 0" }}>
                  {e.curso} — {e.estado === "espera" ? "lista de espera" : e.etapa.toLowerCase()}
                  {e.debe > 0 ? ` · falta pagar ${rd(e.debe)}` : ""}
                </div>
              ))}
              {!m.estudios.length && <div className="pb-h">Sin curso.</div>}
            </div>
          ))}
        </>
      )}

      <a className="pb-btn ce-pub-wa" href={wa} target="_blank" rel="noopener noreferrer">
        Escribir por WhatsApp
      </a>
      <button className="pb-link" onClick={() => ir("doc")}>
        Volver al inicio
      </button>
    </div>
  );
}

function Pago({ tienda, precio, id, estudianteId, soloSubir }) {
  const [copiado, setCopiado] = useState("");
  const copiar = (n) => {
    try {
      navigator.clipboard.writeText(n);
    } catch {}
    setCopiado(n);
    setTimeout(() => setCopiado(""), 1800);
  };
  const subir = <Subir id={id} que="comprobante" titulo="Subir comprobante de pago" sub="Foto o PDF de la transferencia." accept="image/*,application/pdf,.heic,.heif" estudianteId={estudianteId} />;
  if (soloSubir || !tienda.cuentas?.length) return subir;
  return (
    <div className="pb-comp">
      {/* V54: las cuentas de los cursos no son las de los buceos (nota 1-nov:
          "Aqui los datos bancarios cambian"; "70.": Gus Dive SRL, pesos y
          dólares, con el RNC). Están en CUENTAS_CURSOS (lib/estudiantes/modelo.js). */}
      <b>Para pagar{precio != null ? ` (${rd(precio)})` : ""}</b>
      <div className="pb-h" style={{ margin: "2px 0 6px" }}>
        Transferencia a nombre de {tienda.titular}
        {tienda.rnc ? ` (RNC ${tienda.rnc})` : ""}. Puedes pagar por partes.
      </div>
      <div className="pb-cuentas">
        {tienda.cuentas.map((c) => (
          <div key={c.numero} className="pb-cuenta">
            <div>
              <div className="pb-cuenta-t">
                {c.banco} · {c.tipo}
              </div>
              <div className="pb-cuenta-n">{c.numero}</div>
            </div>
            <button className="pb-copiar" onClick={() => copiar(c.numero)}>
              {copiado === c.numero ? "Copiado" : "Copiar"}
            </button>
          </div>
        ))}
      </div>
      {subir}
    </div>
  );
}
