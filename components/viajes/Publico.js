"use client";

import { useState } from "react";
import { PREGUNTAS, fechaLarga, rd, soloDigitos, formatoCedula, nombreCorto, primerNombre, precioTexto, precioDop, puntos, palabraViaje } from "@/lib/viajes/modelo";
import { numeroWhatsApp } from "@/lib/whatsapp-tecnico";
import { CampoCel } from "./Piezas";
import { IconCheck, IconClip, IconCalendar, IconClock, IconLock, IconChat } from "@/components/icons";

// V42 -- Lo que ve el buzo en el link de inscripción (maqueta-viajes-v2).
// Se identifica con su cédula o pasaporte; el celular queda para escribirle.
const VACIO = { nombre: "", cel: "", correo: "", agencia: "", cert: "" };

async function api(cuerpo) {
  const r = await fetch("/api/viajes/publico", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Algo salió mal. Intenta de nuevo.");
  return j;
}

// El buzo sube el comprobante (foto o PDF). Se verifica en el servidor con
// su cédula/pasaporte que está inscrito en el viaje.
function SubirComprobante({ slug, tipoDoc, doc }) {
  const [estado, setEstado] = useState(null); // null | "subiendo" | { nombre } | { error }
  async function subir(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setEstado({ error: "El archivo pesa más de 10 MB." });
    setEstado("subiendo");
    const fd = new FormData();
    fd.append("slug", slug);
    fd.append("tipoDoc", tipoDoc);
    fd.append("doc", doc);
    fd.append("archivo", file);
    try {
      const r = await fetch("/api/viajes/comprobante", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo subir.");
      setEstado({ nombre: j.nombre });
    } catch (e) {
      setEstado({ error: e.message });
    }
  }
  return (
    <div className="pb-comp">
      {estado?.nombre ? (
        <div>
          <IconCheck size={15} /> Recibimos tu comprobante (<b>{estado.nombre}</b>). Te confirmaremos por WhatsApp.
        </div>
      ) : (
        <>
          <div style={{ fontWeight: 800 }}>¿Ya pagaste? Sube el comprobante</div>
          <div className="pb-h" style={{ margin: "2px 0 8px" }}>
            Foto o PDF de la transferencia. También puedes subirlo después entrando a este mismo link con tu cédula.
          </div>
          <label className="pb-btn sec" style={{ display: "block", textAlign: "center" }}>
            {estado === "subiendo" ? (
              "Subiendo…"
            ) : (
              <>
                <IconClip size={16} /> Subir comprobante
              </>
            )}
            <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} disabled={estado === "subiendo"} onChange={(e) => subir(e.target.files?.[0])} />
          </label>
          {estado?.error && <div className="pb-error">{estado.error}</div>}
        </>
      )}
    </div>
  );
}

// V45 -- Pedido: "decir que esa información de identidad no es compartida con
// nadie. Es información utilizada para llevar el registro de los buzos".
function Privacidad() {
  return (
    <div className="pb-priv">
      <IconLock size={15} />
      <span>Gus Dive Center no comparte esta información con nadie. Solo la usamos para llevar el registro de nuestros buzos.</span>
    </div>
  );
}

export default function PublicoViaje({ v, tienda }) {
  const opcionesPagan = v.opciones.filter((x) => !x.noPaga);
  const [paso, setPaso] = useState("doc");
  const [pila, setPila] = useState([]); // pasos anteriores, para "← Atrás"
  const [tipoDoc, setTipoDoc] = useState("cedula");
  const [doc, setDoc] = useState("");
  const [buzo, setBuzo] = useState(null); // { corto, primer, cel, tieneTallas }
  const [vincularId, setVincularId] = useState(null);
  const [nuevo, setNuevo] = useState(VACIO);
  const [candidatos, setCandidatos] = useState([]);
  const [opcion, setOpcion] = useState(opcionesPagan[0]?.id || "");
  const [donde, setDonde] = useState(v.equipo?.donde ? "" : null);
  const [piezas, setPiezas] = useState([]);
  const [tallas, setTallas] = useState({ bcd: "", chapaletas: "" });
  const [extras, setExtras] = useState([]);
  const [resp, setResp] = useState({});
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [inscritoPor, setInscritoPor] = useState(null); // { tipo, doc, corto }
  const [quedan, setQuedan] = useState(v.quedan);
  const [copiado, setCopiado] = useState("");
  // Viajes en pesos: solo la cuenta en pesos. En dólares: las dos.
  const cuentas = (tienda?.cuentas || []).filter((c) => v.moneda === "USD" || c.moneda === "DOP");
  const copiar = (t) => {
    try {
      navigator.clipboard?.writeText(t).catch(() => {});
    } catch {}
    setCopiado(t);
    setTimeout(() => setCopiado(""), 1800);
  };

  const o = v.opciones.find((x) => x.id === opcion) || opcionesPagan[0];
  const eq = v.equipo || { modo: "no" };
  const preguntaEquipo = eq.modo === "si" && (!eq.soloConOpcion || o?.conEquipo) && (!eq.donde || ["gus", "alla"].includes(donde));
  const pideTallas = preguntaEquipo && piezas.some((p) => /BCD|chaleco|Wetsuit|Traje|Chapaletas|Aletas/i.test(p)) && !buzo?.tieneTallas;
  const total = (o && !o.noPaga ? precioDop(v, o) : 0) + extras.reduce((a, id) => a + (v.extras.find((e) => e.id === id)?.dop || 0), 0);
  const nombreActual = buzo ? buzo.corto : nombreCorto(nuevo.nombre || "");
  // V45: "buceo" en vez de "viaje"; "viaje" solo para los que tienen hotel (Monte Cristi).
  const palabra = palabraViaje(v);

  async function correr(fn) {
    setError("");
    setCargando(true);
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  }

  // Ir a otro paso guardando de dónde viene; "← Atrás" vuelve al anterior.
  const ir = (n) => {
    setPila((h) => [...h, paso]);
    setPaso(n);
    setError("");
  };
  const atras = () => {
    const prev = pila[pila.length - 1] || "doc";
    setPila((h) => h.slice(0, -1));
    setPaso(prev);
    setError("");
  };
  // Enter en un campo = el botón principal del paso (pedido explícito: "no me
  // está funcionando la tecla enter para continuar").
  const conEnter = (fn) => (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox" && !cargando) {
      e.preventDefault();
      fn();
    }
  };
  const BotonAtras = () => (
    <button type="button" className="pb-link" onClick={atras}>
      ← Atrás
    </button>
  );

  const buscarDoc = () =>
    correr(async () => {
      const j = await api({ accion: "doc", slug: v.slug, tipoDoc, doc });
      if (j.encontrado) {
        setBuzo(j);
        ir("eres");
      } else {
        setBuzo(null);
        setNuevo(VACIO);
        ir("cel");
      }
    });
  const buscarCel = () =>
    correr(async () => {
      const j = await api({ accion: "cel", slug: v.slug, cel: nuevo.cel });
      if (j.candidatos?.length) {
        setCandidatos(j.candidatos);
        ir("vincular");
      } else ir("datos");
    });

  const seguirDatos = () =>
    !nuevo.nombre.trim() || !nuevo.agencia
      ? setError("Faltan tu nombre y tu certificación.")
      : soloDigitos(nuevo.cel).length !== 10
      ? setError("Escribe tu celular completo.")
      : ir("viaje");

  function validarViaje() {
    if (eq.donde && !donde) return "Indícanos qué harás con el equipo.";
    if (pideTallas && (!tallas.bcd || !tallas.chapaletas)) return "Indica tus tallas para reservarte el equipo.";
    const falta = (v.preguntas || []).find((k) => k !== "conQuien" && !resp[k]);
    // Pedido: quitar "Falta contestar"; el aviso es la pregunta que falta.
    if (falta) return PREGUNTAS.find((x) => x.k === falta)?.t || "Falta contestar una pregunta.";
    if (v.requisito && !acepto) return `Debes aceptar el requisito del ${palabra}.`;
    return "";
  }

  const inscribir = () =>
    correr(async () => {
      const m = validarViaje();
      if (m) throw new Error(m);
      const j = await api({
        accion: "inscribir",
        slug: v.slug,
        tipoDoc,
        doc,
        vincularId,
        cel: nuevo.cel,
        nuevo: buzo || vincularId ? null : nuevo,
        opcion,
        donde,
        piezas: preguntaEquipo ? piezas : [],
        tallas: pideTallas ? tallas : null,
        extras,
        respuestas: resp,
        acepto,
        inscritoPorDoc: inscritoPor?.doc || null,
        inscritoPorTipo: inscritoPor?.tipo || null,
      });
      setResultado({ ...j, docDe: { tipo: tipoDoc, doc, corto: nombreActual } });
      if (!j.ya && !j.enEspera) setQuedan((q) => Math.max(0, q - 1));
      setPila([]);
      setPaso("fin");
    });

  function otraPersona() {
    setInscritoPor(resultado?.docDe || inscritoPor);
    setPila([]);
    setPaso("doc");
    setDoc("");
    setBuzo(null);
    setVincularId(null);
    setNuevo(VACIO);
    setPiezas([]);
    setTallas({ bcd: "", chapaletas: "" });
    setExtras([]);
    setResp({});
    setDonde(eq.donde ? "" : null);
    setAcepto(false);
    setResultado(null);
    setError("");
  }

  const mensajeWA = resultado
    ? `Hola, soy ${resultado.nombreCompleto || resultado.nombre}. Me inscribí en ${v.nombre} del ${fechaLarga(v.fecha)}. Código ${resultado.codigo}.`
    : "";
  const linkWA = tienda?.whatsapp ? `https://wa.me/${numeroWhatsApp(tienda.whatsapp)}?text=${encodeURIComponent(mensajeWA)}` : "";
  // V45: el que ya está en la lista puede escribirle a la tienda (preguntas, equipo).
  const linkWAYa =
    tienda?.whatsapp && buzo?.yaInscrito
      ? `https://wa.me/${numeroWhatsApp(tienda.whatsapp)}?text=${encodeURIComponent(`Hola, soy ${buzo.corto} y estoy en la lista de ${v.nombre} del ${fechaLarga(v.fecha)}.`)}`
      : "";
  const fechaHero = fechaLarga(v.fecha);

  return (
    <div className="pb">
      <div className="pb-head">
        <img src="/logo-gus-icon.png" alt="Gus Dive Center" style={{ height: 24 }} />
        <span>Gus Dive Center</span>
      </div>
      <div className="pb-hero">
        <div className="pb-kicker">INSCRIPCIÓN</div>
        <div className="pb-titulo">{v.nombre}</div>
        {/* V45: fecha y salida en puntos (pedido: "pon la fecha y hora de salida tipo bullet"). */}
        <ul className="pb-datos">
          <li>
            <IconCalendar size={16} /> {fechaHero.charAt(0).toUpperCase() + fechaHero.slice(1)}
          </li>
          {v.salida && (
            <li>
              <IconClock size={16} /> {v.salida}
            </li>
          )}
        </ul>
        {v.abierto && <div className="pb-cupo">{quedan > 0 ? `Quedan ${quedan} cupo${quedan === 1 ? "" : "s"}` : "Cupo lleno. Puedes anotarte en la lista de espera"}</div>}
      </div>
      <div className="pb-body">
        {!v.abierto ? (
          <div className="pb-card" style={{ textAlign: "center" }}>
            <div className="pb-t">La inscripción para este {palabra} está cerrada</div>
            <div className="pb-h">Escríbenos por WhatsApp y te avisaremos si se abre un cupo.</div>
          </div>
        ) : (
          <>
            {paso !== "fin" && (
              <>
                {opcionesPagan.map((x) => (
                  <div key={x.id} className="pb-op-info">
                    <b>{x.nombre}</b> · {precioTexto(v, x)}
                    {v.habitaciones ? " por persona" : ""}
                    {/* "Precio por persona" ya lo dice la línea de arriba. */}
                    {x.incluye && !(v.habitaciones && /^precio por persona\.?$/i.test(x.incluye.trim())) && <div>{x.incluye}</div>}
                  </div>
                ))}
                {v.incluye && (
                  <div className="pb-op-info">
                    <b>Incluye</b>
                    <ul className="pb-lista">
                      {puntos(v.incluye).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                    {v.noIncluye && (
                      <>
                        <b style={{ display: "block", marginTop: 8 }}>No incluye</b>
                        <ul className="pb-lista">
                          {puntos(v.noIncluye).map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
                {eq.nota && <div className="pb-nota">{eq.nota}</div>}
                {v.reserva && <div className="pb-nota">{v.reserva.nota}</div>}
              </>
            )}

            {inscritoPor && paso !== "fin" && (
              <div className="pb-por">
                Estás inscribiendo a otra persona (desde {inscritoPor.corto}). Ingresa <b>su</b> cédula o pasaporte.
              </div>
            )}

            {paso === "doc" && (
              <div className="pb-card" onKeyDown={conEnter(buscarDoc)}>
                <div className="pb-t">{inscritoPor ? "Cédula o pasaporte de la otra persona" : "Tu cédula o pasaporte"}</div>
                <div style={{ height: 10 }} />
                <div className="pb-seg">
                  {[
                    ["cedula", "Cédula"],
                    ["pasaporte", "Pasaporte"],
                  ].map(([k, t]) => (
                    <button
                      key={k}
                      className={tipoDoc === k ? "sel" : ""}
                      onClick={() => {
                        setTipoDoc(k);
                        setDoc("");
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  className="pb-input"
                  inputMode={tipoDoc === "cedula" ? "numeric" : "text"}
                  value={doc}
                  onChange={(e) => setDoc(tipoDoc === "cedula" ? formatoCedula(e.target.value) : e.target.value.toUpperCase())}
                  placeholder={tipoDoc === "cedula" ? "000-0000000-0" : "Número de pasaporte"}
                />
                {error && <div className="pb-error">{error}</div>}
                <button className="pb-btn" disabled={cargando} onClick={buscarDoc}>
                  {cargando ? "Buscando…" : "Continuar"}
                </button>
                <Privacidad />
              </div>
            )}

            {paso === "eres" && buzo && (
              <div className="pb-card" style={buzo.yaInscrito ? { textAlign: "center" } : undefined}>
                {buzo.yaInscrito ? (
                  <>
                    {/* V45: igual que la pantalla de "¡Listo!", con botón de WhatsApp. */}
                    <div className="pb-ok">
                      <IconCheck size={34} strokeWidth={2.6} />
                    </div>
                    <div className="pb-t">
                      {buzo.corto}, ya estás en la lista de este {palabra}
                    </div>
                    <div className="pb-h" style={{ marginTop: 8 }}>
                      Si tienes alguna pregunta, no dudes en escribirnos. ¿Te hace falta equipo? Avísanos y te lo apartamos.
                    </div>
                    {linkWAYa && (
                      <a className="pb-btn verde" href={linkWAYa} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none" }}>
                        <IconChat size={18} /> Escribir por WhatsApp
                      </a>
                    )}
                    <SubirComprobante slug={v.slug} tipoDoc={tipoDoc} doc={doc} />
                    <button className="pb-btn sec" onClick={otraPersona}>
                      Inscribir a otra persona
                    </button>
                    <BotonAtras />
                  </>
                ) : (
                  <>
                    <div className="pb-t">¿Eres {buzo.corto}?</div>
                    {buzo.cel && <div className="pb-h">Te escribiremos al {buzo.cel}.</div>}
                    <button className="pb-btn" onClick={() => ir("viaje")}>
                      Sí, {inscritoPor ? "es esa persona" : "soy yo"}
                    </button>
                    <button
                      className="pb-btn sec"
                      onClick={() => {
                        setBuzo(null);
                        setDoc("");
                        setPila([]);
                        setPaso("doc");
                        setError("Revisa el número. Esa cédula pertenece a otra persona.");
                      }}
                    >
                      No {inscritoPor ? "es esa persona" : "soy yo"}
                    </button>
                    <BotonAtras />
                  </>
                )}
              </div>
            )}

            {paso === "cel" && (
              <div className="pb-card" onKeyDown={conEnter(buscarCel)}>
                {/* Solo sale si la cédula no está guardada. Muchos buzos que ya
                    tenemos (de los sheets o agregados a mano) no tienen cédula,
                    solo nombre y celular: con el celular se encuentran y se les
                    guarda la cédula. */}
                <div className="pb-t">¿Primera vez buceando con Gus?</div>
                <div className="pb-h">Ingresa tu número de celular.</div>
                <CampoCel className="pb-input" value={nuevo.cel} onChange={(cel) => setNuevo({ ...nuevo, cel })} />
                {error && <div className="pb-error">{error}</div>}
                <button className="pb-btn" disabled={cargando} onClick={buscarCel}>
                  Continuar
                </button>
                <BotonAtras />
              </div>
            )}

            {paso === "vincular" && (
              <div className="pb-card">
                <div className="pb-t">¿Eres alguna de estas personas?</div>
                <div className="pb-h">Encontramos a estas personas con ese número.</div>
                {candidatos.map((c) => (
                  <button
                    key={c.id}
                    className="pb-op"
                    onClick={() => {
                      setVincularId(c.id);
                      setBuzo({ corto: c.corto, primer: c.corto.split(" ")[0], tieneTallas: false });
                      ir("viaje");
                    }}
                  >
                    Sí, soy {c.corto}
                  </button>
                ))}
                <button className="pb-op" onClick={() => ir("datos")}>
                  No, soy otra persona
                </button>
                <div className="pb-h" style={{ marginTop: 8 }}>
                  Si eliges tu nombre, guardaremos tu cédula para la próxima vez.
                </div>
                <BotonAtras />
              </div>
            )}

            {paso === "datos" && (
              <div className="pb-card" onKeyDown={conEnter(seguirDatos)}>
                <div className="pb-t">Tus datos</div>
                <div style={{ height: 10 }} />
                <input className="pb-input" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nombre y apellido" />
                <CampoCel className="pb-input" value={nuevo.cel} onChange={(cel) => setNuevo({ ...nuevo, cel })} />
                <input className="pb-input" type="email" value={nuevo.correo} onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} placeholder="Correo electrónico" />
                <select className="pb-input" value={nuevo.agencia} onChange={(e) => setNuevo({ ...nuevo, agencia: e.target.value })}>
                  <option value="">Agencia de certificación…</option>
                  {["PADI", "SSI", "SNSI", "Raid", "NAUI", "Otra", "No soy buzo (snorkel / acompañante)"].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <input className="pb-input" value={nuevo.cert} onChange={(e) => setNuevo({ ...nuevo, cert: e.target.value })} placeholder="Número de certificación" />
                {error && <div className="pb-error">{error}</div>}
                <button className="pb-btn" onClick={seguirDatos}>
                  Continuar
                </button>
                <Privacidad />
                <BotonAtras />
              </div>
            )}

            {paso === "viaje" && (
              <div className="pb-card" onKeyDown={conEnter(inscribir)}>
                <div className="pb-t">Hola, {buzo ? buzo.primer : primerNombre(nuevo.nombre)}</div>
                {opcionesPagan.length > 1 && (
                  <>
                    <div className="pb-h">{v.habitaciones ? "¿Qué habitación quieres? (precios por persona)" : "¿Cómo vas a participar?"}</div>
                    {opcionesPagan.map((x) => (
                      <button
                        key={x.id}
                        className={`pb-op${opcion === x.id ? " sel" : ""}`}
                        onClick={() => {
                          setOpcion(x.id);
                          if (eq.soloConOpcion && !x.conEquipo) setPiezas([]);
                        }}
                      >
                        {x.nombre}{" "}
                        <span className="pb-precio">
                          {precioTexto(v, x)}
                          {v.habitaciones ? " c/u" : ""}
                        </span>
                      </button>
                    ))}
                  </>
                )}

                {eq.donde && (
                  <>
                    <div className="pb-h" style={{ marginTop: 10 }}>
                      ¿Y el equipo?
                    </div>
                    <button className={`pb-op${donde === "propio" ? " sel" : ""}`} onClick={() => (setDonde("propio"), setPiezas([]))}>
                      Tengo mi equipo completo
                    </button>
                    {eq.donde.map((d) => (
                      <button key={d.id} className={`pb-op${donde === d.id ? " sel" : ""}`} onClick={() => setDonde(d.id)}>
                        {d.t}
                        <div className="pb-op-sub">{d.precio}</div>
                      </button>
                    ))}
                  </>
                )}

                {preguntaEquipo && (
                  <>
                    <div className="pb-h" style={{ marginTop: 10 }}>
                      ¿Qué equipo te falta?{eq.proveedor && !eq.donde ? ` (lo pone ${eq.proveedor})` : ""}
                    </div>
                    <div className="pb-chips">
                      {(eq.piezas || []).map((e) => (
                        <button key={e} className={`pb-chip${piezas.includes(e) ? " sel" : ""}`} onClick={() => setPiezas((x) => (x.includes(e) ? x.filter((y) => y !== e) : [...x, e]))}>
                          {e}
                        </button>
                      ))}
                      {!eq.donde && !eq.soloConOpcion && (
                        <button className={`pb-chip${piezas.length === 0 ? " sel" : ""}`} onClick={() => setPiezas([])}>
                          No necesito nada
                        </button>
                      )}
                    </div>
                    {pideTallas && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <input className="pb-input" value={tallas.bcd} onChange={(e) => setTallas({ ...tallas, bcd: e.target.value.toUpperCase() })} placeholder="Talla BCD (S, M, L…)" />
                        <input className="pb-input" value={tallas.chapaletas} onChange={(e) => setTallas({ ...tallas, chapaletas: e.target.value })} placeholder="Talla chapaletas" />
                      </div>
                    )}
                  </>
                )}

                {(v.extras || []).map((e) => (
                  <label key={e.id} className="pb-acepto">
                    <input type="checkbox" checked={extras.includes(e.id)} onChange={(ev) => setExtras((x) => (ev.target.checked ? [...x, e.id] : x.filter((y) => y !== e.id)))} />
                    Quiero agregar el {e.nombre.toLowerCase()} (+{rd(e.dop)} aparte)
                  </label>
                ))}

                {(v.preguntas || []).map((k) => {
                  const q = PREGUNTAS.find((x) => x.k === k);
                  if (!q) return null;
                  return (
                    <div key={k} style={{ marginTop: 10 }}>
                      <div className="pb-h" style={{ margin: "0 0 4px" }}>
                        {q.t}
                      </div>
                      {q.tipo === "op" ? (
                        <div className="pb-chips">
                          {q.ops.map((op) => (
                            <button key={op} className={`pb-chip${resp[k] === op ? " sel" : ""}`} onClick={() => setResp({ ...resp, [k]: op })}>
                              {op}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input className="pb-input" inputMode={q.tipo === "num" ? "numeric" : "text"} value={resp[k] || ""} onChange={(e) => setResp({ ...resp, [k]: e.target.value })} />
                      )}
                    </div>
                  );
                })}

                {v.requisito && (
                  <label className="pb-acepto">
                    <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
                    {v.requisito}
                  </label>
                )}
                <div className="pb-resumen">
                  Vas a inscribir a <b>{nombreActual}</b>
                  {total ? ` · total ${rd(total)}` : ""}
                </div>
                {error && <div className="pb-error">{error}</div>}
                <button className="pb-btn" disabled={cargando} onClick={inscribir}>
                  {cargando
                    ? "Inscribiendo…"
                    : quedan > 0
                    ? v.reserva
                      ? `Inscribirme · separar con ${rd(v.reserva.monto)}`
                      : `Inscribirme${total ? ` · ${rd(total)}` : ""}`
                    : "Anotarme en la lista de espera"}
                </button>
                <BotonAtras />
              </div>
            )}

            {paso === "fin" && resultado && (
              <div className="pb-card" style={{ textAlign: "center" }}>
                <div className="pb-ok">
                  <IconCheck size={34} strokeWidth={2.6} />
                </div>
                {resultado.ya ? (
                  <div className="pb-t">
                    {resultado.nombre}, ya estabas en la lista de este {palabra}
                  </div>
                ) : (
                  <>
                    <div className="pb-t">
                      ¡Listo, {resultado.nombre}! {resultado.enEspera ? "Estás en la lista de espera." : `Ya estás en la lista del ${palabra}.`}
                    </div>
                    {!resultado.enEspera && (
                      <div className="pb-h" style={{ textAlign: "left", marginTop: 10 }}>
                        <b>Para separar tu cupo, transfiere {v.reserva ? `la reserva (${rd(v.reserva.monto)})` : `el pago (${rd(total)})`}</b>
                        {cuentas.length ? (
                          cuentas.length === 1 ? " a esta cuenta." : " a una de estas cuentas."
                        ) : (
                          ". Te escribimos por WhatsApp con los datos para el pago."
                        )}
                      </div>
                    )}
                    {!resultado.enEspera && cuentas.length > 0 && (
                      <div className="pb-cuentas">
                        {cuentas.map((c) => (
                          <div key={c.numero} className="pb-cuenta">
                            <div style={{ minWidth: 0 }}>
                              <div className="pb-cuenta-t">
                                {c.banco} · {c.tipo} en {c.moneda === "USD" ? "dólares (US$)" : "pesos (RD$)"}
                              </div>
                              <div className="pb-cuenta-n">{c.numero}</div>
                            </div>
                            <button type="button" className="pb-copiar" onClick={() => copiar(c.numero)}>
                              {copiado === c.numero ? (
                                <>
                                  <IconCheck size={14} /> Copiado
                                </>
                              ) : (
                                "Copiar"
                              )}
                            </button>
                          </div>
                        ))}
                        {(tienda.titular || tienda.cedula) && (
                          <div className="pb-h" style={{ margin: "6px 0 0" }}>
                            {tienda.titular ? `A nombre de ${tienda.titular}` : ""}
                            {tienda.titular && tienda.cedula ? " · " : ""}
                            {tienda.cedula ? <span style={{ whiteSpace: "nowrap" }}>Cédula {tienda.cedula}</span> : ""}
                          </div>
                        )}
                      </div>
                    )}
                    {linkWA && (
                      <>
                        <div className="pb-wa">
                          Al tocar el botón se abrirá WhatsApp con este mensaje para la tienda.
                          <br />
                          <i>“{mensajeWA}”</i>
                        </div>
                        <a className="pb-btn verde" href={linkWA} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none" }}>
                          Confirmar por WhatsApp
                        </a>
                      </>
                    )}
                    {!resultado.enEspera && <SubirComprobante slug={v.slug} tipoDoc={resultado.docDe.tipo} doc={resultado.docDe.doc} />}
                  </>
                )}
                <button className="pb-btn sec" onClick={otraPersona}>
                  Inscribir a otra persona
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
