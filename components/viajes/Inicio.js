"use client";

import { useState } from "react";
import {
  DIAS,
  MESES,
  MES_CORTO,
  fechaObj,
  fechaCorta,
  fechaLarga,
  diasPara,
  isoDe,
  resumenViaje,
  estadoViaje,
  ESTADOS_VIAJE,
  recordatoriosConFecha,
  hoyISO,
  nuevoIdLocal,
} from "@/lib/viajes/modelo";
import { Chip, Modal } from "./Piezas";
import { IconBell, IconLink, IconCheck, IconBuzos, IconCatalog, IconReport, IconHistory } from "@/components/icons";

// "Para" de un recordatorio: ids de las personas con acceso a Viajes. Vacío = todos.
export const nombresPara = (para, personas) =>
  !para || !para.length ? "todos" : para.map((id) => personas.find((x) => x.id === id)?.nombre || "—").join(", ");

// Lo que le falta a un viaje, en palabras; cada quien ve solo lo que puede
// resolver con sus permisos.
export function pendientesViaje(db, v, p) {
  const r = resumenViaje(db, v);
  const ev = estadoViaje(v);
  const pasado = ev === "realizado";
  const faltanMin = v.cupoMin ? Math.max(0, v.cupoMin - r.buzos.length) : 0;
  const comprobantes = r.ins.filter((x) => (x.comprobantes || []).some((c) => !c.visto)).length;
  const s = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  return [
    pasado && p.cerrar ? "Falta cerrarlo" : null,
    pasado && p.grupo && r.sinMarcar ? "Falta marcar asistencia" : null,
    ev === "abierto" && faltanMin ? `${faltanMin === 1 ? "Falta 1" : `Faltan ${faltanMin}`} para el mínimo` : null,
    p.pagos && r.sinPagar ? `${r.sinPagar} sin pagar completo` : null,
    p.conciliar && r.porConciliar ? s(r.porConciliar, "pago por conciliar", "pagos por conciliar") : null,
    (p.pagos || p.conciliar) && comprobantes ? s(comprobantes, "comprobante nuevo", "comprobantes nuevos") : null,
    !pasado && p.grupo && r.sinGrupo ? `${r.sinGrupo} sin grupo de WhatsApp` : null,
  ].filter(Boolean);
}

// V42 -- Tarjeta de cada viaje en Inicio, "Opción C · semáforo" (escogida por
// Pipe): fecha, nombre, cupo con su barra y un solo botón "✓ Todo al día" o
// "N pendientes ▾" que abre la lista. Tocar la tarjeta abre el viaje.
export function TarjetaViaje({ db, v, p, ir }) {
  const [abierta, setAbierta] = useState(false);
  const r = resumenViaje(db, v);
  const d = fechaObj(v.fecha);
  const ev = estadoViaje(v);
  const lleno = r.buzos.length >= v.cupoMax;
  const dp = diasPara(v.fecha);
  const pend = pendientesViaje(db, v, p);
  const abrir = () => ir(`viaje:${v.id}`);
  return (
    <div
      className="card vj-viaje vj-tarjeta"
      role="button"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={(e) => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), abrir())}
    >
      <div className="vj-tarjeta-top">
        <div className={`vj-fecha${ev === "cancelado" ? " gris" : ""}`}>
          <div className="vj-fecha-d">{d.getDate()}</div>
          <div className="vj-fecha-m">{MES_CORTO[d.getMonth()]}</div>
        </div>
        <div className="vj-tarjeta-info">
          <div className="vj-viaje-t">{v.nombre}</div>
          <div className="hint-text" style={{ marginTop: 2 }}>
            {DIAS[d.getDay()]} · {v.salida}
            {dp > 0 ? ` · en ${dp} días` : dp === 0 ? " · hoy" : ""}
          </div>
          {!["abierto", "realizado"].includes(ev) && (
            <div style={{ marginTop: 6 }}>
              <Chip c={ESTADOS_VIAJE[ev].c}>{ESTADOS_VIAJE[ev].t}</Chip>
            </div>
          )}
          <div className="vj-tarjeta-cupo">
            <div className="vj-barra">
              <div className={lleno ? "lleno" : ""} style={{ width: `${Math.min(100, (r.buzos.length / v.cupoMax) * 100)}%` }} />
            </div>
            <small>
              {r.buzos.length} de {v.cupoMax}
              {lleno ? " · lleno" : ""}
              {r.espera.length ? ` · ${r.espera.length} en espera` : ""}
            </small>
          </div>
        </div>
        {pend.length === 0 ? (
          <span className="vj-semaforo ok">
            <IconCheck size={14} /> Todo al día
          </span>
        ) : (
          <button
            type="button"
            className="vj-semaforo pend"
            aria-expanded={abierta}
            onClick={(e) => {
              e.stopPropagation();
              setAbierta((x) => !x);
            }}
          >
            {pend.length} pendiente{pend.length > 1 ? "s" : ""} {abierta ? "▴" : "▾"}
          </button>
        )}
      </div>
      {abierta && pend.length > 0 && (
        <ul className="vj-tarjeta-pend">
          {pend.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ParaHacer({ db, ops, p, ir, personas = [], titulo = "Para hacer", dias = 7 }) {
  const lista = recordatoriosConFecha(db).filter((r) => !r.hecho && diasPara(r.fecha) <= dias);
  if (!lista.length) return null;
  return (
    <div className="card vj-parahacer">
      <div className="vj-parahacer-t">
        <IconBell size={18} /> {titulo}
      </div>
      {lista.map((r) => {
        const dp = diasPara(r.fecha);
        return (
          <div key={r.key} className="vj-rec">
            <input
              type="checkbox"
              checked={false}
              disabled={!p.editarViaje && !p.grupo}
              onChange={() => ops.marcarHecho(r.key, true, r.texto, r.viaje?.id)}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>{r.texto}</div>
              <div className="hint-text">
                {r.viaje ? (
                  <a className="vj-link" onClick={() => ir(`viaje:${r.viaje.id}`)}>
                    {r.viaje.nombre}
                  </a>
                ) : (
                  "Recordatorio suelto"
                )}{" "}
                · para {nombresPara(r.para, personas)}
                {/* V44 (pregunta de Pipe: "¿de dónde sale esta notificación? ¿cómo llevo
                    control de eso?"): de qué tipo es cada uno. */}
                {" · "}
                <span className="vj-rec-origen">{r.general ? "general (todos los buceos)" : r.libre ? "suelto" : "de este buceo"}</span>
              </div>
            </div>
            <Chip c={dp < 0 ? "rojo" : dp === 0 ? "ambar" : "gris"}>{dp < 0 ? `Atrasado ${-dp} d` : dp === 0 ? "Hoy" : fechaCorta(r.fecha)}</Chip>
          </div>
        );
      })}
      <div className="vj-rec-pie">
        Al marcarlo, se quita solo de ese buceo. Los generales se cambian en{" "}
        <a className="vj-link" onClick={() => ir("calendario")}>
          Calendario
        </a>
        ; los de cada buceo, en su pestaña Info del buceo (o en el Catálogo, para los próximos).
      </div>
    </div>
  );
}

// V44 -- Inicio de Viajes/Buceos, como en los otros apps (pedido: "creamos
// una ventana de inicio? como los otros apps"): los números de un vistazo,
// lo que hay que hacer esta semana, lo que falta cerrar, el próximo viaje y
// las últimas inscripciones.
const haceCuanto = (iso) => {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return min < 1 ? "ahora" : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
};

export function Inicio(props) {
  const { db, p, ir } = props;
  const activos = db.viajes.filter((v) => !["cerrado", "cancelado"].includes(estadoViaje(v)));
  const porCerrar = activos.filter((v) => estadoViaje(v) === "realizado").sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximos = activos.filter((v) => estadoViaje(v) !== "realizado").sort((a, b) => a.fecha.localeCompare(b.fecha));
  const res = proximos.map((v) => resumenViaje(db, v));
  // V44 (pedido: "viajes próximos solo no se entiende"): los de las próximas 2 semanas.
  const en2semanas = proximos.filter((v) => diasPara(v.fecha) <= 14).length;
  const sinPagar = res.reduce((a, r) => a + r.sinPagar, 0);
  const porConciliar = res.reduce((a, r) => a + r.porConciliar, 0);
  const siguiente = proximos[0];
  const viajeDe = (id) => db.viajes.find((v) => v.id === id);
  const ultimas = db.inscripciones
    .filter((x) => x.rol !== "staff" && x.estado !== "quitado" && x.creado && viajeDe(x.viajeId))
    .sort((a, b) => String(b.creado).localeCompare(String(a.creado)))
    .slice(0, 6);
  const tiles = [
    { n: en2semanas, t: en2semanas === 1 ? "buceo en las próximas 2 semanas" : "buceos en las próximas 2 semanas", r: "buceos" },
    ...(p.pagos ? [{ n: sinPagar, t: "pagos pendientes", r: "buceos", alerta: sinPagar > 0 }] : []),
    ...(p.conciliar ? [{ n: porConciliar, t: "pagos por conciliar", r: "buceos", alerta: porConciliar > 0 }] : []),
  ];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Inicio
        </h1>
        {p.editarViaje && (
          <button className="btn btn-primary vj-btn" onClick={() => ir("nuevo")}>
            + Nuevo buceo
          </button>
        )}
      </div>
      <div className="stat-row vj-stats">
        {tiles.map((x) => (
          <button key={x.t} type="button" className={`stat-card vj-stat${x.alerta ? " alerta" : ""}`} onClick={() => ir(x.r)}>
            <div className="stat-value">{x.n}</div>
            <div className="stat-label">{x.t}</div>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        <ParaHacer {...props} titulo="Para hacer esta semana" />
      </div>
      {porCerrar.length > 0 && (
        <>
          <div className="section-title">Ya pasaron · por cerrar</div>
          <div style={{ display: "grid", gap: 12 }}>
            {porCerrar.map((v) => (
              <TarjetaViaje key={v.id} {...props} v={v} />
            ))}
          </div>
        </>
      )}
      <div className="section-title vj-sec-link">
        <span>Próximo buceo</span>
        {proximos.length > 1 && (
          <a className="vj-link" onClick={() => ir("buceos")}>
            Ver los {proximos.length} buceos
          </a>
        )}
      </div>
      {siguiente ? <TarjetaViaje {...props} v={siguiente} /> : <div className="card hint-text">No hay buceos próximos.</div>}
      {ultimas.length > 0 && (
        <>
          <div className="section-title">Últimas inscripciones</div>
          <div className="card vj-ultimas">
            {ultimas.map((x) => {
              const v = viajeDe(x.viajeId);
              const b = db.buzos.find((y) => y.id === x.buzoId);
              return (
                <button key={x.id} type="button" className="vj-ultima" onClick={() => ir(`viaje:${v.id}`)}>
                  <span style={{ minWidth: 0 }}>
                    <b>{b?.nombre || "—"}</b>
                    <span className="hint-text">
                      {v.nombre} · {fechaCorta(v.fecha)}
                      {x.estado === "espera" ? " · lista de espera" : ""}
                    </span>
                  </span>
                  <span className="vj-ultima-cuando">
                    {haceCuanto(x.creado)}
                    <span>{x.via === "mano" ? "a mano" : "por el link"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// V44 -- "Más", como en los otros apps (pedido: "mete buzos, catálogo de
// viajes, estadística e historial en más").
export function Mas({ p, ir }) {
  const opciones = [
    ...(p.buzos ? [{ r: "buzos", t: "Buzos", I: IconBuzos }] : []),
    ...(p.editarViaje ? [{ r: "catalogo", t: "Catálogo de buceos", I: IconCatalog }] : []),
    ...(p.estadisticas ? [{ r: "estadisticas", t: "Estadísticas", I: IconReport }] : []),
    { r: "historial", t: "Historial", I: IconHistory },
  ];
  return (
    <>
      <h1 className="page-title">Más</h1>
      {opciones.map((o) => (
        <button key={o.r} type="button" className="card hub-link-card vj-mas-card" onClick={() => ir(o.r)}>
          <div className="hub-link-card-inner">
            <div className="hub-link-icon">
              <o.I size={20} />
            </div>
            <div className="hub-link-title">{o.t}</div>
          </div>
        </button>
      ))}
    </>
  );
}

// V44 -- "Buceos" (antes "Viajes"): la lista de los viajes (pedido: "solo
// nos quedaríamos con inicio, viajes (renombrar esta a buceos) y
// calendario"). "Para hacer esta semana" pasó a Inicio.
export function Buceos(props) {
  const { db, p, ir } = props;
  const activos = db.viajes.filter((v) => !["cerrado", "cancelado"].includes(estadoViaje(v)));
  const porCerrar = activos.filter((v) => estadoViaje(v) === "realizado").sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximos = activos.filter((v) => estadoViaje(v) !== "realizado").sort((a, b) => a.fecha.localeCompare(b.fecha));
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Buceos
        </h1>
        {p.editarViaje && (
          <button className="btn btn-primary vj-btn" onClick={() => ir("nuevo")}>
            + Nuevo buceo
          </button>
        )}
      </div>
      {porCerrar.length > 0 && (
        <>
          <div className="section-title">Ya pasaron · por cerrar</div>
          <div style={{ display: "grid", gap: 12 }}>
            {porCerrar.map((v) => (
              <TarjetaViaje key={v.id} {...props} v={v} />
            ))}
          </div>
        </>
      )}
      <div className="section-title">Próximos</div>
      <div style={{ display: "grid", gap: 12 }}>
        {proximos.map((v) => (
          <TarjetaViaje key={v.id} {...props} v={v} />
        ))}
        {!proximos.length && <div className="card hint-text">No hay buceos próximos.{p.editarViaje ? " Crea uno con “+ Nuevo buceo”." : ""}</div>}
      </div>
      <div className="hint-text" style={{ marginTop: 16 }}>
        Los buceos cerrados y cancelados están en{" "}
        <a className="vj-link" onClick={() => ir("historial")}>
          Historial
        </a>
        .
      </div>
    </>
  );
}

// =====================================================================
// CALENDARIO
// =====================================================================
export function Calendario(props) {
  const { db, ops, p, ir, avisar, personas = [], calUrl } = props;
  const [mes, setMes] = useState(() => {
    const d = fechaObj(hoyISO());
    return { a: d.getFullYear(), m: d.getMonth() };
  });
  const [nuevoDia, setNuevoDia] = useState(null);
  const [editGen, setEditGen] = useState(false);
  const [gens, setGens] = useState(null); // copia mientras se edita
  const generales = gens || db.generales;
  const setGen = (fn) => setGens((g) => fn(g || db.generales));
  const recs = recordatoriosConFecha(db);
  const primero = new Date(mes.a, mes.m, 1);
  const inicio = new Date(primero);
  inicio.setDate(1 - primero.getDay());
  const celdas = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
  const cambiarMes = (n) => setMes(({ a, m }) => ({ a: m + n < 0 ? a - 1 : m + n > 11 ? a + 1 : a, m: (m + n + 12) % 12 }));
  const delMes = recs.filter((r) => fechaObj(r.fecha).getMonth() === mes.m && fechaObj(r.fecha).getFullYear() === mes.a);
  return (
    <>
      <h1 className="page-title">Calendario</h1>
      <div className="card vj-cal">
        <div className="vj-cal-head">
          <button className="vj-cal-nav" onClick={() => cambiarMes(-1)}>
            ‹
          </button>
          <b>
            {MESES[mes.m][0].toUpperCase() + MESES[mes.m].slice(1)} {mes.a}
          </b>
          <button className="vj-cal-nav" onClick={() => cambiarMes(1)}>
            ›
          </button>
        </div>
        <div className="vj-cal-grid">
          {DIAS.map((d) => (
            <div key={d} className="vj-cal-dow">
              {d}
            </div>
          ))}
          {celdas.map((d) => {
            const iso = isoDe(d);
            const viajes = db.viajes.filter((v) => v.fecha === iso);
            const rs = recs.filter((r) => r.fecha === iso);
            const fuera = d.getMonth() !== mes.m;
            return (
              <div
                key={iso}
                className={`vj-cal-dia${fuera ? " fuera" : ""}${iso === hoyISO() ? " hoy" : ""}`}
                onClick={() => p.editarViaje && setNuevoDia(iso)}
                title={p.editarViaje ? "Toca para poner un recordatorio este día" : ""}
              >
                <div className="vj-cal-n">{d.getDate()}</div>
                {viajes.map((v) => (
                  <button
                    key={v.id}
                    className={`vj-cal-viaje${["cerrado", "cancelado"].includes(estadoViaje(v)) ? " pasado" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      ir(`viaje:${v.id}`);
                    }}
                  >
                    {v.nombre.split(/[,(]/)[0]}
                  </button>
                ))}
                {rs.map((r) => (
                  <div key={r.key} className={`vj-cal-rec${r.hecho ? " hecho" : ""}`} title={r.texto}>
                    <IconBell size={10} /> {r.texto}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="hint-text" style={{ marginTop: 8 }}>
          <span className="vj-cal-viaje muestra">Buceo</span> <span className="vj-cal-rec muestra">
            <IconBell size={10} /> Recordatorio
          </span>{" "}
          {p.editarViaje ? "· Toca un día para ponerle un recordatorio." : ""}
        </div>
      </div>

      <div className="section-title">Recordatorios de {MESES[mes.m]}</div>
      <div className="card">
        {delMes.length === 0 && <div className="hint-text">No hay recordatorios este mes.</div>}
        {delMes.map((r) => (
          <div key={r.key} className="vj-rec">
            <input
              type="checkbox"
              checked={r.hecho}
              disabled={!p.editarViaje && !p.grupo}
              onChange={(e) => ops.marcarHecho(r.key, e.target.checked, r.texto, r.viaje?.id)}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, textDecoration: r.hecho ? "line-through" : "none" }}>{r.texto}</div>
              <div className="hint-text">
                {fechaLarga(r.fecha)} ·{" "}
                {r.viaje ? (
                  <a className="vj-link" onClick={() => ir(`viaje:${r.viaje.id}`)}>
                    {r.viaje.nombre}
                  </a>
                ) : (
                  "suelto"
                )}{" "}
                · para {nombresPara(r.para, personas)}
                {r.general ? " · (general)" : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">Recordatorios generales (para todos los buceos)</div>
      <div className="card">
        <div className="hint-text" style={{ marginBottom: 8 }}>
          Salen solos en cada buceo. Cada buceo del Catálogo además tiene los suyos (ej. Bayahibe: enviar tallas a Alberto el viernes).
        </div>
        {generales.map((g) =>
          editGen ? (
            <div key={g.id} className="vj-gen-edit">
              <input
                className="vj-dias"
                value={g.dias}
                onChange={(e) => setGen((lista) => lista.map((x) => (x.id === g.id ? { ...x, dias: Number(e.target.value.replace(/[^\d-]/g, "")) || 0 } : x)))}
              />
              <span className="hint-text">días antes</span>
              <input
                style={{ flex: 1, minWidth: 180 }}
                value={g.texto}
                onChange={(e) => setGen((lista) => lista.map((x) => (x.id === g.id ? { ...x, texto: e.target.value } : x)))}
              />
              <div className="vj-para">
                {personas.map((n) => (
                  <button
                    key={n.id}
                    className={`pb-chip mini${g.para.includes(n.id) ? " sel" : ""}`}
                    onClick={() =>
                      setGen((lista) => lista.map((x) => (x.id === g.id ? { ...x, para: x.para.includes(n.id) ? x.para.filter((y) => y !== n.id) : [...x.para, n.id] } : x)))
                    }
                  >
                    {n.nombre}
                  </button>
                ))}
                {!g.para.length && <span className="hint-text">(nadie marcado = todos)</span>}
                <label className={`vj-toggle${g.correo ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={g.correo}
                    onChange={(e) => setGen((lista) => lista.map((x) => (x.id === g.id ? { ...x, correo: e.target.checked } : x)))}
                  />
                  Correo
                </label>
                <button className="vj-quitar" onClick={() => setGen((lista) => lista.filter((x) => x.id !== g.id))}>
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <div key={g.id} className="vj-dato">
              <span>{g.dias > 0 ? `${g.dias} día${g.dias === 1 ? "" : "s"} antes` : g.dias === 0 ? "El mismo día" : `${-g.dias} día${g.dias === -1 ? "" : "s"} después`}</span>
              <b style={{ textAlign: "right", fontWeight: 600 }}>
                {g.texto}
                <div className="hint-text" style={{ fontWeight: 500 }}>
                  Para {nombresPara(g.para, personas)}
                  {g.correo ? " · también por correo" : ""}
                </div>
              </b>
            </div>
          )
        )}
        {p.editarViaje && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              className="btn secondary vj-mini"
              onClick={() => {
                if (editGen && gens) ops.guardarGenerales(gens);
                setGens(null);
                setEditGen(!editGen);
              }}
            >
              {editGen ? "Guardar" : "Editar"}
            </button>
            {editGen && (
              <button
                className="btn secondary vj-mini"
                onClick={() => setGen((lista) => [...lista, { id: nuevoIdLocal(), dias: 3, texto: "", para: [], correo: false }])}
              >
                + Agregar recordatorio general
              </button>
            )}
          </div>
        )}
      </div>

      <div className="section-title">Calendario de la tienda (Google Calendar)</div>
      <div className="card">
        <div style={{ fontSize: 14 }}>
          Los buceos y recordatorios de aquí pueden salir también en el calendario de la tienda. Se agrega <b>una sola vez</b> en Google Calendar
          (“Otros calendarios” → “Desde URL”) y después se actualiza solo.
        </div>
        <button
          className="btn secondary vj-btn"
          style={{ marginTop: 10 }}
          onClick={() => {
            try {
              navigator.clipboard.writeText(calUrl);
              avisar("Link del calendario copiado");
            } catch {
              avisar(calUrl);
            }
          }}
        >
          <IconLink size={16} /> Copiar link del calendario
        </button>
        <div className="hint-text" style={{ marginTop: 8 }}>
          Los avisos salen en el app (Inicio → “Para hacer”). Google tarda unas horas en refrescar un calendario agregado por link. No compartas
          este link: quien lo tenga ve los buceos y recordatorios.
        </div>
      </div>

      {nuevoDia && <NuevoRecordatorio {...props} fecha={nuevoDia} cerrar={() => setNuevoDia(null)} />}
    </>
  );
}

function NuevoRecordatorio({ db, ops, fecha, cerrar, avisar, personas = [] }) {
  const [texto, setTexto] = useState("");
  const [para, setPara] = useState([]);
  const [correo, setCorreo] = useState(false);
  const viajesEseDia = db.viajes.filter((v) => v.fecha === fecha);
  return (
    <Modal titulo="Nuevo recordatorio" sub={fechaLarga(fecha)} cerrar={cerrar}>
      {viajesEseDia.length > 0 && <div className="hint-text">Ese día: {viajesEseDia.map((v) => v.nombre).join(", ")}</div>}
      <label>¿Qué hay que hacer?</label>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. Comprar hielo y agua para el bote" />
      <label>Avisarle a</label>
      <div className="vj-para">
        {personas.map((n) => (
          <button key={n.id} className={`pb-chip mini${para.includes(n.id) ? " sel" : ""}`} onClick={() => setPara((x) => (x.includes(n.id) ? x.filter((y) => y !== n.id) : [...x, n.id]))}>
            {n.nombre}
          </button>
        ))}
        <label className={`vj-toggle${correo ? " on" : ""}`}>
          <input type="checkbox" checked={correo} onChange={(e) => setCorreo(e.target.checked)} />
          También por correo
        </label>
      </div>
      <button
        className="btn btn-primary"
        disabled={!texto.trim()}
        style={{ marginTop: 14 }}
        onClick={() => {
          ops.agregarLibre({ id: nuevoIdLocal(), fecha, texto: texto.trim(), para, correo });
          avisar("Recordatorio guardado");
          cerrar();
        }}
      >
        Guardar recordatorio
      </button>
    </Modal>
  );
}
