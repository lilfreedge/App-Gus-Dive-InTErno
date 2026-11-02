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
        {sinFactura(a) ? "" : ` · Factura ${a.factura}`}
      </span>
      {sinFactura(a) && <span className="alq-falta">Falta el número de factura</span>}
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
export function Detalle({ db, ops, ir, avisar, id }) {
  const a = db.alquileres.find((x) => x.id === id);
  const [factura, setFactura] = useState(a?.factura || "");
  const [notas, setNotas] = useState(a?.notas || "");
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
      {sinFactura(a) && <div className="alq-falta grande">Falta el número de factura</div>}

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

      <div className="section-title">Número de factura</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="ce-input" value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="El de tu sistema de facturación" />
        {factura.trim() !== (a.factura || "") && (
          <button className="btn secondary vj-mini" onClick={() => (ops.cambiarAlquiler(a, { factura: factura.trim() }, "Número de factura", a.factura || "—", factura.trim() || "—"), avisar("Guardado"))}>
            Guardar
          </button>
        )}
      </div>
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
    </>
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
    const precio = Number(precioDe(e, db.preciosTipo) || 0);
    return { codigo: e.codigo, tipo: e.tipo || prefijoDe(e.codigo), descripcion: e.descripcion, precio, total: precio * mult };
  });
  const total = items.reduce((s, x) => s + x.total, 0);
  const cliente = buzo || (nueva && nueva.nombre.trim() ? nueva : null);
  const puede = cliente && items.length && !(lunes && dias === 6) && (!nueva || soloDigitos(nueva.cel).length === 10 || !nueva.cel);

  async function guardarAlquiler() {
    if (!puede || guardando) return;
    setGuardando(true);
    const a = { buzoId: buzo?.id || null, fecha, dias, devolver: devolverDe(fecha, dias), items, notas, factura };
    const hecho = await ops.crearAlquiler(a, buzo ? null : { nombre: nueva.nombre.trim(), doc: nueva.doc || "", cel: nueva.cel || "" });
    setGuardando(false);
    if (hecho) {
      avisar(factura.trim() ? "Alquiler guardado" : "Alquiler guardado. Falta el número de factura.");
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
        <label className="alq-l">Número de factura</label>
        <input className="ce-input" value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="El de tu sistema de facturación (se puede poner después)" />
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
  const [hecho, setHecho] = useState(null); // { nombre, mora, codigos }
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
    const mora = await ops.retornar(a, ids, otro ? quien.trim() : "");
    if (mora == null) return;
    setHecho({ nombre: nombreDe(db, a), mora, codigos: a.items.filter((x) => ids.includes(x.id)).map((x) => x.codigo), id: a.id });
    setSel({});
    setOtro(false);
    setQuien("");
    setQ("");
  }
  return (
    <>
      <h1 className="page-title">Retornos</h1>
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
              return (
                <label key={x.id} className="alq-ck">
                  <input type="checkbox" checked={!!sel[x.id]} onChange={(e) => setSel({ ...sel, [x.id]: e.target.checked })} />
                  <code>{x.codigo}</code> {x.descripcion || tipoDe(x.codigo)?.uno || ""}
                  {m.monto ? <span className="alq-mora">mora {rd(m.monto)}</span> : null}
                </label>
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
            </button>
          </div>
        );
      })}
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
    { r: "precios", t: "Precios por tipo", sub: "El precio de alquiler de cada tipo de equipo: careta, regulador, BCD…", I: IconCatalog },
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
      <h1 className="page-title">Precios por tipo</h1>
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
    </>
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
