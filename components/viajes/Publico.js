"use client";

import { useState } from "react";
import { PREGUNTAS, fechaLarga, rd, soloDigitos, celValido, formatoCedula, nombreCorto, primerNombre, precioTexto, precioDop, puntos, palabraViaje, tallasPara, partesSalida, linkGoogleCalendar, TALLAS } from "@/lib/viajes/modelo";
import { subirArchivo } from "@/lib/estudiantes/subir";
import { numeroWhatsApp } from "@/lib/whatsapp-tecnico";
import { CampoCel } from "./Piezas";
import { IconCheck, IconClip, IconCalendar, IconLock, IconChat, IconAlert, IconCamera } from "@/components/icons";
import { urlPrincipal } from "@/lib/direccion";

// V42 -- Lo que ve el buzo en el link de inscripción (maqueta-viajes-v2).
// Se identifica con su cédula o pasaporte; el celular queda para escribirle.
const VACIO = { nombre: "", cel: "", correo: "", agencia: "", cert: "" };
const TALLAS_VACIAS = { bcd: "", wetsuit: "", chapaletas: "" };

async function api(cuerpo) {
  const r = await fetch("/api/viajes/publico", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Algo salió mal. Intenta de nuevo.");
  return j;
}

// El buzo sube el comprobante (foto o PDF). Se verifica en el servidor con
// su cédula/pasaporte que está inscrito en el viaje.
// V57: "2 buceos, embarcación, guía y Parque Nacional" -> una lista.
function partesIncluye(texto) {
  const t = String(texto || "").trim();
  if (!t) return [];
  if (/\n/.test(t)) return puntos(t);
  return t
    .replace(/\.$/, "")
    .split(/\s*,\s*|\s+y\s+(?=[^,]*$)/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1));
}

// V61 ("198. sí", maqueta V60): todo lo de la transferencia en un solo
// cuadro, como filas: Banco, Cuenta, Número (Copiar), A nombre de y Cédula
// (Copiar). Antes "A nombre de… · Cédula…" quedaba suelto debajo.
function CuadroCuentas({ cuentas, tienda, copiar, copiado }) {
  const BotonCopiar = ({ valor }) => (
    <button type="button" className="pb-copiar" onClick={() => copiar(valor)}>
      {copiado === valor ? (
        <>
          <IconCheck size={14} /> Copiado
        </>
      ) : (
        "Copiar"
      )}
    </button>
  );
  return (
    <div className="pb-transf">
      {cuentas.map((c) => (
        <div key={c.numero} className="pb-transf-cuenta">
          <div className="pb-transf-fila">
            <span>Banco</span>
            <b>{c.banco}</b>
          </div>
          <div className="pb-transf-fila">
            <span>Cuenta</span>
            <b>
              {String(c.tipo || "").replace(/^Cuenta de /i, "").replace(/^\w/, (x) => x.toUpperCase())} en {c.moneda === "USD" ? "dólares (US$)" : "pesos (RD$)"}
            </b>
          </div>
          <div className="pb-transf-fila">
            <span>Número</span>
            <span className="pb-transf-v">
              <b className="pb-transf-n">{c.numero}</b>
              <BotonCopiar valor={c.numero} />
            </span>
          </div>
        </div>
      ))}
      {tienda?.titular && (
        <div className="pb-transf-fila">
          <span>A nombre de</span>
          <b>{tienda.titular}</b>
        </div>
      )}
      {tienda?.cedula && (
        <div className="pb-transf-fila">
          <span>Cédula</span>
          <span className="pb-transf-v">
            <b>{tienda.cedula}</b>
            <BotonCopiar valor={tienda.cedula} />
          </span>
        </div>
      )}
    </div>
  );
}

// V64 ("275", "276", "279", "281"): "Mi perfil" del buzo. Ve y cambia sus
// datos (correo, emergencia, tallas), cambia su celular una vez al mes, sube
// su certificación (se ve como una tarjeta; "Revisada por Gus" cuando la
// tienda la revisa) y ve sus buceos con su pago.
const AGENCIAS = ["SNSI", "PADI", "SSI", "Raid", "NAUI", "Otra"];
const dma = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
function MiPerfil({ perfil, setPerfil, slug, tipoDoc, doc, cel, setCel, tienda, cuentas, copiar, copiado, atras }) {
  const [d, setD] = useState({ correo: perfil.correo, emergencia: perfil.emergencia, tallas: { ...perfil.tallas }, agencia: perfil.agencia, nivel: perfil.nivel, cert: perfil.cert });
  const [msj, setMsj] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cambiaCel, setCambiaCel] = useState(false);
  const [nuevo, setNuevo] = useState({ a: "", b: "" });
  const [msjCel, setMsjCel] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [msjCert, setMsjCert] = useState("");
  const cambio = JSON.stringify(d) !== JSON.stringify({ correo: perfil.correo, emergencia: perfil.emergencia, tallas: { ...perfil.tallas }, agencia: perfil.agencia, nivel: perfil.nivel, cert: perfil.cert });
  async function guardar() {
    setGuardando(true);
    setMsj("");
    try {
      await api({ accion: "perfil-datos", slug, tipoDoc, doc, cel, datos: d });
      setPerfil({ ...perfil, ...d });
      setMsj("Guardado.");
    } catch (e) {
      setMsj(e.message);
    }
    setGuardando(false);
  }
  async function guardarCel() {
    setMsjCel("");
    try {
      const r = await api({ accion: "perfil-cel", slug, tipoDoc, doc, cel, nuevo: nuevo.a, otraVez: nuevo.b });
      setCel(soloDigitos(nuevo.a));
      const desde = new Date(Date.now() + 30 * 86400000 - 4 * 3600000).toISOString().slice(0, 10);
      setPerfil({ ...perfil, cel: r.cel, celCambio: { puede: false, desde } });
      setCambiaCel(false);
      setNuevo({ a: "", b: "" });
      setMsjCel("Listo, ya tenemos tu celular nuevo.");
    } catch (e) {
      setMsjCel(e.message);
    }
  }
  async function subirCert(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setSubiendo(true);
    setMsjCert("");
    try {
      await subirArchivo({ tipoDoc, doc, cel }, "certificacion", f, null);
      setPerfil({ ...perfil, certFoto: true, certRevisada: false });
    } catch (err) {
      setMsjCert(err.message);
    }
    setSubiendo(false);
  }
  const wa = tienda?.whatsapp ? `https://wa.me/${numeroWhatsApp(tienda.whatsapp)}` : null;
  return (
    <div className="pb-card">
      <div className="pb-t">Mi perfil</div>
      <div className="pb-h">Hola, {perfil.primer}.</div>

      <div className="pb-perfil-t">Mis datos</div>
      <div className="pb-perfil-fijo">
        <b>{perfil.nombre}</b>
        <span>
          Celular que termina en {String(perfil.cel || "").slice(-4)}
          {perfil.celCambio?.puede ? (
            !cambiaCel && (
              <>
                {" · "}
                <a className="pb-perfil-link" onClick={() => (setCambiaCel(true), setMsjCel(""))}>
                  Cambiar mi celular
                </a>
              </>
            )
          ) : (
            <> · lo puedes cambiar desde el {dma(perfil.celCambio?.desde)}</>
          )}
        </span>
      </div>
      {cambiaCel && (
        <div className="pb-perfil-caja">
          <b>Cambiar mi celular</b>
          <div className="pb-h" style={{ margin: "2px 0 6px" }}>
            Se puede cambiar una vez al mes. Por ese número te escribimos por WhatsApp y con él entras a tu perfil.
          </div>
          <label className="ce-pub-l">Celular nuevo (WhatsApp)</label>
          <CampoCel className="pb-input" value={nuevo.a} onChange={(x) => setNuevo({ ...nuevo, a: x })} />
          <label className="ce-pub-l">Escríbelo otra vez</label>
          <CampoCel className="pb-input" value={nuevo.b} onChange={(x) => setNuevo({ ...nuevo, b: x })} />
          <button className="pb-btn" disabled={!celValido(nuevo.a) || !celValido(nuevo.b)} onClick={guardarCel}>
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
      <label className="ce-pub-l">Contacto de emergencia</label>
      <input className="pb-input" value={d.emergencia} onChange={(e) => setD({ ...d, emergencia: e.target.value })} placeholder="Nombre · celular" />
      <label className="ce-pub-l">Mis tallas (para apartarte el equipo)</label>
      {TALLAS.map((t) => (
        <select key={t.k} className="pb-input" style={{ marginBottom: 6 }} value={d.tallas?.[t.k] || ""} onChange={(e) => setD({ ...d, tallas: { ...d.tallas, [t.k]: e.target.value } })}>
          <option value="">{t.t}: sin poner</option>
          {t.ops.map((o) => (
            <option key={o.v} value={o.v}>
              {t.t.replace("Talla del ", "").replace("Talla de ", "")}: {o.t}
            </option>
          ))}
        </select>
      ))}

      <div className="pb-perfil-t">Mi certificación</div>
      <div className="pb-perfil-dos">
        <select className="pb-input" value={d.agencia} onChange={(e) => setD({ ...d, agencia: e.target.value })}>
          <option value="">Agencia…</option>
          {AGENCIAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <input className="pb-input" value={d.nivel} onChange={(e) => setD({ ...d, nivel: e.target.value })} placeholder="Nivel (ej. Advanced)" />
      </div>
      <input className="pb-input" style={{ marginTop: 6 }} value={d.cert} onChange={(e) => setD({ ...d, cert: e.target.value })} placeholder="Número de certificación (si lo tienes)" />
      {perfil.certFoto ? (
        <div className="pb-cert">
          <span className="pb-cert-sello">{perfil.certRevisada ? "Revisada por Gus" : "Sin revisar todavía"}</span>
          <div className="pb-cert-ag">{d.agencia || "Certificación"}</div>
          <div className="pb-cert-nv">{d.nivel || "Tu nivel"}</div>
          <div className="pb-cert-nm">
            {perfil.nombre}
            {d.cert ? ` · No. ${d.cert}` : ""}
          </div>
          <label className="pb-cert-cambiar">
            {subiendo ? "Subiendo…" : "Cambiar"}
            <input type="file" accept="image/*,application/pdf,.heic,.heif" hidden onChange={subirCert} />
          </label>
        </div>
      ) : (
        <label className="pb-cert-subir">
          <IconCamera size={18} />
          <span>
            <b>{subiendo ? "Subiendo…" : "Subir mi certificación"}</b>
            <small>Una captura de pantalla de la app de tu agencia o una foto de tu tarjeta (JPG, PNG o PDF).</small>
          </span>
          <input type="file" accept="image/*,application/pdf,.heic,.heif" hidden onChange={subirCert} />
        </label>
      )}
      {msjCert && <div className="pb-error">{msjCert}</div>}
      {cambio && (
        <button className="pb-btn" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar mis datos"}
        </button>
      )}
      {msj && <div className={msj === "Guardado." ? "pb-h" : "pb-error"}>{msj}</div>}
      <div className="pb-h" style={{ fontSize: 12.5 }}>
        Para cambiar tu nombre o tu documento, escríbenos por WhatsApp.
      </div>

      <div className="pb-perfil-t">Mis buceos</div>
      {!perfil.proximos.length && <div className="pb-h">No tienes buceos próximos.</div>}
      {perfil.proximos.map((b) => (
        <div key={b.id} className="pb-perfil-bz">
          <b>{b.nombre}</b>
          <span className="pb-h" style={{ margin: 0 }}>
            {fechaLarga(b.fecha)}
            {b.salida ? ` · ${b.salida}` : ""}
          </span>
          <div style={{ marginTop: 6 }}>
            {b.espera ? (
              <span className="pb-perfil-chip">Lista de espera</span>
            ) : b.pago.k === "pagado" || b.pago.k === "abono" || b.pago.k === "otro" ? (
              <span className="pb-perfil-chip v">Pagado</span>
            ) : b.pago.falta > 0 ? (
              <span className="pb-perfil-chip r">Te falta pagar {rd(b.pago.falta)}</span>
            ) : (
              <span className="pb-perfil-chip">{b.pago.t}</span>
            )}
          </div>
          {!b.espera && b.pago.falta > 0 && <SubirComprobante slug={b.slug} tipoDoc={tipoDoc} doc={doc} cuentas={cuentas} tienda={tienda} copiar={copiar} copiado={copiado} monto={rd(b.pago.falta)} />}
          {b.linkGrupo && <BotonGrupo link={b.linkGrupo} chico />}
        </div>
      ))}
      {perfil.anteriores.length > 0 && (
        <>
          <div className="pb-h" style={{ fontWeight: 700, margin: "10px 0 4px" }}>
            Anteriores
          </div>
          {perfil.anteriores.map((b) => (
            <div key={b.id} className="pb-perfil-bz">
              <b>{b.nombre}</b>
              <span className="pb-h" style={{ margin: 0 }}>
                {fechaLarga(b.fecha)}
                {b.asistio === true ? " · fuiste" : b.asistio === false ? " · no fuiste" : ""}
              </span>
            </div>
          ))}
        </>
      )}
      {perfil.esEstudiante && (
        <a className="pb-btn sec" href="/estudiante" style={{ display: "block", textDecoration: "none", textAlign: "center" }}>
          Mis cursos con Gus (Mis documentos)
        </a>
      )}
      {wa && (
        <a className="pb-btn verde" href={wa} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none" }}>
          <IconChat size={18} /> Escribir por WhatsApp
        </a>
      )}
      <button type="button" className="pb-link" onClick={atras}>
        ← Atrás
      </button>
    </div>
  );
}

function SubirComprobante({ slug, tipoDoc, doc, cuentas, copiar, copiado, monto, tienda }) {
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
          {cuentas ? (
            <>
              {/* V57 -- "si quieres reservar tu cupo desde ahora puedes hacer el
                  pago desde ya" ("134. sí"): con las cuentas aquí mismo. */}
              <div style={{ fontWeight: 800 }}>¿Quieres asegurar tu cupo? Puedes pagar desde ya</div>
              <div className="pb-h" style={{ margin: "2px 0 8px" }}>
                {cuentas.length
                  ? `Haz la transferencia${monto ? ` (${monto})` : ""} a ${cuentas.length === 1 ? "esta cuenta" : "una de estas cuentas"} y sube aquí el comprobante.`
                  : "Te escribimos por WhatsApp con los datos para el pago. Cuando pagues, sube aquí el comprobante."}
              </div>
              {cuentas.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <CuadroCuentas cuentas={cuentas} tienda={tienda} copiar={copiar} copiado={copiado} />
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800 }}>¿Ya pagaste? Sube el comprobante</div>
              <div className="pb-h" style={{ margin: "2px 0 8px" }}>
                Foto o PDF de la transferencia. También puedes subirlo después entrando a este mismo link con tu cédula.
              </div>
            </>
          )}
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
          {cuentas && <div className="pb-h" style={{ margin: "6px 0 0", fontSize: 12.5 }}>Si pagas después, entra a este mismo link con tu cédula y lo subes.</div>}
        </>
      )}
    </div>
  );
}

// V45 -- Pedido: "decir que esa información de identidad no es compartida con
// nadie. Es información utilizada para llevar el registro de los buzos".
// V59 (165) -- La fecha y la hora de salida grandes, en un cuadro, con
// "Agregar a mi calendario". En el iPhone abre el archivo del calendario
// (lo agrega al calendario del iPhone); en los demás, Google Calendar.
function CuadroSalida({ v, enFin, conCalendario }) {
  const sal = partesSalida(v.salida);
  const f = fechaLarga(v.fecha);
  const agregar = () => {
    const link = typeof window !== "undefined" ? urlPrincipal(`/inscripcion/${v.slug}`) : "";
    const ios = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent) && (navigator.maxTouchPoints > 0 || /iPhone|iPad|iPod/i.test(navigator.userAgent));
    if (ios) window.location.href = `/api/viajes/ics/${encodeURIComponent(v.slug)}`;
    else window.open(linkGoogleCalendar(v, link), "_blank", "noopener");
  };
  return (
    <div className={`pb-salida${enFin ? " en-fin" : ""}`}>
      <div className="pb-salida-f">{f.charAt(0).toUpperCase() + f.slice(1)}</div>
      {sal.hora ? (
        <>
          <div className="pb-salida-k">Salimos a las</div>
          <div className="pb-salida-h">{sal.hora}</div>
          {sal.lugar && <div className="pb-salida-l">{sal.lugar}</div>}
        </>
      ) : (
        v.salida && <div className="pb-salida-l">{v.salida}</div>
      )}
      {/* V60 ("174"): "Agregar a mi calendario" solo al final, no arriba. */}
      {conCalendario && (
        <button type="button" className="pb-salida-cal" onClick={agregar}>
          <IconCalendar size={16} /> Agregar a mi calendario
        </button>
      )}
    </div>
  );
}

// V68 ("14. sí, hagamos el intento. Recuerda que también debe de verse la
// parte donde el cliente puede poner comprobante de pago"): el botón para
// entrar al grupo de WhatsApp del buceo. WhatsApp no deja meter a la gente
// sola: el buzo toca y entra con el link de invitación.
function BotonGrupo({ link, chico }) {
  return (
    <div className={`pb-grupo${chico ? " chico" : ""}`}>
      <a className="pb-btn sec pb-grupo-btn" href={link} target="_blank" rel="noreferrer">
        <IconChat size={17} /> Entrar al grupo de WhatsApp
      </a>
      {!chico && <div className="pb-h" style={{ margin: "4px 0 0", textAlign: "center" }}>Ahí mandamos la hora y el punto de encuentro.</div>}
    </div>
  );
}

// V59 (165) -- "¿Llegas directo?": la hora y el lugar de encuentro, el botón
// de ubicación y la foto de la entrada (se ponen en cada buceo del Catálogo).
function LlegasDirecto({ e }) {
  const [foto, setFoto] = useState(false);
  if (!e || !(e.hora || e.lugar || e.mapa || e.foto)) return null;
  return (
    <div className="pb-directo">
      <div className="pb-directo-t">¿Llegas directo?</div>
      {(e.hora || e.lugar) && (
        <div className="pb-directo-x">
          Nos encontramos{e.hora ? (
            <>
              {" "}a las <b>{e.hora}</b>
            </>
          ) : null}
          {e.lugar ? ` ${e.lugar}` : ""}.
        </div>
      )}
      <div className="pb-directo-btns">
        {e.mapa && (
          <a className="pb-directo-btn" href={e.mapa} target="_blank" rel="noreferrer">
            Ver ubicación
          </a>
        )}
        {e.foto && (
          <button type="button" className={`pb-directo-btn${foto ? " sel" : ""}`} onClick={() => setFoto((x) => !x)}>
            <IconCamera size={15} /> Foto de la entrada
          </button>
        )}
      </div>
      {foto && e.foto && <img className="pb-directo-foto" src={e.foto} alt="Entrada" />}
    </div>
  );
}

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
  const [buzo, setBuzo] = useState(null); // { corto, primer, cel, tallasGuardadas }
  const [vincularId, setVincularId] = useState(null);
  const [nuevo, setNuevo] = useState(VACIO);
  const [candidatos, setCandidatos] = useState([]);
  const [opcion, setOpcion] = useState(opcionesPagan[0]?.id || "");
  const [donde, setDonde] = useState(v.equipo?.donde ? "" : null);
  const [piezas, setPiezas] = useState([]);
  const [tallas, setTallas] = useState(TALLAS_VACIAS);
  const [extras, setExtras] = useState([]);
  const [resp, setResp] = useState({});
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [inscritoPor, setInscritoPor] = useState(null); // { tipo, doc, corto }
  const [quedan, setQuedan] = useState(v.quedan);
  const [copiado, setCopiado] = useState("");
  // V64 ("275", "276"): "Mi perfil" del buzo (se entra con su celular).
  const [perfilCel, setPerfilCel] = useState("");
  const [perfil, setPerfil] = useState(null);
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
  // V47: solo la talla de lo que marcó (y que no tengamos ya guardada).
  const tallasPedir = preguntaEquipo ? tallasPara(piezas).filter((t) => !buzo?.tallasGuardadas?.[t.k]) : [];
  const pideTallas = tallasPedir.length > 0;
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

  const entrarPerfil = () =>
    correr(async () => {
      const j = await api({ accion: "perfil", slug: v.slug, tipoDoc, doc, cel: perfilCel });
      setPerfil(j);
      ir("perfil");
    });
  const buscarDoc = () =>
    correr(async () => {
      const j = await api({ accion: "doc", slug: v.slug, tipoDoc, doc });
      // V60 ("174"): los cupos de ahora (si lo cerraron o se llenó con el link abierto).
      if (typeof j.quedan === "number") setQuedan(j.quedan);
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
      : !celValido(nuevo.cel)
      ? setError("Escribe tu celular completo.")
      : ir("viaje");

  function validarViaje() {
    if (eq.donde && !donde) return "Indícanos qué harás con el equipo.";
    if (tallasPedir.some((t) => !tallas[t.k])) return "Escoge tus tallas para reservarte el equipo.";
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
        tallas: pideTallas ? Object.fromEntries(tallasPedir.map((t) => [t.k, tallas[t.k]])) : null,
        extras,
        respuestas: resp,
        acepto,
        inscritoPorDoc: inscritoPor?.doc || null,
        inscritoPorTipo: inscritoPor?.tipo || null,
      });
      setResultado({ ...j, docDe: { tipo: tipoDoc, doc, corto: nombreActual } });
      if (!j.ya && !j.enEspera) setQuedan((q) => Math.max(0, q - 1));
      if (j.enEspera) setQuedan(0);
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
    setTallas(TALLAS_VACIAS);
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

  return (
    <div className="pb">
      <div className="pb-head">
        <img src="/logo-gus-icon.png" alt="Gus Dive Center" style={{ height: 24 }} />
        <span>Gus Dive Center</span>
      </div>
      <div className="pb-hero">
        <div className="pb-kicker">INSCRIPCIÓN</div>
        <div className="pb-titulo">{v.nombre}</div>
        {/* V59 (165): la fecha y la hora de salida grandes, en un cuadro. */}
        <CuadroSalida v={v} />
        {v.abierto &&
          (quedan > 0 ? (
            <div className="pb-cupo">{`Quedan ${quedan} cupo${quedan === 1 ? "" : "s"}`}</div>
          ) : (
            // V48: pedido "que llame más la atención, casi no se ve ahora".
            <div className="pb-cupo lleno">
              <IconAlert size={15} /> Cupo lleno
            </div>
          ))}
      </div>
      <div className="pb-body">
        {!v.abierto ? (
          <div className="pb-card" style={{ textAlign: "center" }}>
            <div className="pb-t">Este {palabra} ya no recibe inscripciones</div>
            <div className="pb-h">Escríbenos por WhatsApp y te avisamos del próximo.</div>
          </div>
        ) : (
          <>
            {paso !== "fin" && (
              <>
                <LlegasDirecto e={v.encuentro} />
                {quedan <= 0 && (
                  <div className="pb-lleno">
                    <IconAlert size={20} />
                    <div>
                      <b>Este {palabra} está lleno.</b> Si te inscribes, quedas en la lista de espera y te avisamos si se abre un cupo.
                    </div>
                  </div>
                )}
                {/* V57 -- "133. Opción B": con un solo precio, una lista "Incluye"
                    con palomitas y el precio "por buzo" al lado (antes era un
                    cuadro que parecía un botón). Debajo, "No incluye". */}
                {opcionesPagan.length === 1 && !v.habitaciones ? (
                  <div className="pb-inc">
                    <div className="pb-inc-top">
                      <b>Incluye</b>
                      <span>
                        <b>{precioTexto(v, opcionesPagan[0])}</b> por {String(opcionesPagan[0].nombre || "persona").toLowerCase()}
                      </span>
                    </div>
                    <ul className="pb-check">
                      {[...partesIncluye(opcionesPagan[0].incluye), ...puntos(v.incluye)].map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                    {v.noIncluye && (
                      <>
                        <b className="pb-inc-no">No incluye</b>
                        <ul className="pb-check no">
                          {puntos(v.noIncluye).map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : null}
                {!(opcionesPagan.length === 1 && !v.habitaciones) && opcionesPagan.map((x) => (
                  <div key={x.id} className="pb-op-info">
                    <b>{x.nombre}</b> · {precioTexto(v, x)}
                    {v.habitaciones ? " por persona" : ""}
                    {/* "Precio por persona" ya lo dice la línea de arriba. */}
                    {x.incluye && !(v.habitaciones && /^precio por persona\.?$/i.test(x.incluye.trim())) && <div>{x.incluye}</div>}
                  </div>
                ))}
                {v.incluye && !(opcionesPagan.length === 1 && !v.habitaciones) && (
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
                {!v.incluye && v.noIncluye && !(opcionesPagan.length === 1 && !v.habitaciones) && (
                  <div className="pb-op-info">
                    <b>No incluye</b>
                    <ul className="pb-lista">
                      {puntos(v.noIncluye).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
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
                    {/* V62 ("246"): la opción A sin "Hola" ("le quitamos el hola? no
                        hace sentido"), con el buceo y la fecha debajo. */}
                    <div className="pb-t">
                      {buzo.enEspera ? `${primerNombre(buzo.corto)}, estás en la lista de espera` : `${primerNombre(buzo.corto)}, ya estás inscrito`}
                    </div>
                    <div className="pb-h" style={{ marginTop: 2, fontWeight: 600 }}>
                      en {v.nombre}, el {fechaLarga(v.fecha)}.
                    </div>
                    <div className="pb-h" style={{ marginTop: 8 }}>
                      {buzo.enEspera
                        ? "Te escribimos por WhatsApp si se abre un cupo. No tienes que pagar nada por ahora."
                        : "Si tienes alguna pregunta, no dudes en escribirnos. ¿Te hace falta equipo? Avísanos y te lo apartamos."}
                    </div>
                    {linkWAYa && (
                      <a className="pb-btn verde" href={linkWAYa} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none" }}>
                        <IconChat size={18} /> Escribir por WhatsApp
                      </a>
                    )}
                    {/* V68 ("14"): el grupo de WhatsApp del buceo (el comprobante sigue abajo). */}
                    {!buzo.enEspera && v.linkGrupo && <BotonGrupo link={v.linkGrupo} />}
                    {/* V62 ("196"): si está en lista de espera, no se le pide pagar. */}
                    {!buzo.enEspera && <SubirComprobante slug={v.slug} tipoDoc={tipoDoc} doc={doc} cuentas={cuentas} tienda={tienda} copiar={copiar} copiado={copiado} monto={opcionesPagan.length === 1 ? (v.reserva ? `reserva de ${rd(v.reserva.monto)}` : precioTexto(v, opcionesPagan[0])) : ""} />}
                    {/* V57: "pon el botón de inscribir otra persona más pequeño";
                        sin "← Atrás" aquí ("quita la flechita"): volvía al paso
                        de la cédula, que es lo mismo que inscribir a otra persona. */}
                    <button className="pb-btn sec pb-chico" onClick={otraPersona}>
                      Inscribir a otra persona
                    </button>
                    {!inscritoPor && (
                      <button className="pb-btn sec pb-chico" onClick={() => ir("perfil-cel")}>
                        Ver mi perfil
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* V64 ("278. A"): el nombre completo desde la cédula. */}
                    <div className="pb-t">¿Eres {buzo.nombre || buzo.corto}?</div>
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
                    {!inscritoPor && (
                      <button className="pb-btn sec pb-chico" onClick={() => ir("perfil-cel")}>
                        Ver mi perfil
                      </button>
                    )}
                    <BotonAtras />
                  </>
                )}
              </div>
            )}

            {/* V64 ("275"): para entrar a "Mi perfil", su celular. */}
            {paso === "perfil-cel" && buzo && (
              <div className="pb-card" onKeyDown={conEnter(() => entrarPerfil())}>
                <div className="pb-t">Tu celular</div>
                <div className="pb-h">Para confirmar que eres tú, escribe tu celular (el que termina en {String(buzo.cel || "").slice(-4)}).</div>
                <CampoCel className="pb-input" value={perfilCel} onChange={setPerfilCel} />
                {error && <div className="pb-error">{error}</div>}
                <button className="pb-btn" disabled={cargando || !celValido(perfilCel)} onClick={() => entrarPerfil()}>
                  {cargando ? "Un momento…" : "Entrar a mi perfil"}
                </button>
                <BotonAtras />
              </div>
            )}
            {paso === "perfil" && perfil && (
              <MiPerfil perfil={perfil} setPerfil={setPerfil} slug={v.slug} tipoDoc={tipoDoc} doc={doc} cel={perfilCel} setCel={setPerfilCel} tienda={tienda} cuentas={cuentas} copiar={copiar} copiado={copiado} atras={atras} />
            )}

            {paso === "cel" && (
              <div className="pb-card" onKeyDown={conEnter(buscarCel)}>
                {/* Solo sale si la cédula no está guardada. Muchos buzos que ya
                    tenemos (de los sheets o agregados a mano) no tienen cédula,
                    solo nombre y celular: con el celular se encuentran y se les
                    guarda la cédula. */}
                <div className="pb-t">¿Primera vez buceando con Gus?</div>
                <div className="pb-h">Ingresa tu número de celular (el de WhatsApp).</div>
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
                      setBuzo({ corto: c.corto, primer: c.corto.split(" ")[0], tallasGuardadas: {} });
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
                  {["SNSI", "PADI", "SSI", "Raid", "NAUI", "Otra", "No soy buzo (snorkel / acompañante)"].map((a) => (
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
                      <div className="pb-tallas">
                        {tallasPedir.map((t) => (
                          <label key={t.k}>
                            <span>{t.t}</span>
                            <select className="pb-input" value={tallas[t.k]} onChange={(e) => setTallas({ ...tallas, [t.k]: e.target.value })}>
                              <option value="">Escoge…</option>
                              {t.ops.map((o) => (
                                <option key={o.v} value={o.v}>
                                  {o.t}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* V59: sin los extras vacíos (sin nombre), "quitar opción de quiero agregar". */}
                {(v.extras || []).filter((e) => String(e.nombre || "").trim()).map((e) => (
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
                {quedan > 0 ? (
                  <div className="pb-resumen">
                    Vas a inscribir a <b>{nombreActual}</b>
                    {total ? ` · total ${rd(total)}` : ""}
                  </div>
                ) : (
                  // V60 ("174"): que sepa antes de enviar que queda en lista de espera.
                  <div className="pb-lleno pb-lleno-fin">
                    <IconAlert size={20} />
                    <div>
                      <b>Este {palabra} está lleno.</b> Vas a anotar a {nombreActual} en la <b>lista de espera</b>. No tienes que pagar nada ahora: te escribimos si se abre un cupo.
                    </div>
                  </div>
                )}
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
                  <>
                    <div className="pb-t">
                      {resultado.nombre}, ya estabas en la lista de este {palabra}
                    </div>
                    <div className="pb-fin-salida">
                      <CuadroSalida v={v} enFin conCalendario />
                      <LlegasDirecto e={v.encuentro} />
                    </div>
                  </>
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
                    {!resultado.enEspera && cuentas.length > 0 && <CuadroCuentas cuentas={cuentas} tienda={tienda} copiar={copiar} copiado={copiado} />}
                    {linkWA && (
                      <>
                        {/* V59: sin mostrar el mensaje antes ("que si le dan a confirmar por WhatsApp se abra el mensaje y ya"). */}
                        <a className="pb-btn verde" href={linkWA} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none" }}>
                          Confirmar por WhatsApp
                        </a>
                      </>
                    )}
                    {/* V68 ("14"): el grupo de WhatsApp del buceo; el comprobante sigue abajo. */}
                    {!resultado.enEspera && v.linkGrupo && <BotonGrupo link={v.linkGrupo} />}
                {/* V60 ("174"): debajo de "Confirmar por WhatsApp", la salida con
                    "Agregar a mi calendario" y "¿Llegas directo?"; después el comprobante. */}
                {!resultado.enEspera && (
                  <div className="pb-fin-salida">
                    <CuadroSalida v={v} enFin conCalendario />
                    <LlegasDirecto e={v.encuentro} />
                  </div>
                )}
                    {!resultado.enEspera && <SubirComprobante slug={v.slug} tipoDoc={resultado.docDe.tipo} doc={resultado.docDe.doc} />}
                  </>
                )}
                <button className="pb-btn sec pb-chico" onClick={otraPersona}>
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
