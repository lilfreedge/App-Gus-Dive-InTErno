"use client";

import { useState } from "react";
import { Atras } from "@/components/viajes/Piezas";
import { IconoWA, CampoCel } from "@/components/viajes/Piezas";
import { IconCheck, IconEdit, IconCamera, IconEye } from "@/components/icons";
import {
  PASOS,
  ESTADOS_PASO,
  EXAMEN,
  ESCUELAS,
  FORMAS_PAGO,
  ETAPAS,
  NOTAS_RAPIDAS,
  pasosDe,
  pasosIniciales,
  pagado,
  debe,
  pagoListo,
  faltaDe,
  listoParaAlmacen,
  nombreExamen,
  nombreEtapa,
  mensajeCertificacion,
  linkWhatsApp,
  rd,
  hoyISO,
  fechaCorta,
  fechaDeIso,
  edad,
  soloDigitos,
} from "@/lib/estudiantes/modelo";
import { formatoCel, formatoCedula } from "@/lib/viajes/modelo";
import { cursoDe, buzoDe } from "./Inicio";
import { nuevoId } from "@/lib/estudiantes/datos";

// La ficha del estudiante: el mismo camino del sheet, de izquierda a
// derecha. Cada paso guarda solo quién lo hizo y cuándo ("ya no hay que
// escribir fechas a mano").

const NIVELES = ["Open Water Diver", "OWD + Nitrox", "Advanced OWD", "Rescue Diver", "Divemaster", "Instructor Course", "Freediving"];
const cuando = (s) => (s?.en ? `${fechaDeIso(s.en)}${s.por ? ` · ${s.por}` : ""}` : "");

function Hecho({ titulo, sello, extra }) {
  return (
    <div className="ce-dato">
      <span>{titulo}</span>
      <span>
        {cuando(sello)}
        {extra ? ` · ${extra}` : ""}
      </span>
    </div>
  );
}

export function Ficha({ db, p, yo, ops, ir, avisar, id }) {
  const est = db.estudiantes.find((x) => x.id === id);
  const b = buzoDe(db, est);
  const c = cursoDe(db, est);
  const [editDatos, setEditDatos] = useState(false);
  const [editCurso, setEditCurso] = useState(false);
  const [pago, setPago] = useState(null);
  const [precio, setPrecio] = useState(est.precio == null ? "" : String(est.precio));
  const [nota, setNota] = useState("");
  const [cert, setCert] = useState(est.numeroCert || "");
  const [borrar, setBorrar] = useState(null);
  const [subiendo, setSubiendo] = useState("");

  const cambiar = (cambios, texto, antes, despues) => ops.cambiarEst(est, cambios, `${texto}: ${b.nombre}`, antes, despues);
  const etapas = est.etapas || {};
  const sello = ops.sello();
  const falta = faltaDe(est, c);
  const idx = est.estado === "cancelado" ? -1 : ETAPAS.findIndex((e) => e.k === est.estado);
  const puedeAlgo = p.estudiantes || p.almacen || p.entregar;

  function marcarPaso(k, v) {
    const antes = (est.pasos || {})[k] || "pendiente";
    if (antes === v) return;
    cambiar({ pasos: { ...est.pasos, [k]: v } }, PASOS.find((x) => x.k === k)?.t || k, ESTADOS_PASO.find((x) => x.v === antes)?.t, ESTADOS_PASO.find((x) => x.v === v)?.t);
  }
  function agregarNota(t) {
    const texto = String(t || "").trim();
    if (!texto) return;
    cambiar({ seguimiento: [{ texto, por: yo.corto, en: new Date().toISOString() }, ...(est.seguimiento || [])] }, "Nota de seguimiento", null, texto);
    setNota("");
  }
  function guardarPago() {
    const monto = Number(String(pago.monto).replace(/[^\d.]/g, ""));
    if (!monto) return avisar("Escribe cuánto pagó.");
    const pg = { id: nuevoId(), fecha: pago.fecha || hoyISO(), monto, forma: pago.forma, nota: pago.nota || "", por: yo.corto, conciliado: false };
    const pagos = [...(est.pagos || []), pg];
    const nuevoDebe = est.precio == null ? null : Math.max(0, Number(est.precio) - pagos.reduce((a, x) => a + Number(x.monto || 0), 0));
    cambiar({ pagos }, `Pago de ${rd(monto)} (${pg.forma})`, null, nuevoDebe == null ? rd(monto) : `Debe ${rd(nuevoDebe)}`);
    setPago(null);
  }
  async function subir(e, tipo) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setSubiendo(tipo);
    const ruta = await ops.subirArchivo(est, f, tipo);
    setSubiendo("");
    if (!ruta) return;
    if (tipo === "comprobante") {
      cambiar({ comprobantes: [...(est.comprobantes || []), { ruta, nombre: f.name, en: new Date().toISOString(), via: "app", por: yo.corto }] }, "Subió un comprobante", null, f.name);
    } else {
      await ops.cambiarBuzo(b, tipo === "foto" ? { foto: ruta } : { docFoto: ruta }, `Subió ${tipo === "foto" ? "la foto" : "la cédula"}: ${b.nombre}`);
      if (((est.pasos || {})[tipo === "foto" ? "foto" : "identificacion"] || "pendiente") === "pendiente") marcarPaso(tipo === "foto" ? "foto" : "identificacion", "listo");
    }
  }
  function avisarWA() {
    window.open(linkWhatsApp(b.cel, mensajeCertificacion(est, b)), "_blank", "noopener");
    if (est.estado === "certificacion") cambiar({ estado: "avisado", etapas: { ...etapas, avisado: sello } }, "Le avisó por WhatsApp que su certificación está lista");
  }

  return (
    <>
      <Atras onClick={() => ir("estudiantes")}>Estudiantes</Atras>
      <h1 className="page-title" style={{ margin: "4px 0 2px" }}>
        {b.nombre}
      </h1>
      <div className="hint-text" style={{ fontSize: 14 }}>
        {[est.curso, est.escuela, est.instructor, est.fechaInicio ? `${est.fechaInicio > hoyISO() ? "empieza" : "empezó"} el ${fechaCorta(est.fechaInicio)}` : ""].filter(Boolean).join(" · ")}
        {est.via === "link" ? " · se registró por el link" : ""}
      </div>

      {est.estado === "cancelado" ? (
        <div className="aviso-box" style={{ marginTop: 10 }}>
          Este curso está cancelado.{" "}
          {p.estudiantes && (
            <button className="btn secondary vj-mini" onClick={() => cambiar({ estado: "curso" }, "Reabrió el curso", "Cancelado", "En curso")}>
              Reabrir
            </button>
          )}
        </div>
      ) : (
        <div className="ce-pasos">
          {ETAPAS.map((e, i) => (
            <div key={e.k} className={`ce-paso${i < idx ? " ok" : i === idx ? " ya" : ""}`}>
              <i>{i < idx ? <IconCheck size={13} /> : i + 1}</i>
              {e.t}
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------- 1. El curso */}
      <div className="ce-etapa">
        <h4>
          1. El curso
          <span className="ce-chip curso">
            {pasosDe(est, c).filter((x) => ["listo", "na"].includes((est.pasos || {})[x.k])).length} de {pasosDe(est, c).length} listos
          </span>
        </h4>
        {pasosDe(est, c).map((x) => {
          const v = (est.pasos || {})[x.k] || "pendiente";
          return (
            <div key={x.k} className="ce-ck">
              <span>
                {x.t}
                {/* "56. si, es posible que firme virtual?": la firma que hizo en el link. */}
                {x.k === "record" && est.firma && (
                  <button className="ce-firmo" onClick={() => ops.verArchivo(est.firma)}>
                    Firmó en el link · ver
                  </button>
                )}
              </span>
              <span className="ce-seg">
                {ESTADOS_PASO.map((o) => (
                  <button key={o.v} type="button" disabled={!p.estudiantes || est.estado !== "curso"} className={v === o.v ? o.v : ""} onClick={() => marcarPaso(x.k, o.v)}>
                    {o.t}
                  </button>
                ))}
              </span>
            </div>
          );
        })}
        <div className="ce-ck">
          Pago
          {pagoListo(est) ? <span className="ce-chip ok">Pagado</span> : est.precio == null ? <span className="ce-chip alm">Falta el precio</span> : <span className="ce-chip rojo">Debe {rd(debe(est))}</span>}
        </div>
        {c?.llevaExamen !== false && (
          <div className="ce-ck">
            Examen
            <select value={est.examen} disabled={!p.estudiantes || est.estado !== "curso"} onChange={(e) => cambiar({ examen: e.target.value }, "Examen", nombreExamen(est.examen), nombreExamen(e.target.value))}>
              {EXAMEN.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.t}
                </option>
              ))}
            </select>
          </div>
        )}
        {est.estado === "curso" && p.estudiantes && (
          <>
            <button
              className="btn btn-primary vj-btn"
              style={{ marginTop: 10 }}
              disabled={!listoParaAlmacen(est, c)}
              onClick={() => cambiar({ estado: "almacen", etapas: { ...etapas, mandado: sello } }, "Lo mandó al almacén", "En curso", "Almacén")}
            >
              Mandar al almacén
            </button>
            <div className="hint-text" style={{ marginTop: 6 }}>
              {falta.length ? `Falta: ${falta.join(", ")}.` : "Está todo listo."}
            </div>
          </>
        )}
        {etapas.mandado && <Hecho titulo="Mandado al almacén" sello={etapas.mandado} />}
      </div>

      {/* ---------------------------------------------------- Pago */}
      <div className="ce-etapa">
        <h4>
          Pago del curso
          {/* "57. es fijo pero hay veces que ... damos precios especiales". */}
          {c?.precio != null && est.precio != null && Number(est.precio) !== Number(c.precio) && <span className="ce-chip alm">Precio especial · normal {rd(c.precio)}</span>}
        </h4>
        <div className="ce-pago-top">
          <div>
            <b>{est.precio == null ? "—" : rd(est.precio)}</b>
            <span>Precio</span>
          </div>
          <div>
            <b>{rd(pagado(est))}</b>
            <span>Pagado</span>
          </div>
          <div className={debe(est) > 0 ? "debe" : ""}>
            <b>{debe(est) == null ? "—" : rd(debe(est))}</b>
            <span>Debe</span>
          </div>
        </div>
        {p.pagos && (
          <div className="ce-ck">
            Precio del curso
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input className="ce-input-corto" inputMode="numeric" value={precio} placeholder="RD$" onChange={(e) => setPrecio(e.target.value.replace(/[^\d.]/g, ""))} />
              {String(est.precio ?? "") !== precio && (
                <button className="btn secondary vj-mini" onClick={() => cambiar({ precio: precio === "" ? null : Number(precio) }, "Precio del curso", est.precio == null ? "—" : rd(est.precio), precio === "" ? "—" : rd(Number(precio)))}>
                  Guardar
                </button>
              )}
            </span>
          </div>
        )}
        {(est.pagos || []).map((x) => (
          <div key={x.id} className="ce-dato">
            <span>
              {fechaCorta(x.fecha)} · {x.forma}
              {x.nota ? ` · ${x.nota}` : ""} · {x.por}
            </span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {rd(x.monto)}
              {p.conciliar ? (
                <button
                  className={`ce-concilia${x.conciliado ? " si" : ""}`}
                  title={x.conciliado ? "Confirmado" : "Marcar como confirmado"}
                  onClick={() => cambiar({ pagos: est.pagos.map((y) => (y.id === x.id ? { ...y, conciliado: !y.conciliado } : y)) }, x.conciliado ? "Quitó la confirmación de un pago" : "Confirmó un pago", null, rd(x.monto))}
                >
                  <IconCheck size={13} />
                </button>
              ) : (
                x.conciliado && <IconCheck size={13} />
              )}
            </span>
          </div>
        ))}
        {(est.comprobantes || []).length > 0 && (
          <div className="ce-docs">
            {est.comprobantes.map((x) => (
              <button key={x.ruta} className="ce-doc ok" onClick={() => ops.verArchivo(x.ruta)}>
                <IconEye size={15} /> Comprobante {fechaDeIso(x.en)}
                {x.via === "link" ? " (del link)" : ""}
              </button>
            ))}
          </div>
        )}
        {p.pagos &&
          (pago ? (
            <div className="ce-form">
              <div className="ce-form-fila">
                <label>
                  Monto (RD$)
                  <input inputMode="numeric" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} autoFocus />
                </label>
                <label>
                  Fecha
                  <input type="date" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} />
                </label>
              </div>
              <label>
                Forma de pago
                <select value={pago.forma} onChange={(e) => setPago({ ...pago, forma: e.target.value })}>
                  {FORMAS_PAGO.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <label>
                Nota (opcional)
                <input value={pago.nota} onChange={(e) => setPago({ ...pago, nota: e.target.value })} placeholder="Ej. abono, facturado a nombre de…" />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary vj-btn" onClick={guardarPago}>
                  Guardar pago
                </button>
                <button className="btn secondary vj-btn" onClick={() => setPago(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="btn btn-primary vj-btn" onClick={() => setPago({ monto: "", fecha: hoyISO(), forma: "Transferencia", nota: "" })}>
                + Registrar pago
              </button>
              <label className="btn secondary vj-btn" style={{ cursor: "pointer" }}>
                {subiendo === "comprobante" ? "Subiendo…" : "Subir comprobante"}
                <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => subir(e, "comprobante")} />
              </label>
            </div>
          ))}
      </div>

      {/* ---------------------------------------------------- 2. Almacén */}
      <div className={`ce-etapa${idx < 1 ? " gris" : ""}`}>
        <h4>
          2. Almacén {idx > 1 && <IconCheck size={16} />}
        </h4>
        {idx < 1 ? (
          <div className="hint-text">Recibido · Subido al Drive · Procesado (No. de certificación)</div>
        ) : (
          <>
            {etapas.recibido ? (
              <Hecho titulo="Recibido en almacén" sello={etapas.recibido} />
            ) : (
              p.almacen && (
                <button className="btn btn-primary vj-btn" onClick={() => cambiar({ etapas: { ...etapas, recibido: sello } }, "El almacén lo recibió")}>
                  Lo recibí
                </button>
              )
            )}
            {etapas.recibido &&
              (etapas.drive ? (
                <Hecho titulo="Subido al Drive" sello={etapas.drive} />
              ) : (
                p.almacen && (
                  <button className="btn secondary vj-btn" style={{ marginTop: 8 }} onClick={() => cambiar({ etapas: { ...etapas, drive: sello } }, "Lo subió al Drive")}>
                    Lo subí al Drive
                  </button>
                )
              ))}
            {etapas.drive &&
              (etapas.procesado ? (
                <Hecho titulo="Procesado" sello={etapas.procesado} extra={est.numeroCert ? `No. ${est.numeroCert}` : ""} />
              ) : (
                p.almacen && (
                  <div className="ce-ck">
                    No. de certificación
                    <span style={{ display: "flex", gap: 6 }}>
                      <input className="ce-input-corto" style={{ width: 150 }} value={cert} onChange={(e) => setCert(e.target.value.toUpperCase())} placeholder="OWD2139…" />
                      <button
                        className="btn btn-primary vj-mini"
                        disabled={!cert.trim()}
                        onClick={async () => {
                          await cambiar({ numeroCert: cert.trim(), etapas: { ...etapas, procesado: sello } }, "Lo procesó", null, `No. ${cert.trim()}`);
                          // "53. si y viceversa": su nivel en Buceos se pone solo.
                          await ops.cambiarBuzo(b, { agencia: est.escuela || b.agencia, cert: cert.trim(), ...(NIVELES.includes(est.curso) ? { nivel: est.curso } : {}) });
                        }}
                      >
                        Procesado
                      </button>
                    </span>
                  </div>
                )
              ))}
            {etapas.procesado && est.estado === "almacen" && p.almacen && (
              <button className="btn btn-primary vj-btn" style={{ marginTop: 8 }} onClick={() => cambiar({ estado: "certificacion", etapas: { ...etapas, cert: sello } }, "Llegó la certificación", "Almacén", "Certificación")}>
                Llegó la certificación
              </button>
            )}
          </>
        )}
      </div>

      {/* ---------------------------------------------------- 3-5 */}
      <div className={`ce-etapa${idx < 2 ? " gris" : ""}`}>
        <h4>3. Certificación {idx > 2 && <IconCheck size={16} />}</h4>
        {etapas.cert ? <Hecho titulo="Llegó la certificación" sello={etapas.cert} /> : <div className="hint-text">Cuando llegue, el almacén la marca aquí.</div>}
      </div>
      <div className={`ce-etapa${idx < 2 ? " gris" : ""}`}>
        <h4>4–5. Avisarle y entregarla {idx > 3 && <IconCheck size={16} />}</h4>
        {idx >= 2 && p.entregar && b.cel && (
          <>
            <button className="btn vj-btn ce-wa" onClick={avisarWA}>
              <IconoWA on /> {etapas.avisado ? "Volver a avisar por WhatsApp" : "Avisar por WhatsApp"}
            </button>
            {!etapas.avisado && <div className="hint-text" style={{ marginTop: 6 }}>Abre WhatsApp con el mensaje listo y queda guardado quién avisó y cuándo.</div>}
          </>
        )}
        {idx >= 2 && !b.cel && <div className="hint-text">No tiene celular guardado. Ponlo en Sus datos.</div>}
        {etapas.avisado && <Hecho titulo="Le avisaron" sello={etapas.avisado} />}
        {est.estado === "avisado" && p.entregar && (
          <button className="btn btn-primary vj-btn" style={{ marginTop: 8 }} onClick={() => cambiar({ estado: "entregada", etapas: { ...etapas, entregada: sello } }, "La recogió", "Avisado", "Entregada")}>
            La recogió
          </button>
        )}
        {etapas.entregada && <Hecho titulo="La recogió" sello={etapas.entregada} />}
        {idx < 2 && <div className="hint-text">Avisar por WhatsApp · La recogió</div>}
      </div>

      {/* ---------------------------------------------------- Pago instructor */}
      <div className="ce-etapa">
        <h4>Pago al instructor</h4>
        <div className="ce-dato">
          <span>Instructor</span>
          <span>{est.instructor || "—"}</span>
        </div>
        {etapas.pago_instructor ? (
          <Hecho titulo="Pagado" sello={etapas.pago_instructor} />
        ) : (
          p.pago_instructor && (
            <button className="btn secondary vj-btn" style={{ marginTop: 8 }} onClick={() => cambiar({ etapas: { ...etapas, pago_instructor: sello } }, `Pagó al instructor${est.instructor ? ` (${est.instructor})` : ""}`)}>
              Marcar pagado
            </button>
          )
        )}
      </div>

      {/* ---------------------------------------------------- Seguimiento */}
      <div className="ce-etapa">
        <h4>Seguimiento</h4>
        {(est.seguimiento || []).map((x, i) => (
          <div key={i} className="ce-nota">
            {x.texto}
            <small>
              {x.por} · {fechaDeIso(x.en)}
            </small>
          </div>
        ))}
        {puedeAlgo && (
          <>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input className="ce-input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Escribir una nota…" onKeyDown={(e) => e.key === "Enter" && agregarNota(nota)} />
              <button className="btn secondary vj-mini" onClick={() => agregarNota(nota)} disabled={!nota.trim()}>
                Guardar
              </button>
            </div>
            <div className="ce-rapidos">
              {NOTAS_RAPIDAS.map((t) => (
                <button key={t} onClick={() => agregarNota(t)}>
                  {t}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---------------------------------------------------- Sus datos */}
      <div className="ce-etapa">
        <h4>
          Sus datos
          {p.estudiantes && !editDatos && (
            <button className="btn secondary vj-mini" onClick={() => setEditDatos(true)}>
              <IconEdit size={14} /> Editar
            </button>
          )}
        </h4>
        {editDatos ? (
          <EditarDatos b={b} ops={ops} cerrar={() => setEditDatos(false)} />
        ) : (
          <>
            <div className="ce-dato">
              <span>Celular</span>
              <span>{b.cel ? formatoCel(b.cel) : "—"}</span>
            </div>
            <div className="ce-dato">
              <span>Correo</span>
              <span>{b.correo || "—"}</span>
            </div>
            <div className="ce-dato">
              <span>{b.pasaporte && !b.doc ? "Pasaporte" : "Cédula"}</span>
              <span>{b.doc || b.pasaporte || "—"}</span>
            </div>
            <div className="ce-dato">
              <span>Nació</span>
              <span>{b.nac ? `${fechaCorta(b.nac)} de ${b.nac.slice(0, 4)} (${edad(b.nac)} años)` : "—"}</span>
            </div>
            <div className="ce-dato">
              <span>Dirección</span>
              <span>{b.direccion || "—"}</span>
            </div>
            <div className="ce-dato">
              <span>Emergencia</span>
              <span>{b.emergencia || "—"}</span>
            </div>
            <div className="ce-dato">
              <span>Buceos antes del curso</span>
              <span>{est.buceosPrevios ?? "—"}</span>
            </div>
          </>
        )}
        <div className="ce-docs">
          {[
            { k: "foto", t: "Foto", ruta: b.foto },
            { k: "cedula", t: "Cédula", ruta: b.docFoto },
          ].map((d) =>
            d.ruta ? (
              <button key={d.k} className="ce-doc ok" onClick={() => ops.verArchivo(d.ruta)}>
                <IconEye size={15} /> {d.t}
              </button>
            ) : p.estudiantes ? (
              <label key={d.k} className="ce-doc" style={{ cursor: "pointer" }}>
                <IconCamera size={15} /> {subiendo === d.k ? "Subiendo…" : `Subir ${d.t.toLowerCase()}`}
                <input type="file" accept="image/*" hidden onChange={(e) => subir(e, d.k)} />
              </label>
            ) : (
              <span key={d.k} className="ce-doc">
                Sin {d.t.toLowerCase()}
              </span>
            )
          )}
          {est.firma && (
            <button className="ce-doc ok" onClick={() => ops.verArchivo(est.firma)}>
              <IconEye size={15} /> Firma
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- El curso (datos) */}
      <div className="ce-etapa">
        <h4>
          Datos del curso
          {p.estudiantes && !editCurso && est.estado === "curso" && (
            <button className="btn secondary vj-mini" onClick={() => setEditCurso(true)}>
              <IconEdit size={14} /> Editar
            </button>
          )}
        </h4>
        {editCurso ? (
          <EditarCurso db={db} est={est} cambiar={cambiar} cerrar={() => setEditCurso(false)} />
        ) : (
          <>
            <div className="ce-dato">
              <span>Curso</span>
              <span>{est.curso}</span>
            </div>
            <div className="ce-dato">
              <span>Escuela</span>
              <span>{est.escuela || "—"}</span>
            </div>
            <div className="ce-dato">
              <span>Instructor</span>
              <span>{est.instructor || "—"}</span>
            </div>
            <div className="ce-dato">
              <span>Fecha de inicio</span>
              <span>{est.fechaInicio ? fechaCorta(est.fechaInicio) : "—"}</span>
            </div>
          </>
        )}
      </div>

      {/* ---------------------------------------------------- Cancelar / borrar */}
      {p.estudiantes && est.estado === "curso" && (
        <button className="btn secondary vj-mini" style={{ marginTop: 12 }} onClick={() => cambiar({ estado: "cancelado" }, "Canceló el curso", "En curso", "Cancelado")}>
          Cancelar este curso
        </button>
      )}
      {yo.esTitular && (
        <div className="vj-borrar" style={{ marginTop: 14 }}>
          {borrar ? (
            <>
              <b>Borrar este estudiante</b>
              <div className="hint-text">Se borra este curso con sus pagos y su seguimiento. La persona se queda en Buzos. Queda en la bitácora.</div>
              <input className="ce-input" placeholder="Motivo" value={borrar.motivo} onChange={(e) => setBorrar({ ...borrar, motivo: e.target.value })} />
              <input className="ce-input" placeholder="Escribe BORRAR" value={borrar.conf} onChange={(e) => setBorrar({ ...borrar, conf: e.target.value })} style={{ marginTop: 6 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="btn vj-btn vj-rojo"
                  disabled={!borrar.motivo.trim() || borrar.conf.trim().toUpperCase() !== "BORRAR"}
                  onClick={async () => (await ops.borrarEst(est, borrar.motivo.trim(), b.nombre)) && (avisar("Estudiante borrado"), ir("estudiantes"))}
                >
                  Borrar
                </button>
                <button className="btn secondary vj-btn" onClick={() => setBorrar(null)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <button className="btn secondary vj-mini vj-rojo-txt" onClick={() => setBorrar({ motivo: "", conf: "" })}>
              Borrar este estudiante…
            </button>
          )}
        </div>
      )}

      <div className="section-title">Bitácora de este estudiante</div>
      <div className="card" style={{ padding: "4px 14px" }}>
        {db.bitacora
          .filter((x) => x.estudianteId === est.id)
          .slice(0, 30)
          .map((x) => (
            <div key={x.id} className="ce-nota">
              {x.texto}
              {(x.antes || x.despues) && (
                <div className="hint-text" style={{ margin: 0 }}>
                  {x.antes || "—"} → {x.despues || "—"}
                </div>
              )}
              <small>
                {x.quien} · {fechaDeIso(x.cuando)}
              </small>
            </div>
          ))}
        {!db.bitacora.some((x) => x.estudianteId === est.id) && <div className="hint-text" style={{ padding: "10px 0" }}>Nada todavía.</div>}
      </div>
    </>
  );
}

function EditarDatos({ b, ops, cerrar }) {
  const [f, setF] = useState({ nombre: b.nombre, doc: b.doc, pasaporte: b.pasaporte, cel: b.cel ? formatoCel(b.cel) : "", correo: b.correo, nac: b.nac, direccion: b.direccion, emergencia: b.emergencia });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function guardar() {
    if (!f.nombre.trim()) return;
    const cambios = { ...f, nombre: f.nombre.trim(), doc: f.doc ? formatoCedula(f.doc) : "", cel: soloDigitos(f.cel) };
    await ops.cambiarBuzo(b, cambios, `Editó los datos de ${f.nombre.trim()}`);
    cerrar();
  }
  return (
    <div className="ce-form">
      <label>
        Nombre completo
        <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
      </label>
      <div className="ce-form-fila">
        <label>
          Cédula
          <input value={f.doc} onChange={(e) => set("doc", e.target.value)} placeholder="000-0000000-0" />
        </label>
        <label>
          Pasaporte
          <input value={f.pasaporte} onChange={(e) => set("pasaporte", e.target.value)} />
        </label>
      </div>
      <div className="ce-form-fila">
        <label>
          Celular
          <CampoCel value={f.cel} onChange={(v) => set("cel", v)} />
        </label>
        <label>
          Fecha de nacimiento
          <input type="date" value={f.nac} onChange={(e) => set("nac", e.target.value)} />
        </label>
      </div>
      <label>
        Correo
        <input value={f.correo} onChange={(e) => set("correo", e.target.value)} />
      </label>
      <label>
        Dirección
        <input value={f.direccion} onChange={(e) => set("direccion", e.target.value)} />
      </label>
      <label>
        Contacto de emergencia
        <input value={f.emergencia} onChange={(e) => set("emergencia", e.target.value)} placeholder="Nombre, celular y qué es suyo" />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary vj-btn" onClick={guardar}>
          Guardar
        </button>
        <button className="btn secondary vj-btn" onClick={cerrar}>
          Cancelar
        </button>
      </div>
      <div className="hint-text">Estos datos son los mismos que salen en Buzos de Buceos.</div>
    </div>
  );
}

function EditarCurso({ db, est, cambiar, cerrar }) {
  const [f, setF] = useState({ cursoId: est.cursoId || "", escuela: est.escuela, instructor: est.instructor, fechaInicio: est.fechaInicio });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const curso = db.cursos.find((c) => c.id === f.cursoId);
  function guardar() {
    const cambios = { escuela: f.escuela, instructor: f.instructor, fechaInicio: f.fechaInicio };
    if (curso && curso.id !== est.cursoId) {
      // Al cambiar de curso, los pasos que ya estaban listos se quedan.
      const nuevos = pasosIniciales(curso);
      for (const k of Object.keys(nuevos)) if (nuevos[k] === "pendiente" && ["listo", "na"].includes((est.pasos || {})[k])) nuevos[k] = est.pasos[k];
      Object.assign(cambios, { cursoId: curso.id, curso: curso.nombre, pasos: nuevos, precio: est.precio ?? curso.precio });
    }
    cambiar(cambios, "Editó los datos del curso", est.curso, curso?.nombre || est.curso);
    cerrar();
  }
  return (
    <div className="ce-form">
      <label>
        Curso
        <select value={f.cursoId} onChange={(e) => set("cursoId", e.target.value)}>
          {!f.cursoId && <option value="">{est.curso}</option>}
          {db.cursos
            .filter((c) => c.activo || c.id === est.cursoId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
        </select>
      </label>
      <div className="ce-form-fila">
        <label>
          Escuela
          <select value={f.escuela} onChange={(e) => set("escuela", e.target.value)}>
            <option value="">—</option>
            {ESCUELAS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Fecha de inicio
          <input type="date" value={f.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)} />
        </label>
      </div>
      <label>
        Instructor
        <select value={f.instructor} onChange={(e) => set("instructor", e.target.value)}>
          <option value="">—</option>
          {db.instructores
            .filter((i) => i.activo || i.nombre === est.instructor)
            .map((i) => (
              <option key={i.id}>{i.nombre}</option>
            ))}
        </select>
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary vj-btn" onClick={guardar}>
          Guardar
        </button>
        <button className="btn secondary vj-btn" onClick={cerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
