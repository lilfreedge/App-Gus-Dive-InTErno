"use client";

import { useState } from "react";
import {
  fechaLarga,
  fechaCorta,
  rd,
  us,
  soloDigitos,
  formatoCel,
  formatoCedula,
  nombreCorto,
  precioDop,
  precioTexto,
  precioInscripcion,
  estadoPago,
  monedaCuenta,
  montoTexto,
  pagoEnDop,
  resumenViaje,
  numerosViaje,
  estadoViaje,
  ESTADOS_VIAJE,
  sumarDias,
  CUENTAS,
  PREGUNTAS,
  hoyISO,
  nuevoIdLocal,
} from "@/lib/viajes/modelo";
import { Chip, Modal, IconoWA, CampoCel, Atras } from "./Piezas";

const nombreDe = (db, id) => db.buzos.find((b) => b.id === id)?.nombre || "";
const comprobanteNuevo = (x) => (x.comprobantes || []).some((c) => !c.visto);

// =====================================================================
// UN VIAJE
// =====================================================================
export function Viaje(props) {
  const { db, ops, p, id, tab, ir, avisar } = props;
  const v = db.viajes.find((x) => x.id === id);
  const r = resumenViaje(db, v);
  const ev = estadoViaje(v);
  const cerrado = ev === "cerrado" || ev === "cancelado";
  const tabs = [
    { k: "inscritos", t: `Inscritos (${r.buzos.length})` },
    { k: "info", t: "Info del viaje" },
    ...(v.equipo.modo === "si" ? [{ k: "tallas", t: "Tallas" }] : []),
    ...(v.habitaciones ? [{ k: "habitaciones", t: "Habitaciones" }] : []),
    ...(p.numeros ? [{ k: "numeros", t: "Números" }] : []),
    ...(p.bitacora ? [{ k: "bitacora", t: "Bitácora" }] : []),
  ];
  const cambiarViaje = (cambios, texto, antes, despues) => ops.cambiarViaje(v, cambios, texto, antes, despues);
  const link = typeof window !== "undefined" ? `${window.location.origin}/inscripcion/${v.slug}` : `/inscripcion/${v.slug}`;
  const copiar = (texto, aviso) => {
    try {
      navigator.clipboard.writeText(texto);
      avisar(aviso);
    } catch {
      avisar(texto);
    }
  };
  const q = { ...props, v, r, ev, cerrado, cambiarViaje };
  return (
    <>
      <Atras onClick={() => ir(cerrado ? "historial" : "inicio")}>{cerrado ? "Historial" : "Viajes"}</Atras>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          {v.nombre}
        </h1>
        <Chip c={ESTADOS_VIAJE[ev].c}>{ESTADOS_VIAJE[ev].t}</Chip>
      </div>
      <div className="hint-text" style={{ fontSize: 14, marginTop: 2 }}>
        {fechaLarga(v.fecha)} · {v.salida} · cupo {v.cupoMin ? `mín. ${v.cupoMin}, ` : ""}máx. {v.cupoMax}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 6px" }}>
        {!cerrado && ev !== "realizado" && (
          <>
            <button className="btn secondary vj-btn" onClick={() => copiar(link, "Link de inscripción copiado")}>
              🔗 Copiar link
            </button>
            <button className="btn secondary vj-btn" onClick={() => window.open(link, "_blank")}>
              👁 Lo que ve el buzo
            </button>
            <button className="btn secondary vj-btn" onClick={() => copiar((v.mensajeGrupo || "").replace("[día]", fechaLarga(v.fecha)), "Mensaje para el grupo copiado")}>
              💬 Mensaje para el grupo
            </button>
          </>
        )}
        <button className="btn secondary vj-btn" onClick={() => ir(`reporte:${v.id}`)}>
          📄 Reporte
        </button>
        {p.editarViaje && ev === "abierto" && (
          <button className="btn secondary vj-btn" onClick={() => cambiarViaje({ estado: "cerrado_insc" }, "Cerró la inscripción", "Abierta", "Cerrada")}>
            🔒 Cerrar inscripción
          </button>
        )}
        {p.editarViaje && ev === "cerrado_insc" && (
          <button className="btn secondary vj-btn" onClick={() => cambiarViaje({ estado: "abierto" }, "Abrió la inscripción", "Cerrada", "Abierta")}>
            🔓 Abrir inscripción
          </button>
        )}
      </div>
      {cerrado && (
        <div className={`vj-banner ${ev}`}>
          {ev === "cerrado" ? `Viaje cerrado por ${v.cerradoPor || "—"} el ${fechaCorta(v.cerradoEl || hoyISO())}. Ya no se puede editar.` : `Viaje cancelado. ${v.motivoCancelado || ""}`}
          {p.cerrar && (
            <button
              className="btn secondary vj-mini"
              style={{ marginLeft: 8 }}
              onClick={() => cambiarViaje({ estado: diasPara0(v.fecha) ? "realizado" : "abierto" }, "Reabrió el viaje", ESTADOS_VIAJE[ev].t, "Abierto")}
            >
              Reabrir
            </button>
          )}
        </div>
      )}
      {ev === "realizado" && <Cierre {...q} />}
      <div className="vj-tabs">
        {tabs.map((t) => (
          <button key={t.k} className={`vj-tab${tab === t.k ? " sel" : ""}`} onClick={() => ir(`viaje:${id}:${t.k}`)}>
            {t.t}
          </button>
        ))}
      </div>
      {tab === "inscritos" && <Inscritos {...q} />}
      {tab === "info" && <InfoViaje {...q} />}
      {tab === "tallas" && <Tallas {...q} />}
      {tab === "habitaciones" && <Habitaciones {...q} />}
      {tab === "numeros" && p.numeros && <Numeros {...q} />}
      {tab === "bitacora" && p.bitacora && <BitacoraLista db={db} viajeId={v.id} />}
    </>
  );
}
const diasPara0 = (iso) => iso < hoyISO();

// ------------------------------------------------------------- cierre
function Cierre({ db, v, r, p, ir, cambiarViaje, rol }) {
  const [confirmar, setConfirmar] = useState(false);
  const n = numerosViaje(db, v);
  const pagan = r.ins.filter((x) => x.rol === "buzo");
  const deben = pagan.filter((x) => ["sin", "parcial"].includes(estadoPago(v, x).k) && x.asistio !== false).length;
  const checks = [
    { ok: r.sinMarcar === 0, t: r.sinMarcar === 0 ? "Asistencia marcada" : `Falta marcar asistencia de ${r.sinMarcar}` },
    { ok: deben === 0, t: deben === 0 ? "Todos pagaron" : `${deben} con pago pendiente` },
    { ok: r.porConciliar === 0, t: r.porConciliar === 0 ? "Todo conciliado" : `${r.porConciliar} pago(s) por conciliar` },
    { ok: (v.gastos || []).length > 0, t: (v.gastos || []).length ? `Gastos reales puestos (${rd(n.gastosReales)})` : "Faltan los gastos reales (pestaña Números)" },
  ];
  const listo = checks.every((c) => c.ok);
  return (
    <div className="card vj-cierre">
      <div style={{ fontWeight: 800 }}>Este viaje ya pasó. Para cerrarlo:</div>
      {checks.map((c, i) => (
        <div key={i} className={`vj-check-cierre${c.ok ? " ok" : ""}`}>
          {c.ok ? "✓" : "•"} {c.t}
        </div>
      ))}
      {p.cerrar ? (
        confirmar ? (
          <div style={{ marginTop: 10 }}>
            {!listo && <div className="aviso-box">Todavía faltan cosas. Si lo cierras así, quedan como están (lo puedes reabrir después).</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn secondary vj-btn" onClick={() => setConfirmar(false)}>
                No, espera
              </button>
              <button
                className="btn btn-primary vj-btn"
                onClick={() => {
                  cambiarViaje({ estado: "cerrado", cerradoPor: rol.corto, cerradoEl: hoyISO() }, "Cerró el viaje", "Por cerrar", "Cerrado");
                  ir("historial");
                }}
              >
                Sí, cerrar viaje
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-primary vj-btn" style={{ marginTop: 10 }} onClick={() => setConfirmar(true)}>
            Cerrar viaje
          </button>
        )
      ) : (
        <div className="hint-text" style={{ marginTop: 8 }}>
          Solo Pipe o Gugi lo pueden cerrar.
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------- inscritos
function Inscritos(props) {
  const { db, ops, v, r, p, ev, cerrado } = props;
  const [abierto, setAbierto] = useState(null);
  const [agregando, setAgregando] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [q, setQ] = useState("");
  const lista = db.inscripciones.filter((x) => x.viajeId === v.id);
  const inscritos = lista.filter((x) => x.estado === "inscrito");
  const espera = lista.filter((x) => x.estado === "espera");
  const pasado = ev === "realizado" || cerrado;
  const ep = (x) => estadoPago(v, x);
  const filtros = [
    { k: "todos", t: "Todos", f: () => true },
    ...(p.pagos ? [{ k: "sinpagar", t: "Sin pagar", f: (x) => ["sin", "parcial"].includes(ep(x).k) }] : []),
    ...(p.conciliar ? [{ k: "conciliar", t: "Por conciliar", f: (x) => (x.pagos || []).some((y) => !y.conciliado && !y.abono) }] : []),
    ...(p.pagos || p.conciliar ? [{ k: "comprobante", t: "📎 Comprobante nuevo", f: comprobanteNuevo }] : []),
    { k: "grupo", t: "Sin grupo", f: (x) => !x.grupo },
    { k: "revisar", t: "Por revisar", f: (x) => x.nuevo },
    ...(pasado ? [{ k: "asist", t: "Sin marcar asistencia", f: (x) => x.asistio == null }] : []),
    { k: "staff", t: "Staff", f: (x) => x.rol === "staff" },
  ];
  const fx = filtros.find((f) => f.k === filtro) || filtros[0];
  const visibles = inscritos
    .filter(fx.f)
    .filter((x) => !q || `${nombreDe(db, x.buzoId)} ${db.buzos.find((b) => b.id === x.buzoId)?.cel}`.toLowerCase().includes(q.toLowerCase().replace(/-/g, "")))
    .sort((a, b) => (a.rol === "staff") - (b.rol === "staff") || nombreDe(db, a.buzoId).localeCompare(nombreDe(db, b.buzoId)));
  const cambiar = (x, cambios, texto, antes, despues) => ops.cambiarIns(x, cambios, `${texto}: ${nombreDe(db, x.buzoId)}`, antes, despues);
  const pagados = r.buzos.filter((x) => ["pagado", "abono", "otro", "curso", "invitado"].includes(ep(x).k)).length;

  return (
    <>
      <div className="vj-resumen">
        <div>
          <b>{r.buzos.length}</b>
          <span>de {v.cupoMax} inscritos</span>
        </div>
        {pasado ? (
          <div>
            <b>{r.asistieron}</b>
            <span>asistieron</span>
          </div>
        ) : (
          <div>
            <b>{inscritos.filter((x) => x.grupo).length}</b>
            <span>en el grupo</span>
          </div>
        )}
        {p.pagos && (
          <div>
            <b>{pagados}</b>
            <span>pagados</span>
          </div>
        )}
        <div>
          <b>{r.porRevisar}</b>
          <span>por revisar</span>
        </div>
      </div>
      <div className="vj-filtros">
        {filtros.map((f) => {
          const n = inscritos.filter(f.f).length;
          return (
            <button key={f.k} className={`vj-filtro${filtro === f.k ? " sel" : ""}`} onClick={() => setFiltro(f.k)}>
              {f.t} <span>{n}</span>
            </button>
          );
        })}
      </div>
      <input className="vj-buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Buscar en este viaje…" />
      <div className="card vj-lista">
        {visibles.length > 0 && (
          <div className="vj-lista-head">
            <span>Nombre</span>
            <div className="vj-fila-der">
              {(p.pagos || p.conciliar) && <span className="vj-lh-pago">Pago</span>}
              <span className={pasado ? "vj-lh-asist" : "vj-lh-wa"}>{pasado ? "Asistencia" : "Grupo"}</span>
            </div>
          </div>
        )}
        {visibles.length === 0 && <div className="hint-text" style={{ padding: 14 }}>Nadie en este filtro.</div>}
        {visibles.map((x) => {
          const b = db.buzos.find((y) => y.id === x.buzoId);
          const o = v.opciones.find((y) => y.id === x.opcionId) || v.opciones[0];
          const e = ep(x);
          const sub = [
            x.rol === "staff" ? "Staff" : x.rol === "curso" ? o.nombre : v.opciones.length > 1 ? o.nombre : null,
            v.equipo.modo === "si" ? (x.equipo.piezas.length ? `Alquila ${x.equipo.piezas.length} pieza${x.equipo.piezas.length > 1 ? "s" : ""}` : x.rol !== "staff" ? "Equipo propio" : null) : null,
            x.habitacion ? `Hab. ${x.habitacion}` : null,
            (x.extras || []).length ? `+ ${x.extras.map((id) => v.extras.find((y) => y.id === id)?.nombre).join(", ")}` : null,
          ].filter(Boolean);
          return (
            <div key={x.id} className={`vj-fila${x.nuevo ? " nuevo" : ""}`}>
              <button className="vj-fila-main" onClick={() => setAbierto(x.id)}>
                <div className="vj-fila-nombre">
                  {x.nuevo && <span className="vj-punto" title="Nuevo · por revisar" />}
                  {b.nombre}
                </div>
                <div className="hint-text">{sub.join(" · ") || formatoCel(b.cel)}</div>
              </button>
              <div className={`vj-fila-der${p.pagos || p.conciliar ? " con-pago" : ""}`}>
                {(p.pagos || p.conciliar) && (
                  <button className={`vj-chip ${e.c} vj-chip-btn`} onClick={() => setAbierto(x.id)} title={comprobanteNuevo(x) ? "Subió un comprobante que nadie ha visto" : ""}>
                    {comprobanteNuevo(x) ? "📎 " : ""}
                    {e.t}
                    {p.conciliar && e.k === "pagado" && (e.porConciliar ? " · por conciliar" : " ✓")}
                  </button>
                )}
                {pasado ? (
                  p.grupo && !cerrado ? (
                    <div className="vj-asist">
                      <button className={x.asistio === true ? "si" : ""} onClick={() => cambiar(x, { asistio: x.asistio === true ? null : true }, "Asistencia", x.asistio == null ? "—" : x.asistio ? "Asistió" : "No vino", "Asistió")}>
                        ✓
                      </button>
                      <button className={x.asistio === false ? "no" : ""} onClick={() => cambiar(x, { asistio: x.asistio === false ? null : false }, "Asistencia", x.asistio == null ? "—" : x.asistio ? "Asistió" : "No vino", "No vino")}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <Chip c={x.asistio ? "verde" : x.asistio === false ? "rojo" : "gris"}>{x.asistio ? "Asistió" : x.asistio === false ? "No vino" : "—"}</Chip>
                  )
                ) : (
                  <button
                    className={`vj-wa${x.grupo ? " on" : ""}`}
                    disabled={!p.grupo}
                    title={x.grupo ? "Está en el grupo de WhatsApp" : "No está en el grupo de WhatsApp"}
                    onClick={() => cambiar(x, { grupo: !x.grupo }, "Grupo de WhatsApp", x.grupo ? "Sí" : "No", x.grupo ? "No" : "Sí")}
                  >
                    <IconoWA on={x.grupo} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {p.inscribir && !cerrado && (
        <>
          {agregando ? (
            <AgregarAMano {...props} listo={() => setAgregando(false)} />
          ) : (
            <button className="btn secondary vj-btn" style={{ marginTop: 8 }} onClick={() => setAgregando(true)}>
              + Agregar a mano (buzo, staff o invitado)
            </button>
          )}
        </>
      )}
      {espera.length > 0 && (
        <>
          <div className="section-title">Lista de espera ({espera.length})</div>
          <div className="card vj-lista">
            {espera.map((x) => (
              <div key={x.id} className="vj-fila">
                <button className="vj-fila-main" onClick={() => setAbierto(x.id)}>
                  <div className="vj-fila-nombre">{nombreDe(db, x.buzoId)}</div>
                  <div className="hint-text">Se anotó cuando el viaje estaba lleno</div>
                </button>
                {p.inscribir && (
                  <button className="btn secondary vj-mini" onClick={() => cambiar(x, { estado: "inscrito" }, "Pasó de la lista de espera a inscritos")}>
                    Pasar a inscritos
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {abierto && <PanelInscrito {...props} x={db.inscripciones.find((y) => y.id === abierto)} cerrar={() => setAbierto(null)} cambiar={cambiar} />}
    </>
  );
}

// ------------------------------------------------------------- ficha del inscrito
function PanelInscrito({ db, ops, v, p, ev, cerrado, x, cerrar, cambiar, ir, rol }) {
  const [pagando, setPagando] = useState(false);
  const [quitando, setQuitando] = useState(false);
  if (!x) return null;
  const verComprobante = (c) => ops.verComprobante(c);
  const adjuntar = (file) => ops.adjuntarComprobante(x, file);
  const b = db.buzos.find((y) => y.id === x.buzoId);
  const o = v.opciones.find((y) => y.id === x.opcionId) || v.opciones[0];
  const e = estadoPago(v, x);
  const pasado = ev === "realizado" || cerrado;
  const ro = cerrado;
  const tallaDe = (pieza) => {
    const t = b.tallas || {};
    if (/BCD|chaleco/i.test(pieza)) return t.bcd;
    if (/Wetsuit|Traje/i.test(pieza)) return t.wetsuit || t.bcd;
    if (/Chapaletas|Aletas/i.test(pieza)) return t.chapaletas;
    return null;
  };
  const mostrarEquipo = v.equipo.modo === "si" && (!v.equipo.soloConOpcion || o.conEquipo || x.equipo.piezas.length > 0);
  const inscritoPor = x.inscritoPor ? nombreCorto(nombreDe(db, x.inscritoPor)) : "";
  return (
    <Modal titulo={b.nombre} sub={`${x.rol === "staff" ? "Staff" : x.rol === "curso" ? "Estudiante de curso" : x.rol === "invitado" ? "Invitado" : o.nombre}${x.estado === "espera" ? " · lista de espera" : ""}`} cerrar={cerrar}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {x.nuevo && <Chip c="morado">Nuevo · por revisar</Chip>}
        {x.nuevo && p.inscribir && !ro && (
          <button className="btn secondary vj-mini" onClick={() => cambiar(x, { nuevo: false }, "Revisado")}>
            ✓ Revisado
          </button>
        )}
        {inscritoPor && <Chip c="azul">La inscribió {inscritoPor}</Chip>}
        <Chip c="gris">{x.via === "mano" ? "Agregado a mano" : "Se inscribió por el link"}</Chip>
      </div>

      <div className="vj-sec">Contacto</div>
      <div className="vj-dato">
        <span>Celular</span>
        <b>
          {formatoCel(b.cel) || "—"}{" "}
          {b.cel && (
            <a className="vj-link" style={{ marginLeft: 6 }}>
              Abrir WhatsApp
            </a>
          )}
        </b>
      </div>
      <div className="vj-dato">
        <span>{b.doc ? "Cédula" : b.pasaporte ? "Pasaporte" : "Documento"}</span>
        <b>{b.doc || b.pasaporte || <span style={{ color: "var(--texto-suave)", fontWeight: 500 }}>Todavía no lo ha puesto</span>}</b>
      </div>
      <div className="vj-dato">
        <span>Certificación</span>
        <b>{b.agencia ? `${b.agencia} ${b.nivel || ""} · ${b.cert || "sin número"}` : "—"}</b>
      </div>
      {p.buzos && (
        <a className="vj-link" style={{ fontSize: 13 }} onClick={() => ir(`buzo:${b.id}`)}>
          Ver ficha completa del buzo ›
        </a>
      )}

      {x.rol === "buzo" && (
        <>
          <div className="vj-sec">En este viaje</div>
          {v.opciones.length > 1 && (
            <div className="vj-dato">
              <span>Opción</span>
              <select
                className="vj-sel"
                disabled={!p.inscribir || ro}
                value={x.opcionId}
                onChange={(ev2) => cambiar(x, { opcionId: ev2.target.value }, "Cambió la opción", o.nombre, v.opciones.find((y) => y.id === ev2.target.value).nombre)}
              >
                {v.opciones.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.nombre} · {precioTexto(v, y)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {v.extras.map((ex) => (
            <label key={ex.id} className="vj-check">
              <input
                type="checkbox"
                disabled={!p.inscribir || ro}
                checked={(x.extras || []).includes(ex.id)}
                onChange={(ev2) =>
                  cambiar(x, { extras: ev2.target.checked ? [...(x.extras || []), ex.id] : x.extras.filter((y) => y !== ex.id) }, `${ex.nombre}`, ev2.target.checked ? "No" : "Sí", ev2.target.checked ? "Sí" : "No")
                }
              />
              {ex.nombre} (+{rd(ex.dop)})
            </label>
          ))}
          {v.equipo.modo === "no" && <div className="hint-text">Este viaje no tiene alquiler de equipo.</div>}
          {mostrarEquipo && (
            <>
              <div className="hint-text" style={{ marginTop: 6 }}>
                Equipo que alquila{x.equipo.donde ? ` (${v.equipo.donde?.find((d) => d.id === x.equipo.donde)?.t.replace("Lo alquilo ", "")})` : v.equipo.proveedor ? ` (lo pone ${v.equipo.proveedor})` : ""}:
              </div>
              <div className="pb-chips" style={{ marginTop: 4 }}>
                {v.equipo.piezas.map((pz) => {
                  const sel = x.equipo.piezas.includes(pz);
                  const talla = tallaDe(pz);
                  return (
                    <button
                      key={pz}
                      className={`pb-chip mini${sel ? " sel" : ""}`}
                      disabled={!p.inscribir || ro}
                      onClick={() =>
                        cambiar(x, { equipo: { ...x.equipo, piezas: sel ? x.equipo.piezas.filter((y) => y !== pz) : [...x.equipo.piezas, pz] } }, `Equipo (${pz})`, sel ? "Alquila" : "Propio", sel ? "Propio" : "Alquila")
                      }
                    >
                      {pz}
                      {sel && talla ? ` · ${talla}` : ""}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {v.habitaciones && (
            <div className="vj-dato" style={{ marginTop: 6 }}>
              <span>Habitación</span>
              <select className="vj-sel" disabled={!p.inscribir || ro} value={x.habitacion} onChange={(ev2) => cambiar(x, { habitacion: ev2.target.value }, "Habitación", x.habitacion || "—", ev2.target.value || "—")}>
                <option value="">Sin asignar</option>
                {v.habitaciones.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
          )}
          {Object.keys(x.respuestas || {}).length > 0 &&
            Object.entries(x.respuestas).map(([k, val]) => (
              <div key={k} className="vj-dato">
                <span>{PREGUNTAS.find((y) => y.k === k)?.t || k}</span>
                <b>{val}</b>
              </div>
            ))}
        </>
      )}

      {!pasado && (
        <>
          <div className="vj-sec">Grupo de WhatsApp</div>
          <label className={`vj-toggle${x.grupo ? " on" : ""}`}>
            <input type="checkbox" checked={x.grupo} disabled={!p.grupo || ro} onChange={(ev2) => cambiar(x, { grupo: ev2.target.checked }, "Grupo de WhatsApp", x.grupo ? "Sí" : "No", ev2.target.checked ? "Sí" : "No")} />
            {x.grupo ? "Ya está en el grupo" : "Todavía no está en el grupo"}
          </label>
        </>
      )}

      {pasado && (
        <>
          <div className="vj-sec">Asistencia</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              [true, "Asistió"],
              [false, "No vino"],
            ].map(([val, t]) => (
              <button
                key={t}
                disabled={!p.grupo || ro}
                className={`pb-chip mini${x.asistio === val ? " sel" : ""}`}
                onClick={() => cambiar(x, { asistio: x.asistio === val ? null : val }, "Asistencia", x.asistio == null ? "—" : x.asistio ? "Asistió" : "No vino", x.asistio === val ? "—" : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      {x.rol === "buzo" && (p.pagos || p.conciliar) && (
        <>
          <div className="vj-sec">Pago</div>
          {x.usaAbono || x.pagadoPor ? (
            <div className="hint-text">
              {x.usaAbono ? `Usa su abono a favor (${rd(b.abono || 0)}).` : `Lo pagó ${nombreDe(db, x.pagadoPor)}.`}{" "}
              {p.pagos && !ro && (
                <a className="vj-link" onClick={() => cambiar(x, { usaAbono: false, pagadoPor: "" }, "Quitó abono / pagado por otro")}>
                  Quitar
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="vj-pago-res">
                <div>
                  <span>Precio</span>
                  <b>{rd(precioInscripcion(v, x))}</b>
                </div>
                <div>
                  <span>Pagado</span>
                  <b>{rd(e.pagado)}</b>
                </div>
                <div>
                  <span>Falta</span>
                  <b style={{ color: e.falta ? "var(--rojo)" : "var(--verde)" }}>{e.falta ? rd(e.falta) : "Nada"}</b>
                </div>
              </div>
              {v.reserva && <div className="hint-text">{v.reserva.nota}</div>}
            </>
          )}
          {(x.pagos || []).map((pg) => (
            <div key={pg.id} className="vj-pago">
              <div style={{ minWidth: 0 }}>
                <b>{montoTexto(pg)}</b> <span className="hint-text">{monedaCuenta(pg.cuenta) === "USD" ? `(${rd(pagoEnDop(v, pg))}) ` : ""}</span>
                <div className="hint-text">
                  {fechaCorta(pg.fecha)} · {pg.cuenta} · registró {pg.por}
                  {pg.nota ? ` · ${pg.nota}` : ""}
                </div>
              </div>
              {pg.abono ? (
                <Chip c="azul">Abono</Chip>
              ) : p.conciliar ? (
                <label className={`vj-toggle${pg.conciliado ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    disabled={ro}
                    checked={pg.conciliado}
                    onChange={(ev2) =>
                      cambiar(
                        x,
                        { pagos: x.pagos.map((y) => (y.id === pg.id ? { ...y, conciliado: ev2.target.checked } : y)) },
                        `Conciliación ${montoTexto(pg)}`,
                        pg.conciliado ? "Conciliado" : "Por conciliar",
                        ev2.target.checked ? "Conciliado" : "Por conciliar"
                      )
                    }
                  />
                  Conciliado
                </label>
              ) : (
                <Chip c={pg.conciliado ? "verde" : "gris"}>{pg.conciliado ? "Conciliado" : "Recibido"}</Chip>
              )}
            </div>
          ))}
          {(x.comprobantes || []).length > 0 && (
            <div className="vj-comps">
              {x.comprobantes.map((c) => (
                <div key={c.id} className={`vj-comp${c.visto ? "" : " nuevo"}`}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <b>📎 {c.nombre || "Comprobante"}</b>
                    <div className="hint-text">
                      {fechaCorta(c.fecha)} · {c.por === "Link" ? "lo subió el buzo" : `lo subió ${c.por}`}
                      {c.visto ? "" : " · nuevo"}
                    </div>
                  </div>
                  <button className="btn secondary vj-mini" onClick={() => verComprobante(c)}>
                    Ver
                  </button>
                  {!c.visto && p.pagos && !ro && (
                    <button className="btn secondary vj-mini" onClick={() => cambiar(x, { comprobantes: x.comprobantes.map((y) => (y.id === c.id ? { ...y, visto: true } : y)) }, "Vio el comprobante")}>
                      Ya lo vi
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {p.pagos && !ro && (
            <label className="vj-adjuntar">
              📎 Adjuntar comprobante
              <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={(ev2) => ev2.target.files?.[0] && adjuntar(ev2.target.files[0])} />
            </label>
          )}
          {p.pagos && !ro && !x.usaAbono && !x.pagadoPor && (
            <>
              {pagando ? (
                <RegistrarPago v={v} x={x} falta={e.falta} cerrar={() => setPagando(false)} cambiar={cambiar} quien={rol.corto} />
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button className="btn btn-primary vj-btn" onClick={() => setPagando(true)}>
                    + Registrar pago
                  </button>
                  {(b.abono || 0) > 0 && (
                    <button className="btn secondary vj-btn" onClick={() => ops.usarAbono(x, b, Math.min(b.abono, e.falta || b.abono))}>
                      Usar su abono ({rd(b.abono)})
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="vj-sec">Nota</div>
      <input
        className="vj-nota"
        disabled={!p.grupo || ro}
        defaultValue={x.nota}
        placeholder="Nota (opcional)"
        onBlur={(ev2) => ev2.target.value !== x.nota && cambiar(x, { nota: ev2.target.value }, "Nota", x.nota || "—", ev2.target.value || "—")}
      />

      {p.inscribir && !ro && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--borde)", paddingTop: 10 }}>
          {quitando ? (
            <div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                ¿Quitar a {nombreCorto(b.nombre)} del viaje?
                {e.pagado > 0 ? ` Lo que pagó (${rd(e.pagado)}) le queda como abono a favor para otro viaje.` : ""}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn secondary vj-btn" onClick={() => setQuitando(false)}>
                  No
                </button>
                <button
                  className="btn vj-btn vj-rojo"
                  onClick={() => {
                    ops.quitarIns(x, b, e.pagado || 0, `Quitó del viaje: ${b.nombre}`);
                    cerrar();
                  }}
                >
                  Sí, quitar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {x.estado === "inscrito" && (
                <button className="btn secondary vj-mini" onClick={() => cambiar(x, { estado: "espera" }, "Pasó a lista de espera")}>
                  Pasar a lista de espera
                </button>
              )}
              <button className="btn secondary vj-mini vj-rojo-txt" onClick={() => setQuitando(true)}>
                Quitar del viaje
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function RegistrarPago({ v, x, falta, cerrar, cambiar, quien }) {
  const [cuenta, setCuenta] = useState(CUENTAS[0].t);
  const usd = monedaCuenta(cuenta) === "USD";
  const faltaEn = usd ? Math.ceil(falta / (v.tasa || 62)) : falta;
  const [monto, setMonto] = useState(String(faltaEn || ""));
  const [nota, setNota] = useState("");
  return (
    <div className="vj-pagar">
      <div className="vj-form2">
        <div>
          <label>Cuenta</label>
          <select
            value={cuenta}
            onChange={(e) => {
              setCuenta(e.target.value);
              const u = monedaCuenta(e.target.value) === "USD";
              setMonto(String(u ? Math.ceil(falta / (v.tasa || 62)) : falta));
            }}
          >
            {CUENTAS.map((c) => (
              <option key={c.t}>{c.t}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Monto ({usd ? "US$" : "RD$"})</label>
          <input inputMode="numeric" value={monto} onChange={(e) => setMonto(soloDigitos(e.target.value))} />
        </div>
      </div>
      <label>Nota (opcional)</label>
      <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Reserva, completivo, pagó por su esposa…" />
      <div className="hint-text" style={{ marginTop: 6 }}>
        Queda “por conciliar” hasta que Pipe o Gugi lo confirmen en la cuenta.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn secondary vj-btn" onClick={cerrar}>
          Cancelar
        </button>
        <button
          className="btn btn-primary vj-btn"
          disabled={!Number(monto)}
          onClick={() => {
            const pg = { id: nuevoIdLocal(), monto: Number(monto), cuenta, fecha: hoyISO(), por: quien || "", conciliado: false, nota };
            cambiar(x, { pagos: [...(x.pagos || []), pg], comprobantes: (x.comprobantes || []).map((c) => ({ ...c, visto: true })) }, "Pago registrado", "", `${usd ? us(pg.monto) : rd(pg.monto)} · ${cuenta}`);
            cerrar();
          }}
        >
          Guardar pago
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- agregar a mano (buscador)
function AgregarAMano({ db, ops, v, listo }) {
  const [q, setQ] = useState("");
  const [rol, setRol] = useState("buzo");
  const [nuevo, setNuevo] = useState(null);
  const ya = new Set(db.inscripciones.filter((x) => x.viajeId === v.id).map((x) => x.buzoId));
  const qn = q.toLowerCase().replace(/-/g, "");
  const resultados = q.trim().length < 2 ? [] : db.buzos.filter((b) => `${b.nombre} ${b.cel} ${(b.doc || "").replace(/-/g, "")} ${b.pasaporte || ""}`.toLowerCase().includes(qn)).slice(0, 8);
  const agregar = (buzoId, nombre, buzoNuevo) => {
    const ins = {
      id: nuevoIdLocal(),
      viajeId: v.id,
      buzoId,
      opcionId: (rol === "curso" && v.opciones.find((o) => o.noPaga || /curso|OWD|AOWD/i.test(o.nombre))?.id) || v.opciones[0]?.id || "",
      rol,
      equipo: { piezas: [], donde: "" },
      extras: [],
      respuestas: {},
      estado: "inscrito",
      grupo: false,
      pagos: [],
      usaAbono: false,
      pagadoPor: "",
      asistio: null,
      nota: "",
      nuevo: false,
      inscritoPor: "",
      habitacion: "",
      via: "mano",
    };
    ops.agregarIns(v, ins, buzoNuevo, `Agregó a mano: ${nombre}${rol !== "buzo" ? ` (${rol === "staff" ? "staff" : rol === "curso" ? "curso" : "invitado"})` : ""}`);
    listo();
  };
  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Agregar a mano</div>
      <div className="pb-chips" style={{ marginBottom: 8 }}>
        {[
          ["buzo", "Buzo que paga"],
          ["staff", "Staff (guía / instructor)"],
          ["curso", "Estudiante de curso"],
          ["invitado", "Invitado"],
        ].map(([k, t]) => (
          <button key={k} className={`pb-chip mini${rol === k ? " sel" : ""}`} onClick={() => setRol(k)}>
            {t}
          </button>
        ))}
      </div>
      {!nuevo && (
        <>
          <input className="vj-buscar" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Nombre, celular o cédula…" style={{ marginBottom: 0 }} />
          {resultados.length > 0 && (
            <div className="vj-resultados">
              {resultados.map((b) => (
                <button key={b.id} className="vj-resultado" disabled={ya.has(b.id)} onClick={() => agregar(b.id, b.nombre)}>
                  <div>
                    <b>{b.nombre}</b>
                    {b.staff && <Chip c="gris" style={{ marginLeft: 6 }}>staff</Chip>}
                    <div className="hint-text">
                      {formatoCel(b.cel) || "sin celular"}
                      {b.doc ? ` · ${b.doc}` : ""}
                    </div>
                  </div>
                  <span className="hint-text">{ya.has(b.id) ? "Ya está" : "Agregar"}</span>
                </button>
              ))}
            </div>
          )}
          {q.trim().length >= 2 && (
            <button className="vj-resultado nuevo" onClick={() => setNuevo({ nombre: /\d/.test(q) ? "" : q, cel: /^\d|^8/.test(q) ? formatoCel(q) : "", doc: "", agencia: "" })}>
              + Crear buzo nuevo{!/\d/.test(q) ? `: “${q}”` : ""}
            </button>
          )}
        </>
      )}
      {nuevo && (
        <div>
          <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nombre y apellido" />
          <CampoCel value={nuevo.cel} onChange={(cel) => setNuevo({ ...nuevo, cel })} />
          <input value={nuevo.doc} onChange={(e) => setNuevo({ ...nuevo, doc: formatoCedula(e.target.value) })} placeholder="Cédula (000-0000000-0) — opcional" />
          <select value={nuevo.agencia} onChange={(e) => setNuevo({ ...nuevo, agencia: e.target.value })}>
            <option value="">Certificación…</option>
            {["PADI", "SSI", "SNSI", "Raid", "NAUI", "Otra", "No es buzo (snorkel)"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <button
            className="btn btn-primary vj-btn"
            style={{ marginTop: 10 }}
            disabled={!nuevo.nombre.trim()}
            onClick={() => {
              const id = nuevoIdLocal();
              const yaExiste = nuevo.doc && db.buzos.find((b) => soloDigitos(b.doc) && soloDigitos(b.doc) === soloDigitos(nuevo.doc));
              if (yaExiste) return agregar(yaExiste.id, yaExiste.nombre);
              agregar(id, nuevo.nombre.trim(), {
                id,
                nombre: nuevo.nombre.trim(),
                cel: soloDigitos(nuevo.cel),
                doc: nuevo.doc,
                pasaporte: "",
                agencia: nuevo.agencia,
                nivel: "",
                cert: "",
                correo: "",
                tallas: {},
                abono: 0,
                staff: rol === "staff",
              });
            }}
          >
            Crear y agregar
          </button>
        </div>
      )}
      <button className="btn secondary vj-mini" style={{ marginTop: 10 }} onClick={listo}>
        Cancelar
      </button>
    </div>
  );
}

// ------------------------------------------------------------- info del viaje
function InfoViaje({ db, ops, v, p, ev, cerrado, cambiarViaje, ir }) {
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [nuevoRec, setNuevoRec] = useState(null);
  const ro = cerrado || !p.editarViaje;
  return (
    <>
      <div className="card">
        <div className="vj-dato">
          <span>Fecha</span>
          <b>{fechaLarga(v.fecha)}</b>
        </div>
        <div className="vj-dato">
          <span>Salida</span>
          <b>{v.salida}</b>
        </div>
        {v.moneda === "USD" && (
          <div className="vj-dato">
            <span>Tasa del dólar</span>
            <b>{v.tasa}</b>
          </div>
        )}
        <div className="vj-dato">
          <span>Operador</span>
          <b>{v.operador || "—"}</b>
        </div>
        <div className="vj-dato">
          <span>Cupo</span>
          <b>
            {v.cupoMin ? `mínimo ${v.cupoMin} · ` : ""}máximo {v.cupoMax}
          </b>
        </div>
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 13.5 }}>Opciones</div>
        {v.opciones.map((o) => (
          <div key={o.id} className="vj-opcion">
            <div>
              <b>{o.nombre}</b>
              <div className="hint-text">{o.incluye}</div>
            </div>
            <b style={{ whiteSpace: "nowrap" }}>{precioTexto(v, o)}</b>
          </div>
        ))}
        {v.extras.map((e) => (
          <div key={e.id} className="vj-opcion">
            <div>
              <b>{e.nombre}</b>
              <div className="hint-text">Opcional, aparte</div>
            </div>
            <b>+{rd(e.dop)}</b>
          </div>
        ))}
        {v.incluye && (
          <div className="hint-text" style={{ marginTop: 8 }}>
            <b>Incluye:</b> {v.incluye}
          </div>
        )}
        {v.noIncluye && (
          <div className="hint-text" style={{ marginTop: 4 }}>
            <b>No incluye:</b> {v.noIncluye}
          </div>
        )}
        {v.reserva && <div className="aviso-box" style={{ marginTop: 10 }}>{v.reserva.nota}</div>}
        <div className="aviso-box" style={{ marginTop: 10 }}>
          <b>Equipo:</b> {v.equipo.nota}
        </div>
        {v.requisito && (
          <div className="hint-text" style={{ marginTop: 10 }}>
            <b>El buzo tiene que aceptar:</b> {v.requisito}
          </div>
        )}
        {v.preguntas.length > 0 && (
          <div className="hint-text" style={{ marginTop: 8 }}>
            <b>Se le pregunta:</b> {v.preguntas.map((k) => PREGUNTAS.find((x) => x.k === k)?.t).join(" · ")}
          </div>
        )}
      </div>

      <div className="section-title">Pendientes del viaje</div>
      <div className="card">
        {v.pendientes.map((x, i) => (
          <label key={i} className="vj-check">
            <input
              type="checkbox"
              checked={x.hecho}
              disabled={ro}
              onChange={(e) => cambiarViaje({ pendientes: v.pendientes.map((y, j) => (j === i ? { ...y, hecho: e.target.checked } : y)) }, `Pendiente: ${x.t}`, x.hecho ? "Hecho" : "Pendiente", e.target.checked ? "Hecho" : "Pendiente")}
            />
            <span style={x.hecho ? { textDecoration: "line-through", color: "var(--texto-suave)" } : null}>{x.t}</span>
          </label>
        ))}
      </div>

      <div className="section-title">Recordatorios de este viaje</div>
      <div className="card">
        <div className="hint-text" style={{ marginBottom: 6 }}>
          Además de los generales (1 mes antes, 1 semana antes…). Salen en el Calendario y en “Para hacer”.
        </div>
        {(v.recordatorios || []).map((r) => (
          <div key={r.id} className="vj-dato">
            <span>
              {fechaCorta(sumarDias(v.fecha, -r.dias))} ({r.dias} días antes)
            </span>
            <b style={{ textAlign: "right", fontWeight: 600 }}>
              {r.texto}{" "}
              {!ro && (
                <a className="vj-quitar" onClick={() => cambiarViaje({ recordatorios: v.recordatorios.filter((y) => y.id !== r.id) }, `Quitó recordatorio: ${r.texto}`)}>
                  Quitar
                </a>
              )}
            </b>
          </div>
        ))}
        {!ro &&
          (nuevoRec ? (
            <div className="vj-gen-edit">
              <input className="vj-dias" value={nuevoRec.dias} onChange={(e) => setNuevoRec({ ...nuevoRec, dias: soloDigitos(e.target.value) })} />
              <span className="hint-text">días antes</span>
              <input style={{ flex: 1, minWidth: 180 }} value={nuevoRec.texto} onChange={(e) => setNuevoRec({ ...nuevoRec, texto: e.target.value })} placeholder="Ej. Comprar hielo" />
              <button
                className="btn btn-primary vj-mini"
                disabled={!nuevoRec.texto.trim()}
                onClick={() => {
                  cambiarViaje({ recordatorios: [...(v.recordatorios || []), { id: nuevoIdLocal(), dias: Number(nuevoRec.dias) || 0, texto: nuevoRec.texto.trim() }] }, `Recordatorio nuevo: ${nuevoRec.texto.trim()}`);
                  setNuevoRec(null);
                }}
              >
                Guardar
              </button>
            </div>
          ) : (
            <button className="btn secondary vj-mini" style={{ marginTop: 8 }} onClick={() => setNuevoRec({ dias: "3", texto: "" })}>
              + Agregar recordatorio
            </button>
          ))}
      </div>

      <div className="section-title">Grupo de WhatsApp</div>
      <div className="card">
        <div className="hint-text" style={{ marginBottom: 6 }}>
          Mensaje para el grupo
        </div>
        <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{(v.mensajeGrupo || "—").replace("[día]", fechaLarga(v.fecha))}</div>
      </div>
      {p.web && !cerrado && (
        <>
          <div className="section-title">Página web</div>
          <div className="card">
            <label className={`vj-toggle${v.web ? " on" : ""}`}>
              <input type="checkbox" checked={v.web} onChange={(e) => cambiarViaje({ web: e.target.checked }, "Mostrar en la web", v.web ? "Sí" : "No", e.target.checked ? "Sí" : "No")} />
              Mostrar este viaje en gusdivecenter.com
            </label>
          </div>
        </>
      )}
      {p.cerrar && !cerrado && (
        <>
          <div className="section-title">Cancelar el viaje</div>
          <div className="card">
            {cancelando ? (
              <>
                <label>Motivo</label>
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. No se llegó al mínimo, mal tiempo…" />
                <div className="hint-text" style={{ marginTop: 6 }}>
                  Lo que cada buzo pagó le queda como <b>abono a favor</b> para otro viaje (se ve en su ficha). Si alguien quiere su dinero de
                  vuelta, se le quita el abono a mano.
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn secondary vj-btn" onClick={() => setCancelando(false)}>
                    No
                  </button>
                  <button
                    className="btn vj-btn vj-rojo"
                    onClick={() => {
                      const ins = db.inscripciones.filter((x) => x.viajeId === v.id && x.rol === "buzo" && x.estado !== "quitado");
                      const abonos = ins
                        .map((x) => ({ buzoId: x.buzoId, monto: (x.pagos || []).reduce((a, pg) => a + pagoEnDop(v, pg), 0) }))
                        .filter((a) => a.monto > 0);
                      ops.cancelarViaje(v, motivo, abonos, ESTADOS_VIAJE[ev].t);
                      ir("historial");
                    }}
                  >
                    Sí, cancelar viaje
                  </button>
                </div>
              </>
            ) : (
              <button className="btn secondary vj-mini vj-rojo-txt" onClick={() => setCancelando(true)}>
                Cancelar este viaje…
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ------------------------------------------------------------- tallas
function Tallas({ db, v, avisar }) {
  const ins = db.inscripciones.filter((x) => x.viajeId === v.id && x.estado === "inscrito");
  const buzos = ins.filter((x) => x.rol !== "staff");
  const staff = ins.filter((x) => x.rol === "staff");
  const prov = (x) => (x.equipo.donde ? v.equipo.donde?.find((d) => d.id === x.equipo.donde)?.t.replace("Lo alquilo ", "") : v.equipo.proveedor);
  const celda = (x, b, pz) => {
    if (!x.equipo.piezas.includes(pz)) return { t: "Propio", c: "propio" };
    const t = b.tallas || {};
    const talla = /BCD|chaleco/i.test(pz) ? t.bcd : /Wetsuit|Traje/i.test(pz) ? t.wetsuit || t.bcd : /Chapaletas|Aletas/i.test(pz) ? t.chapaletas : "";
    const necesita = /BCD|chaleco|Wetsuit|Traje|Chapaletas|Aletas/i.test(pz);
    if (necesita && !talla) return { t: "¿talla?", c: "falta" };
    return { t: talla || prov(x) || "Alquila", c: "" };
  };
  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <b>Lista de tallas para {v.equipo.proveedor || v.operador}</b>
        <button className="btn secondary vj-mini" onClick={() => avisar("Lista de tallas copiada para mandarla por WhatsApp")}>
          Copiar para enviar
        </button>
      </div>
      <table className="vj-tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>Buzo</th>
            {v.equipo.donde && <th>Dónde</th>}
            {v.equipo.piezas.map((e) => (
              <th key={e}>{e}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buzos.map((x, i) => {
            const b = db.buzos.find((y) => y.id === x.buzoId);
            return (
              <tr key={x.id}>
                <td>{i + 1}</td>
                <td>{b.nombre}</td>
                {v.equipo.donde && <td>{x.equipo.piezas.length ? prov(x) : "—"}</td>}
                {v.equipo.piezas.map((pz) => {
                  const c = celda(x, b, pz);
                  return (
                    <td key={pz} className={c.c}>
                      {c.t}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {staff.length > 0 && (
        <div className="hint-text" style={{ marginTop: 10 }}>
          <b>Guías:</b> {staff.map((x) => nombreDe(db, x.buzoId)).join(", ")}
        </div>
      )}
      <div className="hint-text" style={{ marginTop: 6 }}>
        “¿talla?” = alquila pero no tenemos su talla guardada. Se le pide al inscribirse y queda guardada para la próxima.
      </div>
    </div>
  );
}

// ------------------------------------------------------------- habitaciones
function Habitaciones({ db, v, p, cerrado, ops }) {
  const ins = db.inscripciones.filter((x) => x.viajeId === v.id && x.estado === "inscrito");
  const sin = ins.filter((x) => !x.habitacion);
  return (
    <>
      <div className="vj-habs">
        {v.habitaciones.map((h) => {
          const dentro = ins.filter((x) => x.habitacion === h);
          const max = /Sencilla/.test(h) ? 2 : 4;
          return (
            <div key={h} className="card vj-hab">
              <b>{h}</b> <span className="hint-text">máx. {max}</span>
              {dentro.map((x) => (
                <div key={x.id} style={{ fontSize: 14, marginTop: 4 }}>
                  {nombreDe(db, x.buzoId)}
                </div>
              ))}
              {dentro.length === 0 && <div className="hint-text" style={{ marginTop: 4 }}>Vacía</div>}
            </div>
          );
        })}
      </div>
      <div className="section-title">Sin habitación ({sin.length})</div>
      <div className="card vj-lista">
        {sin.map((x) => {
          const o = v.opciones.find((y) => y.id === x.opcionId);
          return (
            <div key={x.id} className="vj-fila">
              <div className="vj-fila-main" style={{ cursor: "default" }}>
                <div className="vj-fila-nombre">{nombreDe(db, x.buzoId)}</div>
                <div className="hint-text">
                  Pidió: {o?.nombre}
                  {x.respuestas?.conQuien ? ` · viene con ${x.respuestas.conQuien}` : ""}
                </div>
              </div>
              {p.inscribir && !cerrado && (
                <select
                  className="vj-sel"
                  value=""
                  onChange={(e) =>
                    ops.cambiarIns(x, { habitacion: e.target.value }, `Habitación: ${nombreDe(db, x.buzoId)}`, "—", e.target.value)
                  }
                >
                  <option value="">Asignar…</option>
                  {v.habitaciones.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
        {sin.length === 0 && <div className="hint-text" style={{ padding: 14 }}>Todos tienen habitación.</div>}
      </div>
    </>
  );
}

// ------------------------------------------------------------- números (estimado y real)
const SUGERIDOS = ["Pago al operador", "Guías", "Embarcación / yola", "Combustible", "Comida", "Propinas", "Otro"];

export function Numeros({ db, v, cerrado, cambiarViaje }) {
  const n = numerosViaje(db, v);
  const r = resumenViaje(db, v);
  const [nuevo, setNuevo] = useState(null);
  const margen = n.cobrado ? Math.round((n.gananciaReal / n.cobrado) * 100) : 0;
  const asistieron = r.ins.filter((x) => x.rol !== "staff" && x.asistio).length;
  return (
    <>
      <div className="vj-num-top">
        <div className="card">
          <div className="hint-text">Ganancia estimada</div>
          <div className="vj-grande">{rd(n.gananciaEstimada)}</div>
          <div className="hint-text">Con los precios y costos del catálogo{n.sinCosto ? " (hay opciones sin costo puesto)" : ""}</div>
        </div>
        <div className="card">
          <div className="hint-text">Ganancia real</div>
          <div className="vj-grande" style={{ color: (v.gastos || []).length ? (n.gananciaReal >= 0 ? "var(--verde)" : "var(--rojo)") : "var(--texto-suave)" }}>
            {(v.gastos || []).length ? rd(n.gananciaReal) : "—"}
          </div>
          <div className="hint-text">{(v.gastos || []).length ? `Cobrado − gastos reales · margen ${margen}%` : "Se calcula cuando pongan los gastos reales"}</div>
        </div>
      </div>

      <div className="section-title">Estimado</div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="vj-tabla">
          <thead>
            <tr>
              <th>Opción</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Ingreso</th>
              <th>Costo operador</th>
            </tr>
          </thead>
          <tbody>
            {n.filas.map((f) => (
              <tr key={f.o.id}>
                <td>{f.o.nombre}</td>
                <td>{f.n}</td>
                <td>{precioTexto(v, f.o)}</td>
                <td>{rd(f.ingreso)}</td>
                <td>{f.costo == null ? (f.n ? "sin costo" : "—") : rd(f.costo)}</td>
              </tr>
            ))}
            {n.extras > 0 && (
              <tr>
                <td>Extras</td>
                <td></td>
                <td></td>
                <td>{rd(n.extras)}</td>
                <td>—</td>
              </tr>
            )}
            {n.costoStaff > 0 && (
              <tr>
                <td>Staff ({n.staff})</td>
                <td></td>
                <td></td>
                <td>—</td>
                <td>{rd(n.costoStaff)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="vj-dato" style={{ marginTop: 6 }}>
          <span>Ingreso estimado</span>
          <b>{rd(n.ingresoEstimado)}</b>
        </div>
        <div className="vj-dato">
          <span>Costo estimado</span>
          <b>− {rd(n.costoEstimado)}</b>
        </div>
      </div>

      <div className="section-title">Real</div>
      <div className="card">
        <div className="vj-dato">
          <span>Cobrado (pagos registrados)</span>
          <b>{rd(n.cobrado)}</b>
        </div>
        <div className="vj-dato">
          <span>De eso, conciliado</span>
          <b style={{ color: n.conciliado < n.cobrado ? "#9a5b0e" : "var(--verde)" }}>{rd(n.conciliado)}</b>
        </div>
        <div style={{ fontWeight: 800, marginTop: 12, fontSize: 14 }}>Gastos reales</div>
        {(v.gastos || []).length === 0 && <div className="hint-text">Todavía no hay gastos. Pongan lo que de verdad se pagó.</div>}
        {(v.gastos || []).map((g) => (
          <div key={g.id} className="vj-dato">
            <span>
              {g.concepto}
              {g.nota ? <span className="hint-text"> · {g.nota}</span> : ""}
            </span>
            <b>
              {rd(g.monto)}{" "}
              {!cerrado && (
                <a className="vj-quitar" onClick={() => cambiarViaje({ gastos: v.gastos.filter((y) => y.id !== g.id) }, `Quitó gasto real: ${g.concepto}`, rd(g.monto), "—")}>
                  Quitar
                </a>
              )}
            </b>
          </div>
        ))}
        {!cerrado &&
          (nuevo ? (
            <div className="vj-pagar">
              <div className="pb-chips" style={{ marginBottom: 6 }}>
                {SUGERIDOS.map((s) => (
                  <button key={s} className={`pb-chip mini${nuevo.concepto === s ? " sel" : ""}`} onClick={() => setNuevo({ ...nuevo, concepto: s, monto: s === "Pago al operador" && !nuevo.monto ? String(n.costoEstimado || "") : nuevo.monto })}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="vj-form2">
                <div>
                  <label>Concepto</label>
                  <input value={nuevo.concepto} onChange={(e) => setNuevo({ ...nuevo, concepto: e.target.value })} />
                </div>
                <div>
                  <label>Monto (RD$)</label>
                  <input inputMode="numeric" value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: soloDigitos(e.target.value) })} />
                </div>
              </div>
              <input style={{ marginTop: 6 }} value={nuevo.nota} onChange={(e) => setNuevo({ ...nuevo, nota: e.target.value })} placeholder="Nota (opcional)" />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn secondary vj-btn" onClick={() => setNuevo(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary vj-btn"
                  disabled={!nuevo.concepto.trim() || !Number(nuevo.monto)}
                  onClick={() => {
                    cambiarViaje({ gastos: [...(v.gastos || []), { id: nuevoIdLocal(), concepto: nuevo.concepto.trim(), monto: Number(nuevo.monto), nota: nuevo.nota }] }, `Gasto real: ${nuevo.concepto.trim()}`, "", rd(Number(nuevo.monto)));
                    setNuevo(null);
                  }}
                >
                  Guardar gasto
                </button>
              </div>
            </div>
          ) : (
            <button className="btn secondary vj-mini" style={{ marginTop: 8 }} onClick={() => setNuevo({ concepto: "", monto: "", nota: "" })}>
              + Agregar gasto real
            </button>
          ))}
        <hr />
        <div className="vj-dato">
          <span>Total gastos reales</span>
          <b>− {rd(n.gastosReales)}</b>
        </div>
        <div className="vj-dato" style={{ fontSize: 16 }}>
          <span>
            <b>Ganancia real</b>
          </span>
          <b style={{ color: n.gananciaReal >= 0 ? "var(--verde)" : "var(--rojo)" }}>{rd(n.gananciaReal)}</b>
        </div>
        {asistieron > 0 && (
          <div className="vj-dato">
            <span>Por buzo que asistió ({asistieron})</span>
            <b>{rd(n.gananciaReal / asistieron)}</b>
          </div>
        )}
        <div className="vj-dato">
          <span>Diferencia contra lo estimado</span>
          <b>{(v.gastos || []).length ? rd(n.gananciaReal - n.gananciaEstimada) : "—"}</b>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------- bitácora
export function BitacoraLista({ db, viajeId, mostrarViaje }) {
  const [q, setQ] = useState("");
  const lista = db.bitacora.filter((h) => (viajeId ? h.viajeId === viajeId : true)).filter((h) => !q || `${h.texto} ${h.quien} ${h.antes || ""} ${h.despues || ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <input className="vj-buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Buscar en la bitácora…" />
      <div className="card vj-lista">
        {lista.length === 0 && <div className="hint-text" style={{ padding: 14 }}>Sin movimientos.</div>}
        {lista.map((h) => {
          const v = h.viajeId ? db.viajes.find((x) => x.id === h.viajeId) : null;
          return (
            <div key={h.id} className="vj-bit">
              <div className="vj-bit-cuando">
                {fechaCorta(h.cuando.slice(0, 10))}
                <br />
                {h.cuando.slice(11)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>
                  <b>{h.quien}</b> · {h.texto}
                </div>
                {(h.antes || h.despues) && (
                  <div className="hint-text">
                    {h.antes ? <span className="vj-antes">{h.antes}</span> : null}
                    {h.antes && h.despues ? " → " : ""}
                    {h.despues ? <span className="vj-despues">{h.despues}</span> : null}
                  </div>
                )}
                {mostrarViaje && v && <div className="hint-text">{v.nombre} · {fechaCorta(v.fecha)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
