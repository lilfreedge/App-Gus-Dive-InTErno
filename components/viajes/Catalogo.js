"use client";

import { useState } from "react";
import { rd, us, soloDigitos, precioDop, PREGUNTAS, hoyISO, sumarDias, nuevoIdLocal } from "@/lib/viajes/modelo";
import { armarSlug } from "@/lib/viajes/datos";
import { Atras } from "./Piezas";

const num = (t) => Number(soloDigitos(t)) || 0;

// Formulario compartido: plantilla del catálogo o viaje nuevo.
function FormViaje({ f, setF, p, esViaje }) {
  const set = (k, val) => setF((x) => ({ ...x, [k]: val }));
  const setOp = (i, k, val) => setF((x) => ({ ...x, opciones: x.opciones.map((o, j) => (j === i ? { ...o, [k]: val } : o)) }));
  const setEq = (k, val) => setF((x) => ({ ...x, equipo: { ...x.equipo, [k]: val } }));
  return (
    <>
      <div className="vj-form2">
        {!esViaje && (
          <div>
            <label>Nombre del viaje</label>
            <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </div>
        )}
        {esViaje && (
          <div>
            <label>Fecha</label>
            <input type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
        )}
        <div>
          <label>Salida (hora y lugar)</label>
          <input value={f.salida} onChange={(e) => set("salida", e.target.value)} placeholder="Ej. 6:30 AM desde la tienda" />
        </div>
        <div>
          <label>Precios en</label>
          <select value={f.moneda} onChange={(e) => set("moneda", e.target.value)}>
            <option value="USD">Dólares (se calcula en pesos con la tasa)</option>
            <option value="DOP">Pesos</option>
          </select>
        </div>
        {f.moneda === "USD" && (
          <div>
            <label>Tasa del dólar</label>
            <input value={f.tasa || ""} onChange={(e) => set("tasa", num(e.target.value))} />
          </div>
        )}
        <div>
          <label>Cupo mínimo / máximo</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={f.cupoMin} onChange={(e) => set("cupoMin", num(e.target.value))} />
            <input value={f.cupoMax} onChange={(e) => set("cupoMax", num(e.target.value))} />
          </div>
        </div>
        <div>
          <label>Operador</label>
          <input value={f.operador} onChange={(e) => set("operador", e.target.value)} placeholder="Ej. Scuba Caribe (Alberto Mercedes)" />
        </div>
      </div>

      <div className="vj-sec">Opciones y precios</div>
      {f.opciones.map((o, i) => (
        <div key={i} className="vj-op-edit">
          <input value={o.nombre} onChange={(e) => setOp(i, "nombre", e.target.value)} placeholder="Ej. Buzo + equipo" />
          <input value={o.incluye} onChange={(e) => setOp(i, "incluye", e.target.value)} placeholder="Qué incluye" />
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span className="hint-text">{f.moneda === "USD" ? "US$" : "RD$"}</span>
            <input style={{ width: 90 }} value={(f.moneda === "USD" ? o.usd : o.dop) || ""} onChange={(e) => setOp(i, f.moneda === "USD" ? "usd" : "dop", num(e.target.value))} />
            {f.moneda === "USD" && (
              <span className="hint-text" style={{ whiteSpace: "nowrap" }}>
                = {rd(precioDop(f, o))}
              </span>
            )}
            {p.numeros && (
              <>
                <span className="hint-text" style={{ whiteSpace: "nowrap" }}>
                  costo
                </span>
                <input style={{ width: 80 }} value={o.costo ?? ""} onChange={(e) => setOp(i, "costo", e.target.value === "" ? null : num(e.target.value))} />
              </>
            )}
            <label className="vj-check" style={{ padding: 0 }}>
              <input type="checkbox" checked={!!o.conEquipo} onChange={(e) => setOp(i, "conEquipo", e.target.checked)} /> incluye equipo
            </label>
            <label className="vj-check" style={{ padding: 0 }}>
              <input type="checkbox" checked={!!o.noPaga} onChange={(e) => setOp(i, "noPaga", e.target.checked)} /> no paga (curso)
            </label>
            {f.opciones.length > 1 && (
              <button className="vj-quitar" onClick={() => setF((x) => ({ ...x, opciones: x.opciones.filter((_, j) => j !== i) }))}>
                Quitar
              </button>
            )}
          </div>
        </div>
      ))}
      <button className="btn secondary vj-mini" style={{ marginTop: 6 }} onClick={() => setF((x) => ({ ...x, opciones: [...x.opciones, { id: nuevoIdLocal().slice(0, 8), nombre: "", incluye: "", usd: 0, dop: 0, costo: null }] }))}>
        + Agregar opción
      </button>

      <div className="vj-sec">Extras opcionales (se cobran aparte)</div>
      {f.extras.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
          <input value={e.nombre} onChange={(ev) => setF((x) => ({ ...x, extras: x.extras.map((y, j) => (j === i ? { ...y, nombre: ev.target.value } : y)) }))} placeholder="Ej. Buceo nocturno" />
          <span className="hint-text">RD$</span>
          <input style={{ width: 100 }} value={e.dop || ""} onChange={(ev) => setF((x) => ({ ...x, extras: x.extras.map((y, j) => (j === i ? { ...y, dop: num(ev.target.value) } : y)) }))} />
          <button className="vj-quitar" onClick={() => setF((x) => ({ ...x, extras: x.extras.filter((_, j) => j !== i) }))}>
            Quitar
          </button>
        </div>
      ))}
      <button className="btn secondary vj-mini" style={{ marginTop: 6 }} onClick={() => setF((x) => ({ ...x, extras: [...x.extras, { id: nuevoIdLocal().slice(0, 8), nombre: "", dop: 0 }] }))}>
        + Agregar extra
      </button>

      <div className="vj-sec">Equipo de alquiler</div>
      <select value={f.equipo.modo} onChange={(e) => setEq("modo", e.target.value)}>
        <option value="no">No se alquila (traen su equipo)</option>
        <option value="si">Se puede alquilar</option>
      </select>
      <input style={{ marginTop: 6 }} value={f.equipo.nota} onChange={(e) => setEq("nota", e.target.value)} placeholder="Lo que ve el buzo sobre el equipo" />
      {f.equipo.modo === "si" && (
        <>
          <label>Piezas (separadas por coma)</label>
          <input value={(f.equipo.piezas || []).join(", ")} onChange={(e) => setEq("piezas", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
          <label>¿Quién lo pone?</label>
          <input value={f.equipo.proveedor || ""} onChange={(e) => setEq("proveedor", e.target.value)} placeholder="Ej. Scuba Caribe, Gus, Nobel" />
          <label className="vj-check">
            <input type="checkbox" checked={!!f.equipo.soloConOpcion} onChange={(e) => setEq("soloConOpcion", e.target.checked)} />
            Solo se pregunta si escoge una opción que “incluye equipo”
          </label>
        </>
      )}

      <div className="vj-sec">Lo que se le pregunta al buzo</div>
      <div className="pb-chips">
        {PREGUNTAS.map((q) => {
          const sel = f.preguntas.includes(q.k);
          return (
            <button key={q.k} className={`pb-chip mini${sel ? " sel" : ""}`} onClick={() => set("preguntas", sel ? f.preguntas.filter((y) => y !== q.k) : [...f.preguntas, q.k])}>
              {q.t}
            </button>
          );
        })}
      </div>
      <label>Lo que tiene que aceptar (opcional)</label>
      <textarea rows={2} value={f.requisito || ""} onChange={(e) => set("requisito", e.target.value)} placeholder="Ej. mínimo 30 buceos registrados" />

      <div className="vj-sec">Reserva y habitaciones (viajes de fin de semana)</div>
      <label className="vj-check">
        <input type="checkbox" checked={!!f.reserva} onChange={(e) => set("reserva", e.target.checked ? { monto: 5000, nota: "Depósito de RD$5,000 para separar. No reembolsable." } : null)} />
        Se separa con una reserva
      </label>
      {f.reserva && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="hint-text">RD$</span>
          <input style={{ width: 100 }} value={f.reserva.monto} onChange={(e) => set("reserva", { ...f.reserva, monto: num(e.target.value) })} />
          <input value={f.reserva.nota} onChange={(e) => set("reserva", { ...f.reserva, nota: e.target.value })} />
        </div>
      )}
      <label className="vj-check">
        <input type="checkbox" checked={!!f.habitaciones} onChange={(e) => set("habitaciones", e.target.checked ? ["Sencilla 1", "Doble 1"] : null)} />
        Tiene habitaciones para asignar
      </label>
      {f.habitaciones && <input value={f.habitaciones.join(", ")} onChange={(e) => set("habitaciones", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />}

      <div className="vj-sec">Pendientes y recordatorios de siempre</div>
      <label>Pendientes (uno por línea)</label>
      <textarea rows={3} value={f.pendientesTexto} onChange={(e) => set("pendientesTexto", e.target.value)} />
      <label>Recordatorios</label>
      {f.recordatorios.map((r, i) => (
        <div key={i} className="vj-gen-edit">
          <input className="vj-dias" value={r.dias} onChange={(e) => setF((x) => ({ ...x, recordatorios: x.recordatorios.map((y, j) => (j === i ? { ...y, dias: num(e.target.value) } : y)) }))} />
          <span className="hint-text">días antes</span>
          <input style={{ flex: 1, minWidth: 180 }} value={r.texto} onChange={(e) => setF((x) => ({ ...x, recordatorios: x.recordatorios.map((y, j) => (j === i ? { ...y, texto: e.target.value } : y)) }))} />
          <button className="vj-quitar" onClick={() => setF((x) => ({ ...x, recordatorios: x.recordatorios.filter((_, j) => j !== i) }))}>
            Quitar
          </button>
        </div>
      ))}
      <button className="btn secondary vj-mini" style={{ marginTop: 6 }} onClick={() => setF((x) => ({ ...x, recordatorios: [...x.recordatorios, { id: nuevoIdLocal(), dias: 2, texto: "" }] }))}>
        + Agregar recordatorio
      </button>
      <label>Mensaje para el grupo de WhatsApp</label>
      <textarea rows={3} value={f.mensajeGrupo || ""} onChange={(e) => set("mensajeGrupo", e.target.value)} placeholder="¡Hola! Les recuerdo que… ([día] se cambia solo por la fecha)" />
    </>
  );
}

// ------------------------------------------------------------- nuevo viaje
export function NuevoViaje({ db, ops, p, ir }) {
  const [f, setF] = useState(null);
  if (!f) {
    return (
      <>
        <Atras onClick={() => ir("inicio")}>Viajes</Atras>
        <h1 className="page-title">Nuevo viaje</h1>
        <div className="hint-text" style={{ marginBottom: 10 }}>
          Escoge el viaje del Catálogo. Ya viene lleno con su información de siempre (precios, salida, equipo, cupo, operador, recordatorios): solo
          pones la fecha y cambias lo que varíe esta vez.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
          {db.catalogo.map((c) => (
            <button
              key={c.id}
              className="card vj-plantilla"
              onClick={() =>
                setF({
                  ...JSON.parse(JSON.stringify(c)),
                  plantilla: c.id,
                  fecha: sumarDias(hoyISO(), 14),
                  tasa: c.tasa || 62,
                  pendientesTexto: (c.pendientes || []).join("\n"),
                  recordatorios: (c.recordatorios || []).map((r) => ({ ...r, id: nuevoIdLocal() })),
                  web: true,
                })
              }
            >
              <b>{c.nombre}</b>
              <div className="hint-text" style={{ marginTop: 4 }}>
                {c.opciones.length > 1 ? `${c.opciones.length} opciones · desde ` : ""}
                {c.moneda === "USD" ? us(Math.min(...c.opciones.map((o) => o.usd))) : rd(Math.min(...c.opciones.filter((o) => !o.noPaga).map((o) => o.dop)))}
              </div>
              <div className="hint-text">{c.equipo.modo === "no" ? "Sin alquiler de equipo" : "Con alquiler de equipo"}</div>
            </button>
          ))}
          <button className="card vj-plantilla" style={{ borderStyle: "dashed" }} onClick={() => ir("catalogo")}>
            <b>+ Otro viaje</b>
            <div className="hint-text" style={{ marginTop: 4 }}>
              Se agrega en el Catálogo de viajes y queda para la próxima
            </div>
          </button>
        </div>
      </>
    );
  }
  function crear() {
    const id = nuevoIdLocal();
    const { pendientesTexto, orden, activo, ...resto } = f;
    const v = {
      ...resto,
      id,
      estado: "abierto",
      creado: hoyISO(),
      gastos: [],
      pendientes: pendientesTexto
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => ({ t, hecho: false })),
    };
    v.slug = armarSlug(v.nombre, v.fecha, db.viajes.map((x) => x.slug));
    ops.crearViaje(v);
    ir(`viaje:${id}`);
  }
  return (
    <>
      <Atras onClick={() => setF(null)}>Escoger otro</Atras>
      <h1 className="page-title">Nuevo viaje: {f.nombre}</h1>
      <div className="card">
        <FormViaje f={f} setF={setF} p={p} esViaje />
        {p.web && (
          <label className={`vj-toggle${f.web ? " on" : ""}`} style={{ marginTop: 12 }}>
            <input type="checkbox" checked={f.web} onChange={(e) => setF({ ...f, web: e.target.checked })} />
            Mostrar en gusdivecenter.com
          </label>
        )}
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={crear}>
          Crear viaje
        </button>
      </div>
    </>
  );
}

// ------------------------------------------------------------- catálogo
export function Catalogo({ db, ops, ir }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Catálogo de viajes
        </h1>
        <button
          className="btn btn-primary vj-btn"
          onClick={() => {
            const id = nuevoIdLocal();
            ops.guardarPlantilla(
              {
                id,
                nombre: "Viaje nuevo",
                salida: "",
                moneda: "DOP",
                tasa: 62,
                opciones: [{ id: "buzo", nombre: "Buzo", incluye: "", usd: 0, dop: 0, costo: null }],
                cupoMin: 0,
                cupoMax: 12,
                operador: "",
                equipo: { modo: "no", nota: "Este viaje no incluye alquiler de equipo: trae tu equipo completo." },
                extras: [],
                preguntas: [],
                reserva: null,
                habitaciones: null,
                requisito: "",
                pendientes: ["Crear grupo de WhatsApp"],
                recordatorios: [],
                mensajeGrupo: "",
              },
              true
            );
            ir(`plantilla:${id}`);
          }}
        >
          + Agregar viaje
        </button>
      </div>
      <div className="hint-text" style={{ margin: "6px 0 12px" }}>
        Los viajes que ofrecen, con su información de siempre (sacada de los sheets). Al crear un viaje se escoge de aquí y ya viene lleno. Si cambias
        algo aquí, los viajes nuevos salen con el cambio; los que ya están programados se quedan como estaban.
      </div>
      <div className="card vj-lista">
        {db.catalogo.map((c) => (
          <button key={c.id} className="vj-fila vj-fila-boton" onClick={() => ir(`plantilla:${c.id}`)}>
            <div className="vj-fila-main">
              <div className="vj-fila-nombre">{c.nombre}</div>
              <div className="hint-text">{c.opciones.map((o) => `${o.nombre} ${o.noPaga ? "(no paga)" : c.moneda === "USD" ? us(o.usd) : rd(o.dop)}`).join(" · ")}</div>
              <div className="hint-text">
                {c.salida || "Sin salida"} · cupo {c.cupoMin ? `${c.cupoMin} a ` : "hasta "}
                {c.cupoMax} · {c.equipo.modo === "no" ? "sin alquiler de equipo" : `equipo: ${c.equipo.proveedor || "sí"}`}
                {c.reserva ? ` · reserva ${rd(c.reserva.monto)}` : ""}
              </div>
            </div>
            <span className="vj-boton">Editar</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function EditarPlantilla({ db, ops, id, p, ir, avisar }) {
  const [quitando, setQuitando] = useState(false);
  const original = db.catalogo.find((c) => c.id === id);
  const [f, setF] = useState(() => ({ ...JSON.parse(JSON.stringify(original)), pendientesTexto: (original.pendientes || []).join("\n") }));
  function guardar() {
    const { pendientesTexto, ...resto } = f;
    const limpio = {
      ...resto,
      pendientes: pendientesTexto
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    ops.guardarPlantilla(limpio, false);
    avisar("Guardado en el Catálogo de viajes");
    ir("catalogo");
  }
  return (
    <>
      <Atras onClick={() => ir("catalogo")}>Catálogo de viajes</Atras>
      <h1 className="page-title">{f.nombre || "Viaje"}</h1>
      <div className="card">
        <FormViaje f={f} setF={setF} p={p} />
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={guardar}>
          Guardar
        </button>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        {quitando ? (
          <>
            <div style={{ fontSize: 14 }}>¿Quitar “{original.nombre}” del catálogo? Los viajes que ya se hicieron con él no cambian.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn secondary vj-btn" onClick={() => setQuitando(false)}>
                No
              </button>
              <button
                className="btn vj-btn vj-rojo"
                onClick={() => {
                  ops.quitarPlantilla(original);
                  ir("catalogo");
                }}
              >
                Sí, quitar
              </button>
            </div>
          </>
        ) : (
          <button className="btn secondary vj-mini vj-rojo-txt" onClick={() => setQuitando(true)}>
            Quitar del catálogo…
          </button>
        )}
      </div>
    </>
  );
}
