"use client";

import { useState } from "react";
import {
  fechaLarga,
  fechaCorta,
  rd,
  resumenViaje,
  numerosViaje,
  estadoViaje,
  ESTADOS_VIAJE,
  estadoPago,
  pagoEnDop,
  MES_CORTO,
  fechaObj,
  hoyISO,
  equipoViaje,
  textoEquipo,
  resumenTalla,
} from "@/lib/viajes/modelo";
import { Chip, Atras, IconoWA } from "./Piezas";
import { BitacoraLista } from "./Viaje";
import { IconPrint, IconMail, IconClipboard, IconCheck } from "@/components/icons";

export function Historial({ db, p, ir }) {
  const [tab, setTab] = useState("viajes");
  const pasados = db.viajes.filter((v) => ["cerrado", "cancelado", "realizado"].includes(estadoViaje(v))).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <>
      <h1 className="page-title">Historial</h1>
      <div className="vj-tabs">
        <button className={`vj-tab${tab === "viajes" ? " sel" : ""}`} onClick={() => setTab("viajes")}>
          Viajes pasados ({pasados.length})
        </button>
        {p.bitacora && (
          <button className={`vj-tab${tab === "mov" ? " sel" : ""}`} onClick={() => setTab("mov")}>
            Movimientos (bitácora)
          </button>
        )}
      </div>
      {tab === "viajes" && (
        <>
          <div className="hint-text" style={{ marginBottom: 8 }}>
            Cerrados, cancelados y los que ya pasaron y faltan por cerrar. Aquí también van a quedar los de los sheets viejos cuando los importemos.
          </div>
          <div className="card vj-lista">
            {pasados.map((v) => {
              const ev = estadoViaje(v);
              const r = resumenViaje(db, v);
              const n = numerosViaje(db, v);
              const d = fechaObj(v.fecha);
              return (
                <button key={v.id} className="vj-fila vj-fila-boton" onClick={() => ir(`viaje:${v.id}`)}>
                  <div className={`vj-fecha chica${ev === "cancelado" ? " gris" : ""}`}>
                    <div className="vj-fecha-d">{d.getDate()}</div>
                    <div className="vj-fecha-m">{MES_CORTO[d.getMonth()]}</div>
                  </div>
                  <div className="vj-fila-main">
                    <div className="vj-fila-nombre">{v.nombre}</div>
                    <div className="hint-text">
                      {r.asistieron ? `${r.asistieron} asistieron` : `${r.buzos.length} inscritos`}
                      {p.numeros && (v.gastos || []).length ? ` · ganancia real ${rd(n.gananciaReal)}` : ""}
                    </div>
                  </div>
                  <Chip c={ESTADOS_VIAJE[ev].c}>{ESTADOS_VIAJE[ev].t}</Chip>
                </button>
              );
            })}
          </div>
        </>
      )}
      {tab === "mov" && p.bitacora && (
        <>
          <div className="hint-text" style={{ marginBottom: 8 }}>
            Cada movimiento de todos los viajes: quién, cuándo y qué cambió (antes → después). Solo tú y los administradores.
          </div>
          <BitacoraLista db={db} mostrarViaje />
        </>
      )}
    </>
  );
}

// =====================================================================
// REPORTE DEL VIAJE
// =====================================================================
export function Reporte({ db, p, id, ir, avisar, rol, yo }) {
  const [correo, setCorreo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar() {
    setEnviando(true);
    try {
      const r = await fetch(`/api/viajes/${id}/reporte`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo enviar");
      avisar(`Reporte enviado a ${correo}`);
      setCorreo(null);
    } catch (e) {
      avisar(e.message);
    }
    setEnviando(false);
  }
  const v = db.viajes.find((x) => x.id === id);
  const r = resumenViaje(db, v);
  const n = numerosViaje(db, v);
  const ev = estadoViaje(v);
  const ins = r.ins.slice().sort((a, b) => (a.rol === "staff") - (b.rol === "staff"));
  const nombre = (x) => db.buzos.find((b) => b.id === x.buzoId)?.nombre;
  const pasado = ["realizado", "cerrado"].includes(ev);
  const conEquipo = r.ins.filter((x) => x.equipo.piezas.length).length;
  return (
    <>
      <div className="no-print">
        <Atras onClick={() => ir(`viaje:${v.id}`)}>{v.nombre}</Atras>
      </div>
      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 12px" }}>
        <button className="btn btn-primary vj-btn" onClick={() => window.print()}>
          <IconPrint size={16} /> Imprimir / Guardar PDF
        </button>
        <button className="btn secondary vj-btn" onClick={() => setCorreo(correo === null ? yo.correo || "" : null)}>
          <IconMail size={16} /> Enviar por correo
        </button>
      </div>
      {correo !== null && (
        <div className="card no-print" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input style={{ flex: 1, minWidth: 200, margin: 0 }} value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
          <button className="btn btn-primary vj-btn" disabled={enviando || !/^\S+@\S+\.\S+$/.test(correo)} onClick={enviar}>
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        </div>
      )}
      <div className="vj-reporte">
        <div className="vj-rep-head">
          <img src="/logo-gus-icon.png" alt="Gus" />
          <div>
            <div className="vj-rep-k">REPORTE DEL VIAJE</div>
            <div className="vj-rep-t">{v.nombre}</div>
            <div className="vj-rep-s">
              {fechaLarga(v.fecha)} · {v.salida}
            </div>
          </div>
        </div>
        <div className="vj-rep-body">
          <div className="vj-rep-tiles">
            <div>
              <b>{r.buzos.length}</b>
              <span>inscritos</span>
            </div>
            <div>
              <b>{pasado ? r.asistieron - r.staff.filter((x) => x.asistio).length : "—"}</b>
              <span>asistieron</span>
            </div>
            <div>
              <b>{pasado ? r.noVinieron : "—"}</b>
              <span>no vinieron</span>
            </div>
            <div>
              <b>{r.staff.length}</b>
              <span>staff</span>
            </div>
          </div>
          <div className="vj-rep-sec">Datos</div>
          <table className="vj-tabla">
            <tbody>
              <tr>
                <td>Estado</td>
                <td>{ESTADOS_VIAJE[ev].t}</td>
              </tr>
              <tr>
                <td>Operador</td>
                <td>{v.operador || "—"}</td>
              </tr>
              <tr>
                <td>Cupo</td>
                <td>
                  {v.cupoMin ? `mín. ${v.cupoMin} · ` : ""}máx. {v.cupoMax}
                </td>
              </tr>
              {v.equipo.modo === "si" && (
                <tr>
                  <td>Alquilaron equipo</td>
                  <td>{conEquipo}</td>
                </tr>
              )}
              {v.estado === "cerrado" && (
                <tr>
                  <td>Cerrado</td>
                  <td>
                    {fechaCorta(v.cerradoEl || hoyISO())} por {v.cerradoPor}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="vj-rep-sec">Participantes</div>
          <div style={{ overflowX: "auto" }}>
            <table className="vj-tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Opción</th>
                  {pasado && <th>Asistió</th>}
                  {(p.pagos || p.conciliar) && <th>Pago</th>}
                  {(p.pagos || p.conciliar) && <th>Pagado</th>}
                  {p.conciliar && <th>Conciliado</th>}
                </tr>
              </thead>
              <tbody>
                {ins.map((x, i) => {
                  const o = v.opciones.find((y) => y.id === x.opcionId);
                  const e = estadoPago(v, x);
                  const pagado = (x.pagos || []).reduce((a, pg) => a + pagoEnDop(v, pg), 0);
                  const conc = (x.pagos || []).length ? (x.pagos.every((pg) => pg.conciliado) ? "Sí" : "No") : "—";
                  return (
                    <tr key={x.id}>
                      <td>{i + 1}</td>
                      <td>{nombre(x)}</td>
                      <td>{x.rol === "staff" ? "Staff" : o?.nombre}</td>
                      {pasado && <td>{x.asistio ? "Sí" : x.asistio === false ? "No" : "—"}</td>}
                      {(p.pagos || p.conciliar) && <td>{e.t}</td>}
                      {(p.pagos || p.conciliar) && <td>{pagado ? rd(pagado) : "—"}</td>}
                      {p.conciliar && <td>{conc}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {p.numeros && (
            <>
              <div className="vj-rep-sec">Números</div>
              <table className="vj-tabla">
                <thead>
                  <tr>
                    <th></th>
                    <th>Estimado</th>
                    <th>Real</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ingresos</td>
                    <td>{rd(n.ingresoEstimado)}</td>
                    <td>{rd(n.cobrado)}</td>
                  </tr>
                  <tr>
                    <td>Gastos</td>
                    <td>{rd(n.costoEstimado)}</td>
                    <td>{(v.gastos || []).length ? rd(n.gastosReales) : "—"}</td>
                  </tr>
                  <tr style={{ fontWeight: 800 }}>
                    <td>Ganancia</td>
                    <td>{rd(n.gananciaEstimada)}</td>
                    <td>{(v.gastos || []).length ? rd(n.gananciaReal) : "—"}</td>
                  </tr>
                </tbody>
              </table>
              {(v.gastos || []).length > 0 && (
                <div className="hint-text" style={{ marginTop: 6 }}>
                  Gastos reales: {v.gastos.map((g) => `${g.concepto} ${rd(g.monto)}`).join(" · ")}
                </div>
              )}
            </>
          )}
          <div className="vj-rep-pie">
            Generado el {fechaCorta(hoyISO())} por {rol.corto} · Gus Dive Center
          </div>
        </div>
      </div>
      {!p.numeros && (
        <div className="hint-text" style={{ marginTop: 8 }}>
          Los números (ganancia) solo salen en el reporte de Pipe y Gugi.
        </div>
      )}
    </>
  );
}

// V44 -- Reporte de equipo para el operador (imprimir / guardar PDF, o
// mandarlo por WhatsApp). Uno por cada quien pone el equipo.
export function ReporteEquipo({ db, id, ir, avisar }) {
  const v = db.viajes.find((x) => x.id === id);
  const eq = equipoViaje(db, v);
  const copiar = (t) => {
    try {
      navigator.clipboard?.writeText(t).catch(() => {});
    } catch {}
    avisar("Copiado: ya lo puedes pegar en WhatsApp");
  };
  return (
    <>
      <div className="no-print">
        <Atras onClick={() => ir(`viaje:${v.id}:equipo`)}>{v.nombre}</Atras>
      </div>
      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 12px" }}>
        <button className="btn btn-primary vj-btn" onClick={() => window.print()}>
          <IconPrint size={16} /> Imprimir / Guardar PDF
        </button>
        {eq.grupos.map((g) => (
          <span key={g.prov} style={{ display: "contents" }}>
            <button className="btn secondary vj-btn" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(textoEquipo(v, g))}`, "_blank")}>
              <IconoWA on /> WhatsApp{eq.grupos.length > 1 ? ` (${g.prov})` : ""}
            </button>
            <button className="btn secondary vj-btn" onClick={() => copiar(textoEquipo(v, g))}>
              <IconClipboard size={16} /> Copiar{eq.grupos.length > 1 ? ` (${g.prov})` : ""}
            </button>
          </span>
        ))}
      </div>
      {eq.grupos.length === 0 && <div className="card hint-text">Nadie ha pedido equipo en este viaje.</div>}
      {eq.grupos.map((g) => (
        <div key={g.prov} className="vj-reporte vj-rep-equipo">
          <div className="vj-rep-head">
            <img src="/logo-gus-icon.png" alt="Gus" />
            <div>
              <div className="vj-rep-k">{g.prov === "Gus" ? "EQUIPO QUE PONE GUS" : `EQUIPO PARA ${g.prov.toUpperCase()}`}</div>
              <div className="vj-rep-t">{v.nombre}</div>
              <div className="vj-rep-s">
                {fechaLarga(v.fecha)} · {v.salida}
              </div>
            </div>
          </div>
          <div className="vj-rep-body">
            <div className="vj-rep-sec">Lo que hace falta</div>
            <table className="vj-tabla">
              <tbody>
                {g.totales.map((t) => (
                  <tr key={t.pz}>
                    <td style={{ width: "45%" }}>{t.pz}</td>
                    <td>
                      <b>{t.n}</b>
                      {resumenTalla(t) ? ` · ${resumenTalla(t)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="vj-rep-sec">Por buzo ({g.filas.length})</div>
            <div style={{ overflowX: "auto" }}>
              <table className="vj-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Buzo</th>
                    {g.totales.map((t) => (
                      <th key={t.pz}>{t.pz}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.filas.map((f, i) => (
                    <tr key={f.id}>
                      <td>{i + 1}</td>
                      <td>{f.nombre}</td>
                      {g.totales.map((t) => {
                        const pz = f.piezas.find((p) => p.pz === t.pz);
                        return (
                          <td key={t.pz} className={!pz ? "propio" : pz.falta ? "falta" : ""}>
                            {!pz ? "—" : pz.talla ? pz.talla : pz.falta ? "por confirmar" : <IconCheck size={14} />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="vj-rep-pie">Gus Dive Center · {fechaCorta(hoyISO())}</div>
          </div>
        </div>
      ))}
    </>
  );
}
