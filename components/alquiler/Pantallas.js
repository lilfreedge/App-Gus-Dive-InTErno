"use client";

import { useMemo, useState } from "react";
import { Buscar, CampoCel } from "@/components/viajes/Piezas";
import { IconPlus, IconHistory, IconEdit, IconReport, IconChart, IconCatalog } from "@/components/icons";
import { soloDigitos, formatoCedula, formatoCel } from "@/lib/viajes/modelo";
import {
  TIPOS,
  tipoDe,
  prefijoDe,
  normalizarCodigo,
  rd,
  hoyISO,
  esLunes,
  devolverDe,
  fechaLarga,
  fechaCorta,
  moraDe,
  moraTotal,
  cargosDe,
  cargosTotal,
  totalDe,
  estadoDe,
  NOMBRE_ESTADO,
  sinFactura,
  DIAS_NORMAL,
  precioDe,
  nombreMes,
} from "@/lib/alquiler/modelo";

// Pantallas del app Alquiler (maqueta-v57, pestañas 7, 8 y 9, con los
// cambios de "127").

const nombreDe = (db, a) => db.buzos.find((b) => b.id === a.buzoId)?.nombre || "—";
// Los equipos que están afuera ahora mismo (por código).
function afueraPorCodigo(db) {
  const m = {};
  for (const a of db.alquileres) for (const x of a.items) if (!x.devueltoEn) m[x.codigo.toUpperCase()] = a;
  return m;
}

// V61: la mora ya cobrada (de lo devuelto) sin su número de factura.
const moraDevuelta = (a) => a.items.filter((x) => x.devueltoEn).reduce((t, x) => t + Number(x.mora || 0), 0);
const faltaFacturaMora = (a) => moraDevuelta(a) > 0 && !String(a.facturaMora || "").trim();
// V62 ("233"): los cargos por problemas sin su número de factura.
const faltaFacturaCargos = (a) => cargosTotal(a) > 0 && !String(a.facturaCargos || "").trim();

function FilaAlquiler({ db, a, ir }) {
  const hoy = hoyISO();
  const est = estadoDe(a, hoy);
  const mora = moraTotal(a, hoy);
  return (
    <button type="button" className="alq-fila" onClick={() => ir(`ver:${a.id}`)}>
      <span className="alq-fila-top">
        <b>{nombreDe(db, a)}</b>
        <span className={`alq-estado ${est}`}>{est === "devuelto" ? "Devuelto" : est === "atrasado" ? `Atrasado · mora ${rd(mora)}` : `Devuelve el ${fechaCorta(a.devolver)}`}</span>
      </span>
      <span className="hint-text" style={{ margin: 0, display: "block" }}>
        No. {a.numero} · {a.items.map((x) => x.codigo).join(", ")} · {a.dias === 6 ? "Doble" : "Normal"} · {rd(totalDe(a))}
        {String(a.factura || "").trim() ? ` · Factura ${a.factura}` : ""}
      </span>
      {a.estudiante && <span className="alq-estudiante">Estudiante {a.estudiante}</span>}
      {sinFactura(a) && !a.estudiante && <span className="alq-falta">Falta el número de factura</span>}
      {faltaFacturaMora(a) && <span className="alq-falta">Falta la factura de la mora</span>}
      {faltaFacturaCargos(a) && <span className="alq-falta">Falta la factura de los cargos</span>}
      {est === "parcial" && <span className="hint-text" style={{ margin: 0, display: "block" }}>Devolvió una parte</span>}
    </button>
  );
}

// ----------------------------------------------------------------- Inicio
export function Inicio({ db, ir }) {
  const hoy = hoyISO();
  const abiertos = db.alquileres.filter((a) => estadoDe(a, hoy) !== "devuelto");
  const atrasados = abiertos.filter((a) => estadoDe(a, hoy) === "atrasado");
  const sinFact = db.alquileres.filter(sinFactura);
  const hoyDevuelven = abiertos.filter((a) => a.devolver === hoy);
  const moraAcum = atrasados.reduce((s, a) => s + moraTotal(a, hoy), 0);
  return (
    <>
      <h1 className="page-title">Alquiler</h1>
      {/* "127": "que aparezca una notificación alante diciendo que hace falta
          número de factura", como en los otros apps. */}
      {sinFact.length > 0 && (
        <button type="button" className="alq-aviso" onClick={() => ir("alquiler:sin-factura")}>
          {sinFact.length} alquiler{sinFact.length === 1 ? "" : "es"} sin número de factura ›
        </button>
      )}
      {atrasados.length > 0 && (
        <button type="button" className="alq-aviso rojo" onClick={() => ir("alquiler:atrasados")}>
          {atrasados.length} atrasado{atrasados.length === 1 ? "" : "s"} · mora acumulada {rd(moraAcum)} ›
        </button>
      )}
      <div className="alq-cuadros">
        <button type="button" className="alq-cuadro" onClick={() => ir("alquiler:afuera")}>
          <b>{abiertos.length}</b>
          <span>Afuera</span>
        </button>
        <button type="button" className="alq-cuadro" onClick={() => ir("alquiler:hoy")}>
          <b>{hoyDevuelven.length}</b>
          <span>Devuelven hoy</span>
        </button>
        <button type="button" className="alq-cuadro" onClick={() => ir("alquiler:atrasados")}>
          <b className={atrasados.length ? "rojo" : ""}>{atrasados.length}</b>
          <span>Atrasados</span>
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <button className="btn btn-primary vj-btn" onClick={() => ir("nuevo")}>
          <IconPlus size={16} /> Nuevo alquiler
        </button>
        <button className="btn secondary vj-btn" onClick={() => ir("retornos")}>
          Retorno
        </button>
      </div>
      <div className="section-title">Últimos alquileres</div>
      {db.alquileres.slice(0, 8).map((a) => (
        <FilaAlquiler key={a.id} db={db} a={a} ir={ir} />
      ))}
      {!db.alquileres.length && <div className="card hint-text">Todavía no hay alquileres.</div>}
    </>
  );
}

// ----------------------------------------------------------------- Alquiler (lista)
const FILTROS = [
  { k: "afuera", t: "Afuera", f: (a, h) => estadoDe(a, h) !== "devuelto" },
  { k: "atrasados", t: "Atrasados", f: (a, h) => estadoDe(a, h) === "atrasado" },
  { k: "hoy", t: "Devuelven hoy", f: (a, h) => estadoDe(a, h) !== "devuelto" && a.devolver === h },
  { k: "sin-factura", t: "Sin factura", f: (a) => sinFactura(a) },
  { k: "devueltos", t: "Devueltos", f: (a, h) => estadoDe(a, h) === "devuelto" },
  { k: "todos", t: "Todos", f: () => true },
];
export function Lista({ db, ir, filtroInicial }) {
  const [filtro, setFiltro] = useState(FILTROS.some((f) => f.k === filtroInicial) ? filtroInicial : "afuera");
  const [q, setQ] = useState("");
  const hoy = hoyISO();
  const t = q.trim().toLowerCase();
  const td = soloDigitos(q);
  const fx = FILTROS.find((f) => f.k === filtro);
  const lista = db.alquileres.filter((a) => {
    if (t) {
      const b = db.buzos.find((x) => x.id === a.buzoId) || {};
      return (
        (b.nombre || "").toLowerCase().includes(t) ||
        (td.length >= 4 && (soloDigitos(b.cel).includes(td) || soloDigitos(b.doc).includes(td))) ||
        a.items.some((x) => x.codigo.toLowerCase() === normalizarCodigo(q).toLowerCase()) ||
        String(a.factura || "").toLowerCase() === t ||
        String(a.numero) === t
      );
    }
    return fx.f(a, hoy);
  });
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Alquiler
        </h1>
        {/* "127": "haz que el botón Nuevo alquiler esté dentro de Alquiler". */}
        <button className="btn btn-primary vj-btn" onClick={() => ir("nuevo")}>
          <IconPlus size={16} /> Nuevo alquiler
        </button>
      </div>
      <Buscar value={q} onChange={setQ} placeholder="Buscar por cliente, cédula, código o No. de factura" style={{ marginTop: 12 }} />
      {!t && (
        <div className="vj-filtros" style={{ marginTop: 10 }}>
          {FILTROS.map((f) => (
            <button key={f.k} className={`vj-filtro${filtro === f.k ? " sel" : ""}`} onClick={() => setFiltro(f.k)}>
              {f.t} <span>{db.alquileres.filter((a) => f.f(a, hoy)).length}</span>
            </button>
          ))}
        </div>
      )}
      {lista.map((a) => (
        <FilaAlquiler key={a.id} db={db} a={a} ir={ir} />
      ))}
      {!lista.length && <div className="card hint-text">{t ? "No se encontró nada." : `Nada en "${fx.t}".`}</div>}
    </>
  );
}

// ----------------------------------------------------------------- Detalle
export function Detalle({ db, p, ops, ir, avisar, id }) {
  const a = db.alquileres.find((x) => x.id === id);
  const [notas, setNotas] = useState(a?.notas || "");
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  if (!a) return <div className="card hint-text">Ese alquiler no existe.</div>;
  const hoy = hoyISO();
  const est = estadoDe(a, hoy);
  const b = db.buzos.find((x) => x.id === a.buzoId) || {};
  return (
    <>
      <a className="back-link" onClick={() => ir("alquiler")} style={{ cursor: "pointer" }}>
        ← Alquiler
      </a>
      <h1 className="page-title" style={{ margin: "4px 0 2px" }}>
        {b.nombre || "—"}
      </h1>
      <div className="hint-text" style={{ fontSize: 14 }}>
        Alquiler No. {a.numero} · {fechaLarga(a.fecha)} · {a.dias === 6 ? "Doble (6 días)" : "Normal (3 días)"}
        {b.cel ? ` · ${formatoCel(b.cel)}` : ""}
      </div>
      <div className={`alq-estado-grande ${est}`}>
        {est === "devuelto" ? "Devuelto todo" : est === "atrasado" ? `Atrasado: tenía que devolverlo el ${fechaLarga(a.devolver)}` : `Tiene que devolverlo el ${fechaLarga(a.devolver)}`}
      </div>
      {sinFactura(a) && !a.estudiante && <div className="alq-falta grande">Falta el número de factura</div>}
      {faltaFacturaMora(a) && <div className="alq-falta grande">Falta la factura de la mora</div>}
      {faltaFacturaCargos(a) && <div className="alq-falta grande">Falta la factura de los cargos</div>}

      <div className="section-title">Equipos</div>
      <div className="card" style={{ padding: 0 }}>
        {a.items.map((x) => {
          const m = moraDe(x, a, hoy);
          return (
            <div key={x.id} className="alq-linea">
              <code>{x.codigo}</code>
              <span style={{ minWidth: 0 }}>
                {x.descripcion || tipoDe(x.codigo)?.uno || ""}
                <span className="hint-text" style={{ display: "block", margin: 0 }}>
                  {x.devueltoEn ? `Devuelto el ${fechaCorta(x.devueltoEn.slice(0, 10))}${x.devueltoPor ? ` · lo trajo ${x.devueltoPor}` : ""}${x.recibidoPor ? ` · recibió ${x.recibidoPor}` : ""}` : "Afuera"}
                  {m.monto ? ` · mora ${m.dias} día${m.dias === 1 ? "" : "s"}: ${rd(m.monto)}` : ""}
                </span>
                {cargosDe(x) > 0 && (
                  <span className="alq-prob-linea">
                    Vino con problemas: {(x.cargos || []).map((c) => `${c.nombre} · ${rd(c.monto)}`).join(", ")}
                  </span>
                )}
              </span>
              <span>{rd(x.total)}</span>
            </div>
          );
        })}
        <div className="alq-linea total">
          <span />
          <b>Total del alquiler</b>
          <b>{rd(totalDe(a))}</b>
        </div>
      </div>
      {est !== "devuelto" && (
        <button className="btn btn-primary vj-btn" onClick={() => ir(`retornos:${a.id}`)}>
          Marcar retorno
        </button>
      )}

      {/* V61 (nota del 2-nov: "ponle alguna seguridad al número de factura,
          así está suelto y pudiera cambiarse por error"): una vez puesta queda
          fija; para cambiarla hay que tocar "Cambiar" y confirmar (Titular o
          administrador). Queda en la bitácora. */}
      <div className="section-title">Número de factura</div>
      <CampoFactura valor={a.factura} puedeCambiar={p.admin} placeholder="El de tu sistema de facturación" onGuardar={(v) => (ops.cambiarAlquiler(a, { factura: v }, "Número de factura", a.factura || "—", v || "—"), avisar("Guardado"))} />
      {a.estudiante && <div className="hint-text">Estudiante {a.estudiante}: el equipo va incluido en el curso.</div>}

      {/* V61 (nota del 2-nov): la factura de la mora, para ponerla después de cobrarla. */}
      {moraTotal(a, hoy) > 0 && (
        <>
          <div className="section-title">Factura de la mora ({rd(moraTotal(a, hoy))})</div>
          {db.sinCols87 ? (
            <div className="hint-text">Falta correr el SQL de la V61 en Supabase para guardar la factura de la mora.</div>
          ) : (
            <CampoFactura valor={a.facturaMora} puedeCambiar={p.admin} placeholder="El número de la factura con que se cobró la mora" onGuardar={(v) => (ops.cambiarAlquiler(a, { facturaMora: v }, "Factura de la mora", a.facturaMora || "—", v || "—"), avisar("Guardado"))} />
          )}
        </>
      )}

      {/* V62 ("233"): los cargos por problemas, con su propio número de factura
          ("No veo dónde es que se pondrá el No. de factura correspondiente"). */}
      {cargosTotal(a) > 0 && (
        <>
          <div className="section-title">Cargos por problemas ({rd(cargosTotal(a))})</div>
          <div className="hint-text" style={{ marginTop: -4, marginBottom: 6 }}>
            {a.items
              .filter((x) => cargosDe(x) > 0)
              .map((x) => `${x.codigo} ${(x.cargos || []).map((c) => c.nombre.charAt(0).toLowerCase() + c.nombre.slice(1)).join(", ")}`)
              .join(" · ")}
          </div>
          <CampoFactura valor={a.facturaCargos} puedeCambiar={p.admin} placeholder="El número de la factura con que se cobraron los cargos" onGuardar={(v) => (ops.cambiarAlquiler(a, { facturaCargos: v }, "Factura de los cargos", a.facturaCargos || "—", v || "—"), avisar("Guardado"))} />
        </>
      )}

      <div className="section-title">Notas</div>
      <textarea className="ce-input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
      {notas !== (a.notas || "") && (
        <button className="btn secondary vj-mini" style={{ marginTop: 6 }} onClick={() => (ops.cambiarAlquiler(a, { notas }, "Notas", a.notas || "—", notas || "—"), avisar("Guardado"))}>
          Guardar notas
        </button>
      )}
      <div className="hint-text" style={{ marginTop: 14 }}>
        Lo hizo {a.creadoPor || "—"} · {a.creadoEn ? new Date(a.creadoEn).toLocaleString("es-DO") : ""}
      </div>

      {/* V61 (nota del 2-nov): "permíteme poder borrar alquileres y editar". */}
      {p.admin && (
        <div className="alq-acciones">
          {editando ? (
            <EditarAlquiler db={db} a={a} ops={ops} cerrar={() => setEditando(false)} />
          ) : borrando ? (
            <div className="alq-confirmar">
              ¿Borrar el alquiler No. {a.numero} de {b.nombre || "—"}? Se borra con sus equipos y no se puede deshacer.
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn secondary vj-mini" onClick={() => setBorrando(false)}>
                  No
                </button>
                <button className="btn vj-mini vj-rojo" onClick={async () => (await ops.borrarAlquiler(a)) && ir("alquiler")}>
                  Sí, borrar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn secondary vj-mini" onClick={() => setEditando(true)}>
                <IconEdit size={14} /> Editar alquiler
              </button>
              <button className="btn secondary vj-mini vj-rojo-txt" onClick={() => setBorrando(true)}>
                Borrar alquiler
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// V61: un número de factura que, una vez puesto, queda fijo. Para cambiarlo:
// "Cambiar" y confirmar.
function CampoFactura({ valor, puedeCambiar, placeholder, onGuardar }) {
  const [abierto, setAbierto] = useState(!valor);
  const [confirmar, setConfirmar] = useState(false);
  const [v, setV] = useState(valor || "");
  if (valor && !abierto)
    return (
      <div className="alq-factura-fija">
        <b>{valor}</b>
        {puedeCambiar &&
          (confirmar ? (
            <span className="alq-factura-conf">
              ¿Seguro que quieres cambiarla?
              <button className="btn secondary vj-mini" onClick={() => setConfirmar(false)}>
                No
              </button>
              <button className="btn secondary vj-mini" onClick={() => (setAbierto(true), setConfirmar(false), setV(valor))}>
                Sí, cambiar
              </button>
            </span>
          ) : (
            <button className="btn secondary vj-mini" onClick={() => setConfirmar(true)}>
              Cambiar
            </button>
          ))}
      </div>
    );
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input className="ce-input" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} />
      {v.trim() !== (valor || "") && (
        <button className="btn secondary vj-mini" onClick={() => (onGuardar(v.trim()), setAbierto(!v.trim()))}>
          Guardar
        </button>
      )}
      {valor && (
        <button className="btn secondary vj-mini" onClick={() => (setAbierto(false), setV(valor))}>
          Cancelar
        </button>
      )}
    </div>
  );
}

// V61: editar un alquiler: cliente, fecha, normal o doble, quitar equipos que
// no se han devuelto y agregar otros.
function EditarAlquiler({ db, a, ops, cerrar }) {
  const [buzoId, setBuzoId] = useState(a.buzoId);
  const [q, setQ] = useState("");
  const [fecha, setFecha] = useState(a.fecha);
  const [dias, setDias] = useState(a.dias);
  const [quitar, setQuitar] = useState([]);
  const [agregar, setAgregar] = useState([]);
  const [cod, setCod] = useState("");
  const [err, setErr] = useState("");
  const [guardando, setGuardando] = useState(false);
  const fuera = useMemo(() => afueraPorCodigo(db), [db]);
  const porCodigo = useMemo(() => Object.fromEntries(db.equipos.map((e) => [e.codigo.toUpperCase(), e])), [db.equipos]);
  const lunes = esLunes(fecha);
  const t = q.trim().toLowerCase();
  const td = soloDigitos(q);
  const sug = t.length >= 2 ? db.buzos.filter((b) => (b.nombre || "").toLowerCase().includes(t) || (td.length >= 4 && (soloDigitos(b.cel).includes(td) || soloDigitos(b.doc).includes(td)))).slice(0, 6) : [];
  const cliente = db.buzos.find((b) => b.id === buzoId);
  function sumar() {
    setErr("");
    const c = normalizarCodigo(cod);
    const e = porCodigo[c.toUpperCase()];
    if (!e) return setErr(`${c} no está en la base de equipos.`);
    const otro = fuera[c.toUpperCase()];
    if (otro && otro.id !== a.id) return setErr(`${c} está alquilado ahora mismo (alquiler No. ${otro.numero}).`);
    if (a.items.some((x) => x.codigo.toUpperCase() === c.toUpperCase() && !quitar.includes(x.id)) || agregar.some((x) => x.codigo === e.codigo)) return setErr(`${c} ya está en el alquiler.`);
    const precio = a.estudiante ? 0 : Number(precioDe(e, db.preciosTipo) || 0);
    setAgregar([...agregar, { codigo: e.codigo, tipo: e.tipo || prefijoDe(e.codigo), descripcion: e.descripcion, precio }]);
    setCod("");
  }
  async function guardarCambios() {
    setGuardando(true);
    const ok = await ops.editarAlquiler(a, { buzoId, fecha, dias, devolver: devolverDe(fecha, dias) }, quitar, agregar);
    setGuardando(false);
    if (ok) cerrar();
  }
  const quedanItems = a.items.filter((x) => !quitar.includes(x.id)).length + agregar.length;
  return (
    <div className="card alq-form" style={{ marginTop: 10 }}>
      <b>Editar alquiler No. {a.numero}</b>
      <label className="alq-l">Cliente</label>
      {cliente && !q ? (
        <div className="alq-cliente">
          <b>{cliente.nombre}</b>
          <button className="btn secondary vj-mini" onClick={() => setQ(" ")}>
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <Buscar value={q.trim() ? q : ""} onChange={setQ} placeholder="Busca por nombre, cédula o celular" />
          {sug.length > 0 && (
            <div className="alq-sug">
              {sug.map((b) => (
                <button key={b.id} type="button" onClick={() => (setBuzoId(b.id), setQ(""))}>
                  <b>{b.nombre}</b> <span className="hint-text">{[b.doc && formatoCedula(b.doc), b.cel && formatoCel(b.cel)].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div className="alq-fila2">
        <div>
          <label className="alq-l">Fecha de alquiler</label>
          <input type="date" className="ce-input" value={fecha} onChange={(e) => (setFecha(e.target.value), esLunes(e.target.value) && setDias(DIAS_NORMAL))} />
        </div>
        <div>
          <label className="alq-l">&nbsp;</label>
          <div className="alq-seg">
            <button type="button" className={dias === 3 ? "sel" : ""} onClick={() => setDias(3)}>
              Normal · 3 días
            </button>
            <button type="button" className={dias === 6 ? "sel" : ""} disabled={lunes} onClick={() => setDias(6)}>
              Doble · 6 días
            </button>
          </div>
        </div>
      </div>
      <label className="alq-l">Equipos</label>
      <div className="alq-lineas">
        {a.items.map((x) => (
          <div key={x.id} className={`alq-linea${quitar.includes(x.id) ? " quitado" : ""}`}>
            <code>{x.codigo}</code>
            <span>{x.devueltoEn ? "Devuelto" : x.descripcion || tipoDe(x.codigo)?.uno || ""}</span>
            <span />
            {!x.devueltoEn && (
              <button type="button" className="alq-x" title={quitar.includes(x.id) ? "Dejarlo" : "Quitar"} onClick={() => setQuitar(quitar.includes(x.id) ? quitar.filter((y) => y !== x.id) : [...quitar, x.id])}>
                {quitar.includes(x.id) ? "↺" : "×"}
              </button>
            )}
          </div>
        ))}
        {agregar.map((x) => (
          <div key={x.codigo} className="alq-linea">
            <code>{x.codigo}</code>
            <span>{x.descripcion || tipoDe(x.codigo)?.uno || ""} (nuevo)</span>
            <span />
            <button type="button" className="alq-x" onClick={() => setAgregar(agregar.filter((y) => y.codigo !== x.codigo))}>
              ×
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input className="ce-input" value={cod} placeholder="Agregar equipo: código (ej. RE-4)" onChange={(e) => (setCod(e.target.value.toUpperCase()), setErr(""))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), sumar())} />
        <button className="btn secondary vj-mini" onClick={sumar}>
          Agregar
        </button>
      </div>
      {err && <div className="pb-error">{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn secondary vj-btn" onClick={cerrar}>
          Cancelar
        </button>
        <button className="btn btn-primary vj-btn" disabled={guardando || !buzoId || !quedanItems || (lunes && dias === 6)} onClick={guardarCambios}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
      {!quedanItems && <div className="hint-text">El alquiler tiene que tener por lo menos un equipo. Si no, bórralo.</div>}
    </div>
  );
}

// ----------------------------------------------------------------- Nuevo alquiler
export function Nuevo({ db, ops, ir, avisar }) {
  const [q, setQ] = useState("");
  const [buzo, setBuzo] = useState(null); // persona escogida
  const [nueva, setNueva] = useState(null); // { nombre, doc, cel }
  const [fecha, setFecha] = useState(hoyISO());
  const [dias, setDias] = useState(DIAS_NORMAL);
  const [cod, setCod] = useState("");
  const [err, setErr] = useState("");
  const [lineas, setLineas] = useState([]); // códigos
  const [notas, setNotas] = useState("");
  const [factura, setFactura] = useState("");
  const [estudiante, setEstudiante] = useState(""); // V61: "OWD", "Advanced"… (equipo incluido en el curso)
  const [guardando, setGuardando] = useState(false);
  const fuera = useMemo(() => afueraPorCodigo(db), [db]);
  const porCodigo = useMemo(() => Object.fromEntries(db.equipos.map((e) => [e.codigo.toUpperCase(), e])), [db.equipos]);
  const mult = dias / DIAS_NORMAL;
  const lunes = esLunes(fecha);

  const t = q.trim().toLowerCase();
  const td = soloDigitos(q);
  const sugerencias =
    t.length >= 2 && !buzo
      ? db.buzos.filter((b) => (b.nombre || "").toLowerCase().includes(t) || (td.length >= 4 && (soloDigitos(b.cel).includes(td) || soloDigitos(b.doc).includes(td)))).slice(0, 6)
      : [];

  // V58 (nota 2-nov: "en el buscador de equipos que ayude a buscar, y que no
  // deje poner cosas que no figuren en la base de datos"): mientras escribe
  // salen los que coinciden; solo se puede agregar uno de la base.
  const tc = cod.trim().toUpperCase().replace(/[\s-]/g, "");
  const coinciden =
    tc.length >= 1
      ? db.equipos
          .filter((e) => e.codigo.toUpperCase().replace(/-/g, "").startsWith(tc) || (tc.length >= 3 && (e.descripcion || "").toUpperCase().includes(cod.trim().toUpperCase())))
          .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }))
          .slice(0, 8)
      : [];
  function agregar(c0) {
    setErr("");
    let c = normalizarCodigo(c0 ?? cod);
    // Enter sin el código completo: si solo hay uno libre que coincide, ese.
    if (!c0 && !porCodigo[c.toUpperCase()]) {
      const libres = coinciden.filter((e) => !fuera[e.codigo.toUpperCase()] && !lineas.includes(e.codigo));
      if (libres.length === 1) c = libres[0].codigo;
      else if (libres.length > 1) return setErr("Escoge uno de la lista.");
    }
    if (!c) return;
    const e = porCodigo[c.toUpperCase()];
    if (!e) return setErr(`${c} no está en la base de equipos.`);
    if (fuera[c.toUpperCase()]) return setErr(`${c} está alquilado ahora mismo (alquiler No. ${fuera[c.toUpperCase()].numero}).`);
    if (lineas.includes(e.codigo)) return setErr(`${c} ya está en la lista.`);
    if (precioDe(e, db.preciosTipo) == null) setErr(`${c} no tiene precio (ni su tipo): se agregó en RD$ 0.`);
    setLineas([...lineas, e.codigo]);
    setCod("");
  }
  const items = lineas.map((c) => {
    const e = porCodigo[c.toUpperCase()];
    // V61: al estudiante el equipo le va incluido en el curso (RD$ 0, sin mora).
    const precio = estudiante ? 0 : Number(precioDe(e, db.preciosTipo) || 0);
    return { codigo: e.codigo, tipo: e.tipo || prefijoDe(e.codigo), descripcion: e.descripcion, precio, total: precio * mult };
  });
  const total = items.reduce((s, x) => s + x.total, 0);
  const cliente = buzo || (nueva && nueva.nombre.trim() ? nueva : null);
  const puede = cliente && items.length && !(lunes && dias === 6) && (!nueva || soloDigitos(nueva.cel).length === 10 || !nueva.cel);

  async function guardarAlquiler() {
    if (!puede || guardando) return;
    setGuardando(true);
    const a = { buzoId: buzo?.id || null, fecha, dias, devolver: devolverDe(fecha, dias), items, notas, factura, estudiante };
    const hecho = await ops.crearAlquiler(a, buzo ? null : { nombre: nueva.nombre.trim(), doc: nueva.doc || "", cel: nueva.cel || "" });
    setGuardando(false);
    if (hecho) {
      avisar(factura.trim() || estudiante ? "Alquiler guardado" : "Alquiler guardado. Falta el número de factura.");
      ir(`ver:${hecho.id}`);
    }
  }

  return (
    <>
      <a className="back-link" onClick={() => ir("alquiler")} style={{ cursor: "pointer" }}>
        ← Alquiler
      </a>
      <h1 className="page-title">Nuevo alquiler</h1>
      <div className="card alq-form">
        <label className="alq-l">Cliente *</label>
        {buzo ? (
          <div className="alq-cliente">
            <b>{buzo.nombre}</b>
            <span className="hint-text" style={{ margin: 0 }}>
              {[buzo.doc && formatoCedula(buzo.doc), buzo.cel && formatoCel(buzo.cel)].filter(Boolean).join(" · ")}
            </span>
            <button className="btn secondary vj-mini" onClick={() => (setBuzo(null), setQ(""))}>
              Cambiar
            </button>
          </div>
        ) : nueva ? (
          <div className="alq-nueva">
            <input className="ce-input" placeholder="Nombre completo" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} />
            <div className="alq-fila2">
              <input className="ce-input" placeholder="Cédula (opcional)" inputMode="numeric" value={nueva.doc} onChange={(e) => setNueva({ ...nueva, doc: formatoCedula(e.target.value) })} />
              <CampoCel className="ce-input" value={nueva.cel} onChange={(v) => setNueva({ ...nueva, cel: v })} />
            </div>
            <button className="btn secondary vj-mini" onClick={() => setNueva(null)}>
              Buscar en la base
            </button>
          </div>
        ) : (
          <>
            <Buscar value={q} onChange={setQ} placeholder="Busca por nombre, cédula o celular" />
            {sugerencias.length > 0 && (
              <div className="alq-sug">
                {sugerencias.map((b) => (
                  <button key={b.id} type="button" onClick={() => setBuzo(b)}>
                    <b>{b.nombre}</b> <span className="hint-text">{[b.doc && formatoCedula(b.doc), b.cel && formatoCel(b.cel)].filter(Boolean).join(" · ")}</span>
                  </button>
                ))}
              </div>
            )}
            <button className="btn secondary vj-mini" style={{ marginTop: 8 }} onClick={() => setNueva({ nombre: q.trim() && !/\d/.test(q) ? q.trim() : "", doc: "", cel: "" })}>
              <IconPlus size={14} /> Cliente nuevo
            </button>
          </>
        )}

        {/* V61 (nota del 2-nov): "una opción de poder poner algo como 'Estudiante
            OWD' para cuando alquilemos equipo a un estudiante (en los cursos tenemos
            los equipos incluidos durante el curso)". */}
        <label className="alq-ck" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={!!estudiante} onChange={(e) => setEstudiante(e.target.checked ? "OWD" : "")} />
          Es un estudiante: el equipo va incluido en su curso
        </label>
        {estudiante && (
          <div className="alq-seg" style={{ marginTop: 6 }}>
            {["OWD", "Advanced", "Rescue", "Otro curso"].map((c) => (
              <button key={c} type="button" className={estudiante === c ? "sel" : ""} onClick={() => setEstudiante(c)}>
                Estudiante {c}
              </button>
            ))}
          </div>
        )}

        <div className="alq-fila2">
          <div>
            <label className="alq-l">Fecha de alquiler</label>
            <input type="date" className="ce-input" value={fecha} onChange={(e) => (setFecha(e.target.value), esLunes(e.target.value) && setDias(DIAS_NORMAL))} />
          </div>
          <div>
            <label className="alq-l">&nbsp;</label>
            <div className="alq-seg">
              <button type="button" className={dias === 3 ? "sel" : ""} onClick={() => setDias(3)}>
                Normal · 3 días
              </button>
              <button type="button" className={dias === 6 ? "sel" : ""} disabled={lunes} onClick={() => setDias(6)} title={lunes ? "Los lunes no hay alquiler doble" : ""}>
                Doble · 6 días
              </button>
            </div>
          </div>
        </div>
        {lunes && <div className="hint-text" style={{ marginTop: 4 }}>Los lunes no hay alquiler doble.</div>}
        {fecha && (
          <div className="alq-devuelve">
            Tiene que devolverlo el <b>{fechaLarga(devolverDe(fecha, dias))}</b>. Si se atrasa, mora del 10% del alquiler de cada equipo por día.
          </div>
        )}

        <label className="alq-l">Equipos (escribe el código o lo que es, y escógelo)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="ce-input" value={cod} placeholder="Ej. RE-4 o careta" onChange={(e) => (setCod(e.target.value.toUpperCase()), setErr(""))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())} />
          <button className="btn secondary vj-mini" onClick={() => agregar()}>
            Agregar
          </button>
        </div>
        {coinciden.length > 0 && (
          <div className="alq-sug">
            {coinciden.map((e) => {
              const a = fuera[e.codigo.toUpperCase()];
              const ya = lineas.includes(e.codigo);
              const pr = precioDe(e, db.preciosTipo);
              return (
                <button key={`${e.fuente}-${e.id}`} type="button" disabled={!!a || ya} onClick={() => agregar(e.codigo)}>
                  <code className="alq-cod">{e.codigo}</code> {e.descripcion || tipoDe(e.codigo)?.uno || ""}
                  <span className="hint-text" style={{ float: "right", margin: 0 }}>
                    {a ? `Alquilado (No. ${a.numero})` : ya ? "Ya está" : pr == null ? "Sin precio" : rd(pr)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {cod.trim() && !coinciden.length && <div className="pb-error">No hay ningún equipo con eso en la base.</div>}
        {err && <div className="pb-error">{err}</div>}
        <div className="alq-lineas">
          {items.map((x) => (
            <div key={x.codigo} className="alq-linea">
              <code>{x.codigo}</code>
              <span>{x.descripcion || tipoDe(x.codigo)?.uno || ""}</span>
              <span>{rd(x.total)}</span>
              <button type="button" className="alq-x" title="Quitar" onClick={() => setLineas(lineas.filter((c) => c !== x.codigo))}>
                ×
              </button>
            </div>
          ))}
          {!items.length && <div className="hint-text" style={{ padding: 12, margin: 0, textAlign: "center" }}>Todavía no hay equipos.</div>}
        </div>
        <div className="alq-total">
          <span>
            Total a cobrar
            <small>{dias === 6 ? "Doble · 6 días" : "Normal · 3 días"}</small>
          </span>
          <b>{rd(total)}</b>
        </div>

        <label className="alq-l">Notas</label>
        <textarea className="ce-input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. El BCD tiene un rayón en el bolsillo" />
        {!estudiante && (
          <>
            <label className="alq-l">Número de factura</label>
            <input className="ce-input" value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="El de tu sistema de facturación (se puede poner después)" />
          </>
        )}
        <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={!puede || guardando} onClick={guardarAlquiler}>
          {guardando ? "Guardando…" : "Guardar alquiler"}
        </button>
        {!puede && <div className="hint-text" style={{ textAlign: "center", marginTop: 6 }}>{!cliente ? "Falta el cliente." : !items.length ? "Faltan los equipos." : lunes && dias === 6 ? "Los lunes no hay alquiler doble." : "Revisa el celular (10 números)."}</div>}
      </div>
    </>
  );
}

// ----------------------------------------------------------------- Retornos
// "127": "una sección de retornos donde uno ponga el nombre del cliente o el
// código y aparezca el alquiler del cliente y uno marcarlo como retornado";
// a veces lo trae otra persona.
export function Retornos({ db, ops, avisar, ir, id }) {
  // Desde un alquiler ("Marcar retorno"): ya sale ese.
  const [q, setQ] = useState(() => String(db.alquileres.find((a) => a.id === id)?.numero || ""));
  const [sel, setSel] = useState({}); // id de línea -> true
  const [otro, setOtro] = useState(false);
  const [quien, setQuien] = useState("");
  const [hecho, setHecho] = useState(null); // { nombre, mora, codigos, cargos }
  // V62 ("233"): "Vino con problemas" por equipo: { idDeLinea: { problema, nombre, monto } }.
  const [prob, setProb] = useState({});
  const hoy = hoyISO();
  const t = q.trim().toLowerCase();
  const c = normalizarCodigo(q).toLowerCase();
  const abiertos = db.alquileres.filter((a) => estadoDe(a, hoy) !== "devuelto");
  const lista = t
    ? abiertos.filter((a) => {
        const b = db.buzos.find((x) => x.id === a.buzoId) || {};
        return (b.nombre || "").toLowerCase().includes(t) || a.items.some((x) => !x.devueltoEn && x.codigo.toLowerCase() === c) || String(a.numero) === t;
      })
    : [];
  async function retornar(a) {
    const ids = a.items.filter((x) => sel[x.id] && !x.devueltoEn).map((x) => x.id);
    if (!ids.length) return avisar("Marca los equipos que trajo.");
    if (otro && !quien.trim()) return avisar("Escribe quién lo trajo.");
    const cargos = {};
    for (const idL of ids) {
      const c = prob[idL];
      if (!c) continue;
      if (!c.problema) return avisar("Escoge qué problema trajo, o quita \"Vino con problemas\".");
      if (c.problema === "otro" && !String(c.nombre || "").trim()) return avisar("Escribe qué problema trajo.");
      if (!(Number(c.monto) > 0)) return avisar("Pon el monto del cargo.");
      cargos[idL] = [{ problema: c.problema, nombre: String(c.nombre || "").trim(), monto: Number(c.monto) }];
    }
    const mora = await ops.retornar(a, ids, otro ? quien.trim() : "", cargos);
    if (mora == null) return;
    const totalCargos = Object.values(cargos).reduce((t, l) => t + l.reduce((u, c) => u + c.monto, 0), 0);
    setHecho({ nombre: nombreDe(db, a), mora, cargos: totalCargos, codigos: a.items.filter((x) => ids.includes(x.id)).map((x) => x.codigo), id: a.id });
    setSel({});
    setProb({});
    setOtro(false);
    setQuien("");
    setQ("");
  }
  return (
    <>
      <a className="back-link" onClick={() => ir("retornos")} style={{ cursor: "pointer" }}>
        ← Retornos
      </a>
      <h1 className="page-title">Registrar retorno</h1>
      {hecho && (
        <div className={`alq-hecho${hecho.mora ? " mora" : ""}`}>
          <b>Retornado: {hecho.codigos.join(", ")}</b> ({hecho.nombre}).
          {hecho.mora ? (
            <div>
              Tiene mora: <b>{rd(hecho.mora)}</b>. Cóbrala en caja.
            </div>
          ) : (
            <div>Sin mora.</div>
          )}
          {hecho.cargos > 0 && (
            <div>
              Cargos por problemas: <b>{rd(hecho.cargos)}</b>. Cóbralos en caja y pon la factura en el alquiler.
            </div>
          )}
          <a className="vj-link" onClick={() => ir(`ver:${hecho.id}`)}>
            Ver el alquiler ›
          </a>
        </div>
      )}
      <Buscar value={q} onChange={(v) => (setQ(v), setHecho(null))} placeholder="Nombre del cliente o código del equipo (ej. RE-4)" autoFocus />
      {!t && <div className="hint-text" style={{ marginTop: 8 }}>Hay {abiertos.length} alquiler{abiertos.length === 1 ? "" : "es"} afuera.</div>}
      {t && !lista.length && <div className="card hint-text" style={{ marginTop: 10 }}>No hay nada afuera con eso.</div>}
      {lista.map((a) => {
        const pend = a.items.filter((x) => !x.devueltoEn);
        const marcados = pend.filter((x) => sel[x.id]);
        const mora = marcados.reduce((s, x) => s + moraDe(x, a, hoy).monto, 0);
        const cargosSel = marcados.reduce((s, x) => s + (prob[x.id] ? Number(prob[x.id].monto) || 0 : 0), 0);
        return (
          <div key={a.id} className="card alq-retorno">
            <div className="alq-fila-top">
              <b>{nombreDe(db, a)}</b>
              <span className={`alq-estado ${estadoDe(a, hoy)}`}>{estadoDe(a, hoy) === "atrasado" ? "Atrasado" : `Devuelve el ${fechaCorta(a.devolver)}`}</span>
            </div>
            <div className="hint-text" style={{ margin: "2px 0 8px" }}>
              Alquiler No. {a.numero} · {fechaCorta(a.fecha)} · {a.dias === 6 ? "Doble" : "Normal"}
            </div>
            <label className="alq-ck todo">
              <input type="checkbox" checked={marcados.length === pend.length} onChange={(e) => setSel(Object.fromEntries(pend.map((x) => [x.id, e.target.checked])))} />
              Trajo todo
            </label>
            {pend.map((x) => {
              const m = moraDe(x, a, hoy);
              const c = prob[x.id];
              const tipoX = x.tipo || prefijoDe(x.codigo);
              const opciones = (db.problemas || []).filter((pr) => pr.activo && (!pr.tipo || pr.tipo === tipoX));
              const cambiar = (v) => setProb({ ...prob, [x.id]: { ...c, ...v } });
              return (
                <div key={x.id} className={`alq-ret-item${c ? " con-prob" : ""}`}>
                  <label className="alq-ck">
                    <input
                      type="checkbox"
                      checked={!!sel[x.id]}
                      onChange={(e) => {
                        setSel({ ...sel, [x.id]: e.target.checked });
                        if (!e.target.checked && c) setProb(Object.fromEntries(Object.entries(prob).filter(([k]) => k !== x.id)));
                      }}
                    />
                    <code>{x.codigo}</code> {x.descripcion || tipoDe(x.codigo)?.uno || ""}
                    {m.monto ? <span className="alq-mora">mora {rd(m.monto)}</span> : null}
                  </label>
                  {/* V62 ("233", maqueta V61): cada equipo tiene "Vino con problemas". */}
                  {sel[x.id] && !db.sinCols90 && (
                    <div className="alq-prob">
                      <label className="alq-ck alq-prob-ck">
                        <input type="checkbox" checked={!!c} onChange={(e) => setProb(e.target.checked ? { ...prob, [x.id]: { problema: "", nombre: "", monto: "" } } : Object.fromEntries(Object.entries(prob).filter(([k]) => k !== x.id)))} />
                        Vino con problemas
                      </label>
                      {c && (
                        <div className="alq-prob-op">
                          {opciones.map((pr) => (
                            <button key={pr.id} type="button" className={`alq-prob-b${c.problema === pr.id ? " sel" : ""}`} onClick={() => cambiar({ problema: pr.id, nombre: pr.nombre, monto: pr.precio == null ? "" : String(pr.precio) })}>
                              {pr.nombre}
                              {pr.precio != null ? ` · ${rd(pr.precio)}` : ""}
                            </button>
                          ))}
                          <button type="button" className={`alq-prob-b${c.problema === "otro" ? " sel" : ""}`} onClick={() => cambiar({ problema: "otro", nombre: "", monto: "" })}>
                            Otro…
                          </button>
                          {c.problema && (
                            <div className="alq-prob-monto">
                              {c.problema === "otro" && <input className="ce-input" placeholder="¿Qué problema trajo?" value={c.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} />}
                              <input className="ce-input-corto" inputMode="numeric" placeholder="RD$" value={c.monto} onChange={(e) => cambiar({ monto: e.target.value.replace(/[^\d.]/g, "") })} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {a.items.some((x) => x.devueltoEn) && <div className="hint-text">Ya devolvió: {a.items.filter((x) => x.devueltoEn).map((x) => x.codigo).join(", ")}</div>}
            <label className="alq-ck" style={{ marginTop: 6 }}>
              <input type="checkbox" checked={otro} onChange={(e) => setOtro(e.target.checked)} />
              Lo trajo otra persona
            </label>
            {otro && <input className="ce-input" placeholder="¿Quién lo trajo?" value={quien} onChange={(e) => setQuien(e.target.value)} />}
            <button className="btn btn-primary vj-btn" style={{ marginTop: 10 }} disabled={!marcados.length} onClick={() => retornar(a)}>
              Marcar retornado{marcados.length ? ` (${marcados.length})` : ""}
              {mora ? ` · mora ${rd(mora)}` : ""}
              {cargosSel ? ` · cargos ${rd(cargosSel)}` : ""}
            </button>
          </div>
        );
      })}
    </>
  );
}

// V61 (nota del 2-nov): "en retornos, mostrar abajo los últimos retornos y un
// search bar para buscar equipo y/o cliente. Haz esa ventana similar a la de
// alquiler, que tenga su botón para registrar retornos".
export function RetornosLista({ db, ir }) {
  const [q, setQ] = useState("");
  const hoy = hoyISO();
  const abiertos = db.alquileres.filter((a) => estadoDe(a, hoy) !== "devuelto");
  // Cada retorno: un alquiler y el momento en que se devolvió (puede ser una parte).
  const retornos = [];
  for (const a of db.alquileres) {
    const grupos = {};
    for (const x of a.items) if (x.devueltoEn) (grupos[x.devueltoEn] = grupos[x.devueltoEn] || []).push(x);
    for (const [cuando, xs] of Object.entries(grupos)) retornos.push({ a, cuando, xs, mora: xs.reduce((t, x) => t + Number(x.mora || 0), 0) });
  }
  retornos.sort((x, y) => y.cuando.localeCompare(x.cuando));
  const t = q.trim().toLowerCase();
  const c = normalizarCodigo(q).toLowerCase();
  const lista = t
    ? retornos.filter(({ a, xs }) => {
        const b = db.buzos.find((y) => y.id === a.buzoId) || {};
        return (b.nombre || "").toLowerCase().includes(t) || xs.some((x) => x.codigo.toLowerCase() === c || x.codigo.toLowerCase().includes(t)) || String(a.numero) === t;
      })
    : retornos.slice(0, 30);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Retornos
        </h1>
        <button className="btn btn-primary vj-btn" onClick={() => ir("retornos:nuevo")}>
          <IconPlus size={16} /> Registrar retorno
        </button>
      </div>
      <div className="hint-text" style={{ marginTop: 6 }}>
        Hay {abiertos.length} alquiler{abiertos.length === 1 ? "" : "es"} afuera.
      </div>
      <Buscar value={q} onChange={setQ} placeholder="Buscar por cliente o código del equipo (ej. RE-4)" style={{ marginTop: 12 }} />
      <div className="section-title">{t ? "Retornos encontrados" : "Últimos retornos"}</div>
      {lista.map(({ a, cuando, xs, mora }) => (
        <button key={`${a.id}-${cuando}`} type="button" className="alq-fila" onClick={() => ir(`ver:${a.id}`)}>
          <span className="alq-fila-top">
            <b>{nombreDe(db, a)}</b>
            <span className={`alq-estado ${mora ? "atrasado" : "devuelto"}`}>{mora ? `Mora ${rd(mora)}` : "Sin mora"}</span>
          </span>
          <span className="hint-text" style={{ margin: 0, display: "block" }}>
            {fechaCorta(cuando.slice(0, 10))} · {xs.map((x) => x.codigo).join(", ")} · alquiler No. {a.numero}
            {xs[0]?.devueltoPor ? ` · lo trajo ${xs[0].devueltoPor}` : ""}
            {xs[0]?.recibidoPor ? ` · recibió ${xs[0].recibidoPor}` : ""}
          </span>
        </button>
      ))}
      {!lista.length && <div className="card hint-text">{t ? "No se encontró ningún retorno con eso." : "Todavía no hay retornos."}</div>}
    </>
  );
}

// ----------------------------------------------------------------- Clientes
// V61 (nota del 2-nov): "agrega una pestaña de clientes" y "permíteme poder
// borrar clientes y editar". Son las mismas personas de Buceos y Estudiantes.
export function Clientes({ db, ir }) {
  const [q, setQ] = useState("");
  const hoy = hoyISO();
  const conAlquiler = new Set(db.alquileres.map((a) => a.buzoId));
  const t = q.trim().toLowerCase();
  const td = soloDigitos(q);
  const lista = (t
    ? db.buzos.filter((b) => (b.nombre || "").toLowerCase().includes(t) || (td.length >= 4 && (soloDigitos(b.cel).includes(td) || soloDigitos(b.doc).includes(td))))
    : db.buzos.filter((b) => conAlquiler.has(b.id))
  ).slice(0, 80);
  return (
    <>
      <h1 className="page-title">Clientes</h1>
      <Buscar value={q} onChange={setQ} placeholder="Buscar por nombre, cédula o celular" />
      <div className="hint-text" style={{ marginTop: 6 }}>
        {t ? "Busca en todas las personas (las mismas de Buceos y Estudiantes)." : `${conAlquiler.size} cliente${conAlquiler.size === 1 ? "" : "s"} que han alquilado.`}
      </div>
      {lista.map((b) => {
        const suyos = db.alquileres.filter((a) => a.buzoId === b.id);
        const afuera = suyos.filter((a) => estadoDe(a, hoy) !== "devuelto").length;
        const gastado = suyos.reduce((s2, a) => s2 + totalDe(a), 0);
        return (
          <button key={b.id} type="button" className="alq-fila" onClick={() => ir(`cliente:${b.id}`)}>
            <span className="alq-fila-top">
              <b>{b.nombre}</b>
              {afuera > 0 && <span className="alq-estado afuera">{afuera} afuera</span>}
            </span>
            <span className="hint-text" style={{ margin: 0, display: "block" }}>
              {[b.doc && formatoCedula(b.doc), b.cel && formatoCel(b.cel)].filter(Boolean).join(" · ") || "Sin cédula ni celular"}
              {suyos.length ? ` · ${suyos.length} alquiler${suyos.length === 1 ? "" : "es"} · ${rd(gastado)}` : " · sin alquileres"}
            </span>
          </button>
        );
      })}
      {!lista.length && <div className="card hint-text">{t ? "No se encontró a nadie." : "Todavía nadie ha alquilado."}</div>}
    </>
  );
}

export function FichaCliente({ db, p, ops, ir, id }) {
  const b = db.buzos.find((x) => x.id === id);
  const [edit, setEdit] = useState(null);
  const [borrando, setBorrando] = useState(false);
  if (!b) return <div className="card hint-text">Ese cliente no está.</div>;
  const suyos = db.alquileres.filter((a) => a.buzoId === b.id);
  const gastado = suyos.reduce((s2, a) => s2 + totalDe(a), 0);
  return (
    <>
      <a className="back-link" onClick={() => ir("clientes")} style={{ cursor: "pointer" }}>
        ← Clientes
      </a>
      <h1 className="page-title" style={{ margin: "4px 0 8px" }}>
        {b.nombre}
      </h1>
      <div className="card">
        {edit ? (
          <div className="alq-form">
            <label className="alq-l">Nombre completo</label>
            <input className="ce-input" value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} />
            <div className="alq-fila2">
              <div>
                <label className="alq-l">Cédula</label>
                <input className="ce-input" inputMode="numeric" value={edit.doc} onChange={(e) => setEdit({ ...edit, doc: formatoCedula(e.target.value) })} />
              </div>
              <div>
                <label className="alq-l">Celular</label>
                <CampoCel className="ce-input" value={edit.cel} onChange={(v) => setEdit({ ...edit, cel: v })} />
              </div>
            </div>
            <label className="alq-l">Correo</label>
            <input className="ce-input" type="email" value={edit.correo} onChange={(e) => setEdit({ ...edit, correo: e.target.value })} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn secondary vj-mini" onClick={() => setEdit(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary vj-mini"
                disabled={!edit.nombre.trim() || (edit.cel && soloDigitos(edit.cel).length !== 10)}
                onClick={async () => (await ops.guardarCliente(b, { nombre: edit.nombre.trim(), doc: edit.doc, cel: soloDigitos(edit.cel), correo: edit.correo.trim() })) && setEdit(null)}
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="vj-dato">
              <span>Cédula</span>
              <b>{b.doc ? formatoCedula(b.doc) : b.pasaporte || "—"}</b>
            </div>
            <div className="vj-dato">
              <span>Celular</span>
              <b>{b.cel ? formatoCel(b.cel) : "—"}</b>
            </div>
            <div className="vj-dato">
              <span>Correo</span>
              <b>{b.correo || "—"}</b>
            </div>
            <div className="vj-dato">
              <span>Alquileres</span>
              <b>
                {suyos.length} · {rd(gastado)}
              </b>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button className="btn secondary vj-mini" onClick={() => setEdit({ nombre: b.nombre || "", doc: b.doc || "", cel: b.cel ? formatoCel(b.cel) : "", correo: b.correo || "" })}>
                <IconEdit size={14} /> Editar datos
              </button>
              <button className="btn btn-primary vj-mini" onClick={() => ir("nuevo")}>
                <IconPlus size={14} /> Nuevo alquiler
              </button>
            </div>
          </>
        )}
      </div>

      <div className="section-title">Sus alquileres</div>
      {suyos.map((a) => (
        <FilaAlquiler key={a.id} db={db} a={a} ir={ir} />
      ))}
      {!suyos.length && <div className="card hint-text">Todavía no ha alquilado.</div>}

      {p.borrar && (
        <div className="alq-acciones">
          {suyos.length ? (
            <div className="hint-text">Para borrar a este cliente primero hay que borrar sus alquileres. Si tiene buceos o cursos, tampoco se puede borrar.</div>
          ) : borrando ? (
            <div className="alq-confirmar">
              ¿Borrar a {b.nombre}? Es la misma persona de Buceos y Estudiantes; si tiene buceos o cursos no se va a poder.
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn secondary vj-mini" onClick={() => setBorrando(false)}>
                  No
                </button>
                <button className="btn vj-mini vj-rojo" onClick={async () => (await ops.borrarCliente(b)) && ir("clientes")}>
                  Sí, borrar
                </button>
              </div>
            </div>
          ) : (
            <button className="btn secondary vj-mini vj-rojo-txt" onClick={() => setBorrando(true)}>
              Borrar cliente
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------------------- Equipos
export function Equipos({ db, p, ops }) {
  const [tipo, setTipo] = useState("RE");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const fuera = useMemo(() => afueraPorCodigo(db), [db]);
  const t = q.trim().toLowerCase();
  const lista = db.equipos
    .filter((e) => (t ? e.codigo.toLowerCase().includes(t) || (e.descripcion || "").toLowerCase().includes(t) : (e.tipo || prefijoDe(e.codigo)) === tipo))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
  const tipoSel = TIPOS.find((x) => x.p === tipo);
  async function guardar() {
    const codigo = normalizarCodigo(edit.codigo);
    if (!edit.id && !/^[A-Z]+-\d+$/.test(codigo)) return alert("El código va con el prefijo y el número, ej. CA-12.");
    const tp = TIPOS.find((x) => x.p === prefijoDe(codigo));
    if (!tp) return alert(`El prefijo ${prefijoDe(codigo)} no está en la lista.`);
    if (!edit.id && db.equipos.some((e) => e.codigo.toUpperCase() === codigo)) return alert(`${codigo} ya existe.`);
    const precio = edit.precio === "" || edit.precio == null ? null : Number(String(edit.precio).replace(/[^\d.]/g, ""));
    const eq = { ...edit, codigo, tipo: tp.p, fuente: edit.fuente || tp.fuente, precio, activo: true };
    const ok = await ops.guardarEquipo(eq, !edit.id, edit.antes);
    if (ok) setEdit(null);
  }
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Equipos
        </h1>
        {p.equipos && (
          <button className="btn btn-primary vj-btn" onClick={() => setEdit({ codigo: `${tipo}-`, descripcion: "", precio: "", nuevo: true })}>
            <IconPlus size={16} /> Agregar equipo
          </button>
        )}
      </div>
      {/* "127": "pon un search bar en la base de datos de equipos". */}
      <Buscar value={q} onChange={setQ} placeholder="Buscar por código o descripción" style={{ marginTop: 12 }} />
      {!t && (
        <div className="vj-filtros" style={{ marginTop: 10 }}>
          {TIPOS.map((x) => (
            <button key={x.p} className={`vj-filtro${tipo === x.p ? " sel" : ""}`} onClick={() => setTipo(x.p)}>
              {x.t} · {x.p} <span>{db.equipos.filter((e) => (e.tipo || prefijoDe(e.codigo)) === x.p).length}</span>
            </button>
          ))}
        </div>
      )}
      {!t && tipoSel?.fuente !== "otros" && <div className="hint-text">Los {tipoSel.t.toLowerCase()} son los mismos de App Interno. Aquí se les pone el precio de alquiler.</div>}
      {edit && (
        <div className="card alq-form" style={{ marginTop: 10 }}>
          <b>{edit.id ? `Editar ${edit.codigo}` : "Agregar equipo"}</b>
          <div className="alq-fila2">
            <div>
              <label className="alq-l">Código</label>
              <input className="ce-input" value={edit.codigo} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, codigo: e.target.value.toUpperCase() })} placeholder="Ej. CA-12" />
            </div>
            <div>
              <label className="alq-l">Precio de alquiler (3 días)</label>
              <input className="ce-input" inputMode="numeric" value={edit.precio ?? ""} onChange={(e) => setEdit({ ...edit, precio: e.target.value.replace(/[^\d.]/g, "") })} placeholder="RD$" />
            </div>
          </div>
          <label className="alq-l">Descripción</label>
          <input className="ce-input" value={edit.descripcion} onChange={(e) => setEdit({ ...edit, descripcion: e.target.value })} placeholder="Ej. Careta negra" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className="btn btn-primary vj-btn" onClick={guardar}>
              Guardar
            </button>
            <button className="btn secondary vj-btn" onClick={() => setEdit(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      <div className="card" style={{ padding: 0, marginTop: 10 }}>
        {lista.map((e) => {
          const a = fuera[e.codigo.toUpperCase()];
          return (
            <div key={`${e.fuente}-${e.id}`} className="alq-linea">
              <code>{e.codigo}</code>
              <span style={{ minWidth: 0 }}>
                {e.descripcion || "—"}
                <span className={`hint-text ${a ? "alq-alquilado" : "alq-disponible"}`} style={{ display: "block", margin: 0 }}>
                  {a ? `Alquilado · ${nombreDe(db, a)} · devuelve el ${fechaCorta(a.devolver)}` : "Disponible"}
                </span>
              </span>
              <span style={{ textAlign: "right" }}>
                {precioDe(e, db.preciosTipo) == null ? <span className="hint-text">Sin precio</span> : rd(precioDe(e, db.preciosTipo))}
                {e.precio == null && precioDe(e, db.preciosTipo) != null && (
                  <span className="hint-text" style={{ display: "block", margin: 0, fontSize: 11 }}>
                    del tipo
                  </span>
                )}
              </span>
              {p.equipos && (
                <button type="button" className="alq-x editar" title="Editar" onClick={() => setEdit({ ...e, precio: e.precio == null ? "" : String(e.precio), antes: e })}>
                  <IconEdit size={14} />
                </button>
              )}
            </div>
          );
        })}
        {!lista.length && <div className="hint-text" style={{ padding: 14, margin: 0 }}>{t ? "No se encontró nada." : `Todavía no hay ${tipoSel?.t.toLowerCase()}.`}</div>}
      </div>
    </>
  );
}

// ----------------------------------------------------------------- Más y Bitácora
export function Mas({ ir }) {
  // V58 (nota 2-nov): precios por tipo, estadísticas y reporte.
  const opciones = [
    { r: "precios", t: "Precios", sub: "El precio de alquiler de cada tipo de equipo y los cargos por problemas (tanque vacío, manómetro ahogado…).", I: IconCatalog },
    { r: "estadisticas", t: "Estadísticas", sub: "Cuánto se alquila, qué se alquila más y cuánto entra.", I: IconChart },
    { r: "reporte", t: "Reporte", sub: "Los alquileres de unas fechas, con totales, para imprimir.", I: IconReport },
    { r: "bitacora", t: "Bitácora", sub: "Todo lo que se hace en Alquiler: quién y cuándo.", I: IconHistory },
  ];
  return (
    <>
      <h1 className="page-title">Más</h1>
      {opciones.map((o) => (
        <button key={o.r} type="button" className="card hub-link-card vj-mas-card alq-mas-card" onClick={() => ir(o.r)}>
          <div className="hub-link-card-inner">
            <div className="hub-link-icon">
              <o.I size={20} />
            </div>
            <div>
              <div className="hub-link-title">{o.t}</div>
              <div className="hub-link-desc">{o.sub}</div>
            </div>
          </div>
        </button>
      ))}
    </>
  );
}

// ----------------------------------------------------------------- Precios por tipo
// "Créame aquí un control para poder controlar los precios de los equipos en
// base a su tipo". Cada tipo tiene su precio; un código sin precio propio usa
// el de su tipo. "Usar en todos" les quita el precio propio a los de ese tipo.
export function Precios({ db, p, ops, ir }) {
  const [val, setVal] = useState(() => Object.fromEntries(TIPOS.map((t) => [t.p, db.preciosTipo[t.p] == null ? "" : String(db.preciosTipo[t.p])])));
  const [seguro, setSeguro] = useState(null);
  return (
    <>
      <a className="back-link" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">Precios</h1>
      <div className="hint-text" style={{ marginBottom: 8 }}>
        El precio de alquiler por 3 días de cada tipo. Los equipos sin precio propio usan este. Si un equipo tiene su propio precio (en Equipos), se queda con el suyo.
      </div>
      {db.sinPreciosTipo && <div className="aviso-box">Falta correr en Supabase el SQL de la V58 para guardar los precios por tipo.</div>}
      <div className="card" style={{ padding: 0 }}>
        {TIPOS.map((t) => {
          const delTipo = db.equipos.filter((e) => (e.tipo || prefijoDe(e.codigo)) === t.p);
          const propios = delTipo.filter((e) => e.precio != null);
          const cambia = val[t.p] !== (db.preciosTipo[t.p] == null ? "" : String(db.preciosTipo[t.p]));
          return (
            <div key={t.p} className="alq-precio-fila">
              <span style={{ minWidth: 0 }}>
                <b>{t.t}</b> <span className="hint-text">· {t.p}</span>
                <span className="hint-text" style={{ display: "block", margin: 0 }}>
                  {delTipo.length} equipo{delTipo.length === 1 ? "" : "s"}
                  {propios.length ? ` · ${propios.length} con precio propio` : ""}
                </span>
                {p.equipos && propios.length > 0 && db.preciosTipo[t.p] != null && (
                  seguro === t.p ? (
                    <span className="ce-quitar-conf">
                      ¿Quitarles el precio propio a los {propios.length}?
                      <button type="button" className="ce-quitar si" onClick={async () => (setSeguro(null), await ops.usarPrecioTipo(t.p, propios))}>
                        Sí
                      </button>
                      <button type="button" className="ce-quitar" onClick={() => setSeguro(null)}>
                        No
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="vj-link alq-link-chico" onClick={() => setSeguro(t.p)}>
                      Usar este precio en todos
                    </button>
                  )
                )}
              </span>
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input className="ce-input-corto" inputMode="numeric" placeholder="RD$" disabled={!p.equipos || db.sinPreciosTipo} value={val[t.p]} onChange={(e) => setVal({ ...val, [t.p]: e.target.value.replace(/[^\d.]/g, "") })} />
                {cambia && (
                  <button className="btn secondary vj-mini" onClick={() => ops.guardarPrecioTipo(t.p, val[t.p] === "" ? null : Number(val[t.p]))}>
                    Guardar
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
      {!p.equipos && <div className="hint-text">Solo el Titular, los administradores o quien tenga el permiso de equipos pueden cambiar precios.</div>}
      <CargosProblemas db={db} p={p} ops={ops} />
    </>
  );
}

// V62 ("233"): la lista de problemas que se cobran al registrar un retorno
// ("Vino con problemas"). Sin precio = se escribe el monto en el retorno.
function CargosProblemas({ db, p, ops }) {
  const [edit, setEdit] = useState(null); // { id, nombre, tipo, precio, nuevo }
  if (db.sinCols90)
    return (
      <>
        <div className="section-title">Cargos por problemas</div>
        <div className="aviso-box">Falta correr en Supabase el SQL de la V62 para usar los cargos por problemas.</div>
      </>
    );
  const lista = (db.problemas || []).filter((x) => x.activo).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const nombreTipo = (t) => (t ? TIPOS.find((x) => x.p === t)?.t || t : "Todos los equipos");
  function guardar() {
    if (!edit.nombre.trim()) return;
    const x = { id: edit.id || `p-${Date.now().toString(36)}`, nombre: edit.nombre.trim(), tipo: edit.tipo || "", precio: edit.precio === "" ? null : Number(edit.precio), activo: true, orden: edit.orden ?? lista.length + 1 };
    ops.guardarProblema(x, !!edit.nuevo);
    setEdit(null);
  }
  return (
    <>
      <div className="section-title">Cargos por problemas</div>
      <div className="hint-text" style={{ marginBottom: 8 }}>
        Lo que se le cobra al cliente cuando un equipo vuelve con un problema (por ejemplo, un tanque vacío o un manómetro ahogado). Sale en &quot;Registrar retorno&quot; › &quot;Vino con problemas&quot;. Si no tiene precio, se escribe el monto ahí.
      </div>
      <div className="card" style={{ padding: 0 }}>
        {lista.map((x) =>
          edit?.id === x.id ? (
            <FormProblema key={x.id} edit={edit} setEdit={setEdit} guardar={guardar} />
          ) : (
            <div key={x.id} className="alq-precio-fila">
              <span style={{ minWidth: 0 }}>
                <b>{x.nombre}</b>
                <span className="hint-text" style={{ display: "block", margin: 0 }}>
                  {nombreTipo(x.tipo)}
                </span>
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <b>{x.precio == null ? <span className="hint-text">Sin precio</span> : rd(x.precio)}</b>
                {p.equipos && (
                  <button className="btn secondary vj-mini" onClick={() => setEdit({ ...x, precio: x.precio == null ? "" : String(x.precio) })}>
                    Cambiar
                  </button>
                )}
              </span>
            </div>
          )
        )}
        {!lista.length && <div className="hint-text" style={{ padding: 12 }}>Todavía no hay cargos.</div>}
        {edit?.nuevo && <FormProblema edit={edit} setEdit={setEdit} guardar={guardar} />}
      </div>
      {p.equipos && !edit && (
        <button className="btn secondary vj-btn" style={{ marginTop: 8 }} onClick={() => setEdit({ nuevo: true, nombre: "", tipo: "", precio: "" })}>
          <IconPlus size={16} /> Agregar un cargo
        </button>
      )}
      {edit && !edit.nuevo && p.equipos && (
        <button className="btn secondary vj-mini vj-rojo-txt" style={{ marginTop: 8 }} onClick={() => (ops.guardarProblema({ ...db.problemas.find((y) => y.id === edit.id), activo: false }, false), setEdit(null))}>
          Quitar &quot;{edit.nombre}&quot; de la lista
        </button>
      )}
    </>
  );
}

function FormProblema({ edit, setEdit, guardar }) {
  return (
    <div className="alq-prob-form">
      <input className="ce-input" placeholder="¿Qué problema? (ej. Llegó vacío: inspección visual)" value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} autoFocus />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        <select className="ce-input" style={{ flex: 1, minWidth: 150 }} value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value })}>
          <option value="">Todos los equipos</option>
          {TIPOS.map((t) => (
            <option key={t.p} value={t.p}>
              {t.t}
            </option>
          ))}
        </select>
        <input className="ce-input-corto" inputMode="numeric" placeholder="RD$" value={edit.precio} onChange={(e) => setEdit({ ...edit, precio: e.target.value.replace(/[^\d.]/g, "") })} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary vj-mini" disabled={!edit.nombre.trim()} onClick={guardar}>
          Guardar
        </button>
        <button className="btn secondary vj-mini" onClick={() => setEdit(null)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- Estadísticas
const mesDe = (iso) => String(iso || "").slice(0, 7);
function Barras({ filas, fmt = (n) => n }) {
  const max = Math.max(1, ...filas.map((f) => f.v));
  return (
    <div className="alq-barras">
      {filas.map((f) => (
        <div key={f.k} className="alq-barra">
          <span className="alq-barra-k">{f.k}</span>
          <span className="alq-barra-t">
            <i style={{ width: `${Math.max(2, (f.v / max) * 100)}%` }} />
          </span>
          <span className="alq-barra-v">{fmt(f.v)}</span>
        </div>
      ))}
    </div>
  );
}
export function Estadisticas({ db, ir }) {
  const hoy = hoyISO();
  const esteMes = mesDe(hoy);
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 - i, 1));
    meses.push(d.toISOString().slice(0, 7));
  }
  const delMes = (m) => db.alquileres.filter((a) => mesDe(a.fecha) === m);
  const moraCobrada = (lista) => lista.reduce((s, a) => s + a.items.reduce((t, x) => t + (x.devueltoEn ? Number(x.mora || 0) : 0), 0), 0);
  const mes = delMes(esteMes);
  const porTipo = {};
  const porCodigo = {};
  const porCliente = {};
  for (const a of db.alquileres) {
    porCliente[a.buzoId] = (porCliente[a.buzoId] || 0) + 1;
    for (const x of a.items) {
      const t = tipoDe(x.codigo)?.t || x.tipo || "Otro";
      porTipo[t] = (porTipo[t] || 0) + 1;
      porCodigo[x.codigo] = (porCodigo[x.codigo] || 0) + 1;
    }
  }
  const top = (obj, n) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  return (
    <>
      <a className="back-link" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">Estadísticas</h1>
      <div className="section-title" style={{ marginTop: 6 }}>
        Este mes ({nombreMes(esteMes)})
      </div>
      <div className="alq-cuadros cuatro">
        <div className="alq-cuadro">
          <b>{mes.length}</b>
          <span>Alquileres</span>
        </div>
        <div className="alq-cuadro">
          <b>{mes.reduce((s, a) => s + a.items.length, 0)}</b>
          <span>Equipos</span>
        </div>
        <div className="alq-cuadro">
          <b style={{ fontSize: 18 }}>{rd(mes.reduce((s, a) => s + totalDe(a), 0))}</b>
          <span>Alquileres cobrados</span>
        </div>
        <div className="alq-cuadro">
          <b style={{ fontSize: 18 }}>{rd(moraCobrada(mes))}</b>
          <span>Mora cobrada</span>
        </div>
      </div>
      <div className="section-title">Lo que entra por mes (alquiler + mora)</div>
      <div className="card">
        <Barras filas={meses.map((m) => ({ k: nombreMes(m).replace(/ \d+$/, "").slice(0, 3), v: delMes(m).reduce((s, a) => s + totalDe(a), 0) + moraCobrada(delMes(m)) }))} fmt={rd} />
      </div>
      <div className="section-title">Alquileres por mes</div>
      <div className="card">
        <Barras filas={meses.map((m) => ({ k: nombreMes(m).replace(/ \d+$/, "").slice(0, 3), v: delMes(m).length }))} />
      </div>
      <div className="section-title">Lo que más se alquila (por tipo)</div>
      <div className="card">{Object.keys(porTipo).length ? <Barras filas={top(porTipo, 9).map(([k, v]) => ({ k, v }))} /> : <div className="hint-text">Todavía no hay alquileres.</div>}</div>
      <div className="section-title">Los equipos más alquilados</div>
      <div className="card">{Object.keys(porCodigo).length ? <Barras filas={top(porCodigo, 10).map(([k, v]) => ({ k, v }))} /> : <div className="hint-text">Todavía no hay alquileres.</div>}</div>
      <div className="section-title">Clientes que más alquilan</div>
      <div className="card">
        {Object.keys(porCliente).length ? (
          <Barras filas={top(porCliente, 5).map(([k, v]) => ({ k: (db.buzos.find((b) => b.id === k)?.nombre || "—").split(" ").slice(0, 2).join(" "), v }))} />
        ) : (
          <div className="hint-text">Todavía no hay alquileres.</div>
        )}
      </div>
    </>
  );
}

// ----------------------------------------------------------------- Reporte
export function Reporte({ db, ir }) {
  const hoy = hoyISO();
  const [desde, setDesde] = useState(hoy.slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoy);
  const lista = db.alquileres.filter((a) => a.fecha >= desde && a.fecha <= hasta).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero - b.numero);
  const total = lista.reduce((s, a) => s + totalDe(a), 0);
  const mora = lista.reduce((s, a) => s + a.items.reduce((t, x) => t + (x.devueltoEn ? Number(x.mora || 0) : 0), 0), 0);
  const sinFact = lista.filter(sinFactura).length;
  return (
    <>
      <a className="back-link no-print" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">Reporte de alquileres</h1>
      <div className="alq-fila2 no-print" style={{ maxWidth: 420 }}>
        <label className="alq-l" style={{ margin: 0 }}>
          Desde
          <input type="date" className="ce-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className="alq-l" style={{ margin: 0 }}>
          Hasta
          <input type="date" className="ce-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>
      <div className="alq-reporte card">
        <div className="alq-reporte-t">
          <b>Alquiler · Gus Dive Center</b>
          <span>
            Del {fechaLarga(desde)} al {fechaLarga(hasta)}
          </span>
        </div>
        <div className="alq-reporte-res">
          <span>
            <b>{lista.length}</b> alquileres
          </span>
          <span>
            Alquiler: <b>{rd(total)}</b>
          </span>
          <span>
            Mora cobrada: <b>{rd(mora)}</b>
          </span>
          {sinFact > 0 && <span className="alq-falta">{sinFact} sin número de factura</span>}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="reporte-preview-tabla alq-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>No.</th>
                <th>Cliente</th>
                <th>Equipos</th>
                <th>Días</th>
                <th>Total</th>
                <th>Mora</th>
                <th>Factura</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fechaCorta(a.fecha)}</td>
                  <td>{a.numero}</td>
                  <td>{nombreDe(db, a)}</td>
                  <td>{a.items.map((x) => x.codigo).join(", ")}</td>
                  <td>{a.dias}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{rd(totalDe(a))}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{rd(a.items.reduce((t, x) => t + (x.devueltoEn ? Number(x.mora || 0) : 0), 0))}</td>
                  <td>{a.factura || "—"}</td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={8} className="hint-text">
                    No hay alquileres en esas fechas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <button className="btn btn-primary vj-btn no-print" onClick={() => window.print()}>
        Imprimir o guardar en PDF
      </button>
    </>
  );
}

export function Bitacora({ db, ir }) {
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const lista = db.bitacora.filter((x) => !t || `${x.texto} ${x.antes || ""} ${x.despues || ""} ${x.quien}`.toLowerCase().includes(t));
  return (
    <>
      <a className="back-link" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">Bitácora</h1>
      <Buscar value={q} onChange={setQ} placeholder="Buscar" />
      <div className="card" style={{ marginTop: 10, padding: 0 }}>
        {lista.map((x) => (
          <div key={x.id} className="alq-bit">
            <b>{x.texto}</b>
            {(x.antes || x.despues) && (
              <span className="hint-text" style={{ display: "block", margin: 0 }}>
                {x.antes ? `${x.antes} → ` : ""}
                {x.despues || ""}
              </span>
            )}
            <span className="hint-text" style={{ display: "block", margin: 0 }}>
              {x.quien} · {new Date(x.cuando).toLocaleString("es-DO")}
            </span>
          </div>
        ))}
        {!lista.length && <div className="hint-text" style={{ padding: 14, margin: 0 }}>Nada todavía.</div>}
      </div>
    </>
  );
}
