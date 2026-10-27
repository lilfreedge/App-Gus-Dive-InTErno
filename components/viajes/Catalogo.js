"use client";

import { useState } from "react";
import { rd, us, soloDigitos, precioDop, PREGUNTAS, hoyISO, sumarDias, nuevoIdLocal, puntos, fechaLarga } from "@/lib/viajes/modelo";
import { IconCalendar, IconReceipt, IconCheck, IconPlus, IconRegulator, IconClipboard, IconLock, IconBell, IconChat } from "@/components/icons";
import { armarSlug } from "@/lib/viajes/datos";
import { Atras } from "./Piezas";

const num = (t) => Number(soloDigitos(t)) || 0;

// Formulario compartido: plantilla del catálogo o viaje nuevo.
// V44 -- Pedido de Pipe: "hazlo más simplificado, se ve muy a lo loco toda
// esa info junta, quizás haz botones". Ahora cada parte es un botón con un
// resumen de una línea; al tocarlo se abre para editar (una a la vez). Las
// opciones también: una fila por opción (nombre y precio) que se abre.
function Seccion({ id, abierta, setAbierta, Icono, titulo, resumen, children }) {
  const esta = abierta === id;
  return (
    <div className={`vj-fsec${esta ? " abierta" : ""}`}>
      <button type="button" className="vj-fsec-top" onClick={() => setAbierta(esta ? null : id)} aria-expanded={esta}>
        <span className="vj-fsec-ico">
          <Icono size={18} />
        </span>
        <span className="vj-fsec-txt">
          <b>{titulo}</b>
          <span>{resumen}</span>
        </span>
        <span className="vj-fsec-flecha">{esta ? "▴" : "▾"}</span>
      </button>
      {esta && <div className="vj-fsec-cuerpo">{children}</div>}
    </div>
  );
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function FormViaje({ f, setF, p, esViaje }) {
  const [abierta, setAbierta] = useState(esViaje ? "datos" : null);
  const [opAbierta, setOpAbierta] = useState(null);
  const set = (k, val) => setF((x) => ({ ...x, [k]: val }));
  const setOp = (i, k, val) => setF((x) => ({ ...x, opciones: x.opciones.map((o, j) => (j === i ? { ...o, [k]: val } : o)) }));
  const setEq = (k, val) => setF((x) => ({ ...x, equipo: { ...x.equipo, [k]: val } }));
  const sec = { abierta, setAbierta };
  const precio = (o) => (o.noPaga ? "No paga" : f.moneda === "USD" ? `${us(o.usd || 0)} (${rd(precioDop(f, o))})` : rd(o.dop || 0));
  const pagan = f.opciones.filter((o) => !o.noPaga);
  const desde = pagan.length ? Math.min(...pagan.map((o) => precioDop(f, o))) : 0;
  const nInc = puntos(f.incluye).length;
  const nNo = puntos(f.noIncluye).length;
  const nPend = String(f.pendientesTexto || "")
    .split("\n")
    .filter((t) => t.trim()).length;

  return (
    <div className="vj-fsecs">
      <Seccion
        id="datos"
        {...sec}
        Icono={IconCalendar}
        titulo={esViaje ? "Fecha y datos" : "Datos del viaje"}
        resumen={[esViaje && f.fecha ? fechaLarga(f.fecha) : null, f.salida || "Sin salida", `cupo ${f.cupoMin ? `${f.cupoMin} a ` : "hasta "}${f.cupoMax}`, f.operador].filter(Boolean).join(" · ")}
      >
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
            <label>Operador</label>
            <input value={f.operador} onChange={(e) => set("operador", e.target.value)} placeholder="Ej. Scuba Caribe (Alberto Mercedes)" />
          </div>
          <div>
            <label>Cupo mínimo / máximo</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={f.cupoMin} onChange={(e) => set("cupoMin", num(e.target.value))} aria-label="Cupo mínimo" />
              <input value={f.cupoMax} onChange={(e) => set("cupoMax", num(e.target.value))} aria-label="Cupo máximo" />
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion
        id="opciones"
        {...sec}
        Icono={IconReceipt}
        titulo="Opciones y precios"
        resumen={`${plural(f.opciones.length, "opción", "opciones")}${desde ? ` · desde ${rd(desde)}` : ""} · en ${f.moneda === "USD" ? "dólares" : "pesos"}`}
      >
        <div className="vj-form2" style={{ marginBottom: 8 }}>
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
        </div>
        <div className="vj-ops">
          {f.opciones.map((o, i) => {
            const esta = opAbierta === i;
            return (
              <div key={o.id || i} className={`vj-op${esta ? " abierta" : ""}`}>
                <button type="button" className="vj-op-top" onClick={() => setOpAbierta(esta ? null : i)} aria-expanded={esta}>
                  <span className="vj-op-n">{o.nombre || "Opción sin nombre"}</span>
                  <span className="vj-op-p">{precio(o)}</span>
                  <span className="vj-fsec-flecha">{esta ? "▴" : "▾"}</span>
                </button>
                {esta && (
                  <div className="vj-op-cuerpo">
                    <label>Nombre</label>
                    <input value={o.nombre} onChange={(e) => setOp(i, "nombre", e.target.value)} placeholder="Ej. Buzo + equipo" />
                    <label>Qué incluye esta opción (opcional)</label>
                    <input value={o.incluye} onChange={(e) => setOp(i, "incluye", e.target.value)} placeholder="Ej. Embarcación, 2 tanques y guía" />
                    <div className="vj-form2">
                      <div>
                        <label>Precio ({f.moneda === "USD" ? "US$" : "RD$"})</label>
                        <input value={(f.moneda === "USD" ? o.usd : o.dop) || ""} onChange={(e) => setOp(i, f.moneda === "USD" ? "usd" : "dop", num(e.target.value))} />
                        {f.moneda === "USD" && <span className="hint-text">= {rd(precioDop(f, o))}</span>}
                      </div>
                      {p.numeros && (
                        <div>
                          <label>Costo del operador (por persona)</label>
                          <input value={o.costo ?? ""} onChange={(e) => setOp(i, "costo", e.target.value === "" ? null : num(e.target.value))} />
                        </div>
                      )}
                    </div>
                    <label className="vj-check">
                      <input type="checkbox" checked={!!o.conEquipo} onChange={(e) => setOp(i, "conEquipo", e.target.checked)} /> Esta opción incluye equipo
                    </label>
                    <label className="vj-check">
                      <input type="checkbox" checked={!!o.noPaga} onChange={(e) => setOp(i, "noPaga", e.target.checked)} /> No paga el viaje (va con su curso)
                    </label>
                    {f.opciones.length > 1 && (
                      <button
                        type="button"
                        className="vj-quitar"
                        onClick={() => {
                          setOpAbierta(null);
                          setF((x) => ({ ...x, opciones: x.opciones.filter((_, j) => j !== i) }));
                        }}
                      >
                        Quitar esta opción
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="btn secondary vj-mini"
          style={{ marginTop: 8 }}
          onClick={() => {
            setF((x) => ({ ...x, opciones: [...x.opciones, { id: nuevoIdLocal().slice(0, 8), nombre: "", incluye: "", usd: 0, dop: 0, costo: null }] }));
            setOpAbierta(f.opciones.length);
          }}
        >
          + Agregar opción
        </button>
      </Seccion>

      <Seccion
        id="incluye"
        {...sec}
        Icono={IconCheck}
        titulo="Incluye y no incluye"
        resumen={nInc || nNo ? `${plural(nInc, "cosa incluida", "cosas incluidas")} · ${plural(nNo, "no incluida", "no incluidas")}` : "Opcional · no puesto"}
      >
        <div className="hint-text" style={{ marginBottom: 4 }}>
          Escribe uno por línea: cada línea le sale al buzo como un punto.
        </div>
        <label>Incluye</label>
        <textarea rows={Math.max(3, String(f.incluye || "").split("\n").length + 1)} value={f.incluye || ""} onChange={(e) => set("incluye", e.target.value)} placeholder={"2 noches de hotel\n3 buceos con tanques, plomos y guía\n2 desayunos"} />
        <label>No incluye</label>
        <textarea rows={Math.max(3, String(f.noIncluye || "").split("\n").length + 1)} value={f.noIncluye || ""} onChange={(e) => set("noIncluye", e.target.value)} placeholder={"Transporte terrestre\nAlquiler de equipo\nPropinas"} />
      </Seccion>

      <Seccion
        id="extras"
        {...sec}
        Icono={IconPlus}
        titulo="Extras (se cobran aparte)"
        resumen={f.extras.length ? f.extras.map((e) => `${e.nombre || "Extra"} +${rd(e.dop || 0)}`).join(" · ") : "Ninguno"}
      >
        {f.extras.map((e, i) => (
          <div key={e.id || i} className="vj-extra-edit">
            <input value={e.nombre} onChange={(ev) => setF((x) => ({ ...x, extras: x.extras.map((y, j) => (j === i ? { ...y, nombre: ev.target.value } : y)) }))} placeholder="Ej. Buceo nocturno" />
            <span className="hint-text">RD$</span>
            <input style={{ width: 100 }} value={e.dop || ""} onChange={(ev) => setF((x) => ({ ...x, extras: x.extras.map((y, j) => (j === i ? { ...y, dop: num(ev.target.value) } : y)) }))} />
            <button type="button" className="vj-quitar" onClick={() => setF((x) => ({ ...x, extras: x.extras.filter((_, j) => j !== i) }))}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="btn secondary vj-mini" style={{ marginTop: 6 }} onClick={() => setF((x) => ({ ...x, extras: [...x.extras, { id: nuevoIdLocal().slice(0, 8), nombre: "", dop: 0 }] }))}>
          + Agregar extra
        </button>
      </Seccion>

      <Seccion
        id="equipo"
        {...sec}
        Icono={IconRegulator}
        titulo="Equipo de alquiler"
        resumen={f.equipo.modo === "si" ? `Se alquila · lo pone ${f.equipo.proveedor || "—"} · ${plural((f.equipo.piezas || []).length, "pieza", "piezas")}` : "No se alquila (traen su equipo)"}
      >
        <select value={f.equipo.modo} onChange={(e) => setEq("modo", e.target.value)}>
          <option value="no">No se alquila (traen su equipo)</option>
          <option value="si">Se puede alquilar</option>
        </select>
        <label>Lo que ve el buzo sobre el equipo</label>
        <input value={f.equipo.nota} onChange={(e) => setEq("nota", e.target.value)} placeholder="Ej. El alquiler de equipo va aparte." />
        {f.equipo.modo === "si" && (
          <>
            <label>¿Quién lo pone?</label>
            <input value={f.equipo.proveedor || ""} onChange={(e) => setEq("proveedor", e.target.value)} placeholder="Ej. Scuba Caribe, Gus, Nobel" />
            <label>Piezas (separadas por coma)</label>
            <input value={(f.equipo.piezas || []).join(", ")} onChange={(e) => setEq("piezas", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
            <label className="vj-check">
              <input type="checkbox" checked={!!f.equipo.soloConOpcion} onChange={(e) => setEq("soloConOpcion", e.target.checked)} />
              Solo se pregunta si escoge una opción que “incluye equipo”
            </label>
          </>
        )}
      </Seccion>

      <Seccion
        id="preguntas"
        {...sec}
        Icono={IconClipboard}
        titulo="Lo que se le pregunta al buzo"
        resumen={[f.preguntas.length ? plural(f.preguntas.length, "pregunta", "preguntas") : "Ninguna pregunta", f.requisito ? "con requisito" : null].filter(Boolean).join(" · ")}
      >
        <div className="pb-chips">
          {PREGUNTAS.map((q) => {
            const sel = f.preguntas.includes(q.k);
            return (
              <button type="button" key={q.k} className={`pb-chip mini${sel ? " sel" : ""}`} onClick={() => set("preguntas", sel ? f.preguntas.filter((y) => y !== q.k) : [...f.preguntas, q.k])}>
                {q.t}
              </button>
            );
          })}
        </div>
        <label>Lo que tiene que aceptar (opcional)</label>
        <textarea rows={2} value={f.requisito || ""} onChange={(e) => set("requisito", e.target.value)} placeholder="Ej. mínimo 30 buceos registrados" />
      </Seccion>

      <Seccion
        id="reserva"
        {...sec}
        Icono={IconLock}
        titulo="Reserva y habitaciones"
        resumen={[f.reserva ? `Reserva ${rd(f.reserva.monto)}` : "Sin reserva", f.habitaciones ? plural(f.habitaciones.length, "habitación", "habitaciones") : null].filter(Boolean).join(" · ")}
      >
        <label className="vj-check">
          <input type="checkbox" checked={!!f.reserva} onChange={(e) => set("reserva", e.target.checked ? { monto: 5000, nota: "Depósito de RD$5,000 para separar. No reembolsable." } : null)} />
          Se separa con una reserva
        </label>
        {f.reserva && (
          <div className="vj-extra-edit">
            <span className="hint-text">RD$</span>
            <input style={{ width: 100 }} value={f.reserva.monto} onChange={(e) => set("reserva", { ...f.reserva, monto: num(e.target.value) })} />
            <input value={f.reserva.nota} onChange={(e) => set("reserva", { ...f.reserva, nota: e.target.value })} />
          </div>
        )}
        <label className="vj-check">
          <input type="checkbox" checked={!!f.habitaciones} onChange={(e) => set("habitaciones", e.target.checked ? ["Sencilla 1", "Doble 1"] : null)} />
          Tiene habitaciones para asignar
        </label>
        {f.habitaciones && (
          <>
            <label>Habitaciones (separadas por coma)</label>
            <input value={f.habitaciones.join(", ")} onChange={(e) => set("habitaciones", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
          </>
        )}
      </Seccion>

      <Seccion
        id="pendientes"
        {...sec}
        Icono={IconBell}
        titulo="Pendientes y recordatorios"
        resumen={`${plural(nPend, "pendiente", "pendientes")} · ${plural(f.recordatorios.length, "recordatorio", "recordatorios")}`}
      >
        <label>Pendientes (uno por línea)</label>
        <textarea rows={Math.max(3, nPend + 1)} value={f.pendientesTexto} onChange={(e) => set("pendientesTexto", e.target.value)} />
        <label>Recordatorios</label>
        {f.recordatorios.map((r, i) => (
          <div key={r.id || i} className="vj-gen-edit">
            <input className="vj-dias" value={r.dias} onChange={(e) => setF((x) => ({ ...x, recordatorios: x.recordatorios.map((y, j) => (j === i ? { ...y, dias: num(e.target.value) } : y)) }))} />
            <span className="hint-text">días antes</span>
            <input style={{ flex: 1, minWidth: 180 }} value={r.texto} onChange={(e) => setF((x) => ({ ...x, recordatorios: x.recordatorios.map((y, j) => (j === i ? { ...y, texto: e.target.value } : y)) }))} />
            <button type="button" className="vj-quitar" onClick={() => setF((x) => ({ ...x, recordatorios: x.recordatorios.filter((_, j) => j !== i) }))}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="btn secondary vj-mini" style={{ marginTop: 6 }} onClick={() => setF((x) => ({ ...x, recordatorios: [...x.recordatorios, { id: nuevoIdLocal(), dias: 2, texto: "" }] }))}>
          + Agregar recordatorio
        </button>
      </Seccion>

      <Seccion
        id="mensaje"
        {...sec}
        Icono={IconChat}
        titulo="Mensaje para el grupo de WhatsApp"
        resumen={f.mensajeGrupo ? `${f.mensajeGrupo.slice(0, 60)}${f.mensajeGrupo.length > 60 ? "…" : ""}` : "Sin mensaje"}
      >
        <textarea rows={4} value={f.mensajeGrupo || ""} onChange={(e) => set("mensajeGrupo", e.target.value)} placeholder="¡Hola! Les recuerdo que… ([día] se cambia solo por la fecha)" />
      </Seccion>
    </div>
  );
}

// ------------------------------------------------------------- nuevo viaje
export function NuevoViaje({ db, ops, p, ir }) {
  const [f, setF] = useState(null);
  if (!f) {
    return (
      <>
        <Atras onClick={() => ir("buceos")}>Buceos</Atras>
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
      <div className="hint-text" style={{ marginBottom: 10 }}>
        Ya viene lleno del Catálogo. Pon la fecha y toca cualquier parte si quieres cambiar algo solo para esta vez.
      </div>
      <FormViaje f={f} setF={setF} p={p} esViaje />
      {p.web && (
        <label className={`vj-toggle${f.web ? " on" : ""}`} style={{ marginTop: 12 }}>
          <input type="checkbox" checked={f.web} onChange={(e) => setF({ ...f, web: e.target.checked })} />
          Mostrar en gusdivecenter.com
        </label>
      )}
      <div className="vj-guardar-barra">
        <button className="btn btn-primary" onClick={crear}>
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
      <div className="hint-text" style={{ marginBottom: 10 }}>
        Toca cada parte para verla y cambiarla. Los cambios salen en los viajes nuevos; los que ya están programados se quedan como estaban.
      </div>
      <FormViaje f={f} setF={setF} p={p} />
      <div className="vj-guardar-barra">
        <button className="btn btn-primary" onClick={guardar}>
          Guardar cambios
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
