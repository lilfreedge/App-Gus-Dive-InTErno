"use client";

import { useEffect, useRef, useState } from "react";
import { soloDigitos, formatoCedula, rd, fechaCorta } from "@/lib/viajes/modelo";
import { numeroWhatsApp } from "@/lib/whatsapp-tecnico";
import { CampoCel } from "@/components/viajes/Piezas";
import { IconCheck, IconLock, IconCamera } from "@/components/icons";

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
async function subirArchivo(id, que, archivo, estudianteId) {
  const fd = new FormData();
  fd.append("tipoDoc", id.tipoDoc);
  fd.append("doc", id.doc);
  fd.append("cel", id.cel);
  fd.append("que", que);
  if (estudianteId) fd.append("estudianteId", estudianteId);
  fd.append("archivo", archivo);
  const r = await fetch("/api/estudiantes/archivo", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "No se pudo subir.");
}

function Subir({ id, que, titulo, sub, accept = "image/*", capture, estudianteId, listo, alSubir }) {
  const [estado, setEstado] = useState(listo ? "ok" : null);
  async function elegir(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setEstado({ error: "El archivo pesa más de 10 MB." });
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

function Privacidad() {
  return (
    <div className="pb-priv">
      <IconLock size={15} />
      <span>Gus Dive Center no comparte esta información con nadie. Solo la usa para el registro de sus estudiantes.</span>
    </div>
  );
}

const PROGRESO = ["datos", "curso", "docs"];

export default function EstudiantePublico({ cursos, tienda }) {
  const [paso, setPaso] = useState("doc"); // doc | hola | cel | datos | curso | docs | listo | estado
  const [tipoDoc, setTipoDoc] = useState("cedula");
  const [doc, setDoc] = useState("");
  const [cel, setCel] = useState("");
  const [buzo, setBuzo] = useState(null); // lo que devuelve "doc"
  const [d, setD] = useState({ nombre: "", nac: "", correo: "", direccion: "", emergencia: "" });
  const [buceos, setBuceos] = useState("");
  const [cursoId, setCursoId] = useState(cursos[0]?.id || "");
  const [fechaInicio, setFechaInicio] = useState("");
  const [res, setRes] = useState(null); // lo que devuelve "registrar"
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const id = { tipoDoc, doc, cel: soloDigitos(cel) };
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
      ir(r.encontrado ? "hola" : "datos");
    });
  const verEstado = () =>
    correr(async () => {
      setEstado(await api({ accion: "estado", tipoDoc, doc, cel }));
      ir("estado");
    });
  const registrar = () =>
    correr(async () => {
      const r = await api({ accion: "registrar", tipoDoc, doc, cel, datos: d, buceos, cursoId, fechaInicio });
      setRes(r);
      ir("docs");
    });

  const falta = buzo?.falta || { nac: true, direccion: true, emergencia: true, correo: true, foto: true, cedula: true };
  const pasoN = PROGRESO.indexOf(paso);

  return (
    <div className="pb ce-pub">
      <div className="pb-head">
        <img src="/logo-gus-icon.png" alt="Gus Dive Center" style={{ height: 24 }} />
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

        {paso === "doc" && (
          <div className="pb-card">
            <div className="pb-t">¡Bienvenido a tu curso!</div>
            <div className="pb-h">Pon tu cédula o pasaporte para empezar.</div>
            <div className="pb-seg">
              <button className={tipoDoc === "cedula" ? "sel" : ""} onClick={() => setTipoDoc("cedula")}>
                Cédula
              </button>
              <button className={tipoDoc === "pasaporte" ? "sel" : ""} onClick={() => setTipoDoc("pasaporte")}>
                Pasaporte
              </button>
            </div>
            <input className="pb-input" inputMode={tipoDoc === "cedula" ? "numeric" : "text"} value={doc} onChange={(e) => setDoc(tipoDoc === "cedula" ? formatoCedula(e.target.value) : e.target.value.toUpperCase())} placeholder={tipoDoc === "cedula" ? "000-0000000-0" : "Número de pasaporte"} />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={cargando || !doc} onClick={buscar}>
              {cargando ? "Buscando…" : "Seguir"}
            </button>
            <Privacidad />
          </div>
        )}

        {paso === "hola" && buzo && (
          <div className="pb-card">
            <div className="pb-t">¡Hola, {buzo.primer}!</div>
            <div className="pb-h">Ya te tenemos registrado de antes. ¿Qué quieres hacer?</div>
            <button className="pb-op" onClick={() => ir("cel")}>
              Registrarme en un curso
              <div className="pb-op-sub">Solo te pedimos lo que nos falta.</div>
            </button>
            <button className="pb-op" onClick={() => ir("cel-estado")}>
              Ver cómo va mi curso
              <div className="pb-op-sub">Tu certificación, tu pago y tus documentos.</div>
            </button>
            <button className="pb-link" onClick={() => ir("doc")}>
              No soy yo
            </button>
          </div>
        )}

        {(paso === "cel" || paso === "cel-estado") && (
          <div className="pb-card">
            <div className="pb-t">Tu celular</div>
            <div className="pb-h">{buzo?.tieneCel ? `Para confirmar que eres tú, escribe tu celular (el que termina en ${String(buzo.cel).slice(-4)}).` : "Escribe tu celular. Por ahí te escribimos."}</div>
            <CampoCel className="pb-input" value={cel} onChange={setCel} />
            {error && <div className="pb-error">{error}</div>}
            <button className="pb-btn" disabled={cargando || soloDigitos(cel).length !== 10} onClick={() => (paso === "cel-estado" ? verEstado() : ir("datos"))}>
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
                <label className="ce-pub-l">Celular</label>
                <CampoCel className="pb-input" value={cel} onChange={setCel} />
              </>
            )}
            {falta.nac && (
              <>
                <label className="ce-pub-l">Fecha de nacimiento</label>
                <input className="pb-input" type="date" value={d.nac} onChange={(e) => setD({ ...d, nac: e.target.value })} />
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
                <label className="ce-pub-l">Contacto de emergencia</label>
                <input className="pb-input" value={d.emergencia} onChange={(e) => setD({ ...d, emergencia: e.target.value })} placeholder="Nombre, celular y qué es tuyo (ej. papá)" />
              </>
            )}
            <label className="ce-pub-l">¿Cuántos buceos tienes?</label>
            <input className="pb-input" inputMode="numeric" value={buceos} onChange={(e) => setBuceos(e.target.value.replace(/\D/g, ""))} placeholder="0" />
            {error && <div className="pb-error">{error}</div>}
            <button
              className="pb-btn"
              disabled={(!buzo && (!d.nombre.trim() || soloDigitos(cel).length !== 10)) || (falta.nac && !d.nac)}
              onClick={() => ir("curso")}
            >
              Seguir
            </button>
            <button className="pb-btn sec" onClick={() => ir(buzo ? "cel" : "doc")}>
              Atrás
            </button>
          </div>
        )}

        {paso === "curso" && (
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
            <button className="pb-btn" disabled={cargando || !cursoId} onClick={registrar}>
              {cargando ? "Registrando…" : "Seguir"}
            </button>
            <button className="pb-btn sec" onClick={() => ir("datos")}>
              Atrás
            </button>
          </div>
        )}

        {paso === "docs" && res && (
          <div className="pb-card">
            <div className="pb-t">Documentos</div>
            <div className="pb-h">Con esto no tienes que traer copias a la tienda. Si ahora no puedes, lo haces después entrando otra vez con tu cédula.</div>
            <Subir id={id} que="foto" titulo="Una foto tuya de frente" sub="Para tu certificación. Con buena luz y sin lentes de sol." capture="user" listo={buzo && !falta.foto} />
            <Subir id={id} que="cedula" titulo={tipoDoc === "pasaporte" ? "Foto de tu pasaporte" : "Foto de tu cédula"} sub="Que se lea bien." capture="environment" listo={buzo && !falta.cedula} />
            <label className="ce-pub-l" style={{ marginTop: 12 }}>
              Firma de tu record de entrenamiento
            </label>
            <div className="pb-h" style={{ margin: 0 }}>
              Firma con el dedo dentro del recuadro.
            </div>
            <Firma id={id} estudianteId={res.estudianteId} />
            <button className="pb-btn" onClick={() => ir("listo")}>
              Terminar
            </button>
          </div>
        )}

        {paso === "listo" && res && (
          <div className="pb-card" style={{ textAlign: "center" }}>
            <div className="pb-ok">
              <IconCheck size={34} />
            </div>
            <div className="pb-t">¡Listo, {res.primer}!</div>
            <div className="pb-h">
              {res.ya ? `Ya estabas registrado en ${res.curso}.` : `Ya estás registrado en ${res.curso}.`} Te avisaremos por WhatsApp cuando tu certificación esté lista.
            </div>
            <Pago tienda={tienda} precio={res.precio} id={id} estudianteId={res.estudianteId} />
            <a className="pb-btn ce-pub-wa" href={wa} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
          </div>
        )}

        {paso === "estado" && estado && (
          <div className="pb-card">
            <div className="pb-t">Hola, {estado.primer}</div>
            {!estado.estudios.length && <div className="pb-h">Todavía no tienes un curso registrado.</div>}
            {estado.estudios.map((e) => (
              <div key={e.id} className="ce-pub-curso">
                <b>{e.curso}</b>
                <div className="pb-h" style={{ margin: "2px 0 6px" }}>
                  {[e.escuela, e.fechaInicio ? `empezó el ${fechaCorta(e.fechaInicio)}` : ""].filter(Boolean).join(" · ")}
                </div>
                {[
                  { k: "curso", t: "En curso", sub: "Terminando las clases, el pago y el examen." },
                  { k: "almacen", t: "Estamos procesando tu certificación", sub: `La mandamos a ${e.escuela || "la escuela"}.` },
                  { k: "certificacion", t: "Tu certificación está lista", sub: "Pasa a buscarla a la tienda." },
                  { k: "avisado", t: "Te avisamos", sub: "Pasa a buscarla a la tienda." },
                  { k: "entregada", t: "Entregada", sub: "¡Felicidades!" },
                ]
                  .filter((x) => x.k !== "avisado")
                  .map((x, i, arr) => {
                    const orden = ["curso", "almacen", "certificacion", "avisado", "entregada"];
                    const actual = orden.indexOf(e.estado === "avisado" ? "certificacion" : e.estado);
                    const yo = orden.indexOf(x.k);
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
                {e.precio != null && (
                  <div className="ce-pub-pago">
                    <b>Tu pago</b>
                    <div>
                      Curso {rd(e.precio)} · pagado {rd(e.pagado)}
                      {e.debe > 0 ? ` · te falta ${rd(e.debe)}` : " · ¡completo!"}
                    </div>
                  </div>
                )}
                {e.debe !== 0 && <Pago tienda={tienda} id={id} estudianteId={e.id} soloSubir={e.precio == null} />}
              </div>
            ))}
            {(estado.falta?.foto || estado.falta?.cedula) && (
              <>
                <div className="pb-h" style={{ marginTop: 12 }}>
                  Nos falta:
                </div>
                {estado.falta.foto && <Subir id={id} que="foto" titulo="Una foto tuya de frente" capture="user" />}
                {estado.falta.cedula && <Subir id={id} que="cedula" titulo={tipoDoc === "pasaporte" ? "Foto de tu pasaporte" : "Foto de tu cédula"} capture="environment" />}
              </>
            )}
            <a className="pb-btn ce-pub-wa" href={wa} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
            <button className="pb-link" onClick={() => ir("doc")}>
              Volver al inicio
            </button>
          </div>
        )}
      </div>
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
  return (
    <div className="pb-comp">
      {!soloSubir && (
        <>
          <b>Para pagar{precio != null ? ` (${rd(precio)})` : ""}</b>
          <div className="pb-h" style={{ margin: "2px 0 6px" }}>
            Transferencia a nombre de {tienda.titular}. Puedes pagar por partes.
          </div>
          <div className="pb-cuentas">
            {tienda.cuentas
              .filter((c) => c.moneda === "DOP")
              .map((c) => (
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
        </>
      )}
      <Subir id={id} que="comprobante" titulo="Subir comprobante de pago" sub="Foto o PDF de la transferencia." accept="image/*,application/pdf" estudianteId={estudianteId} />
    </div>
  );
}
