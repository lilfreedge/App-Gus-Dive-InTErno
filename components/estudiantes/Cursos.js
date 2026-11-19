"use client";

import { PresupuestosCurso } from "./PresupuestoHoja";
import { useState } from "react";
import { IconEdit, IconPlus } from "@/components/icons";
import { PASOS, ESCUELAS, rd, nombrePaso } from "@/lib/estudiantes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";
import { DIAS_CATALOGO, HORA_TEORIA, limpiarPlantilla, semanaDePlantilla } from "@/lib/estudiantes/itinerario";

// Base de datos (Más › Base de datos, V55: "ponme en 'más' un botón de base
// de datos, donde figuren base de datos de los cursos que damos, para poder
// editar, borrar o agregar. Yo seré el único que va a poder borrar"; "este
// listado de cursos así como lo vemos debe de figurar en más > base de datos
// > cursos"). Cursos (precio, pasos y cómo es la semana) e instructores.
export function Cursos({ db, p, yo, ops, ir }) {
  const [seccion, setSeccion] = useState("cursos");
  const [edit, setEdit] = useState(null);
  const [nuevoInstr, setNuevoInstr] = useState("");
  const activos = db.cursos.filter((c) => c.activo);
  const inactivos = db.cursos.filter((c) => !c.activo);

  return (
    <>
      <a className="back-link" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">Catálogo de cursos</h1>
      <div className="vj-tabs" style={{ marginBottom: 12 }}>
        <button className={`vj-tab${seccion === "cursos" ? " sel" : ""}`} onClick={() => setSeccion("cursos")}>
          Cursos ({activos.length})
        </button>
        <button className={`vj-tab${seccion === "instructores" ? " sel" : ""}`} onClick={() => setSeccion("instructores")}>
          Instructores ({db.instructores.filter((i) => i.activo).length})
        </button>
      </div>
      {seccion === "cursos" && (
      <>
      {/* V103 ("quitemos esa sección de poner un mensaje para los cursos"): sin el mensaje de la lista. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div className="hint-text" style={{ margin: 0 }}>Los cursos que damos. {yo?.esTitular ? "Solo tú puedes borrar." : ""}</div>
        {p.cursos && !edit && (
          <button className="btn btn-primary vj-btn" onClick={() => setEdit({ id: nuevoId(), nombre: "", escuelas: [...ESCUELAS], precio: null, pasos: PASOS.map((x) => x.k), llevaExamen: true, activo: true, orden: 99, semana: null, nuevo: true })}>
            <IconPlus size={16} /> Nuevo curso
          </button>
        )}
      </div>
      {edit && <EditarCurso c={edit} ops={ops} yo={yo} cerrar={() => setEdit(null)} />}
      <div style={{ marginTop: 12 }}>
        {activos.map((c) => (
          <div key={c.id} className="ce-curso">
            <div className="ce-est-t">
              <span>
                <b>{c.nombre}</b> <span className="ce-chip curso">{c.precio == null ? "Sin precio" : rd(c.precio)}</span>
                {ESCUELAS.length > 1 && <span className="ce-chip gris">{c.escuelas.join(" · ") || "—"}</span>}
                {c.semana && <span className="ce-chip gris">Itinerario</span>}
              </span>
              {p.cursos && (
                <button className="btn secondary vj-mini" onClick={() => setEdit(c)}>
                  <IconEdit size={14} /> Editar
                </button>
              )}
            </div>
            <div className="ce-pz">
              {PASOS.map((x) => (
                <span key={x.k} className={c.pasos.includes(x.k) ? "" : "na"}>
                  {x.corto}
                </span>
              ))}
              <span className={c.llevaExamen ? "" : "na"}>Examen</span>
            </div>
          </div>
        ))}
        {inactivos.length > 0 && (
          <div className="hint-text">
            Quitados:{" "}
            {inactivos.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ", "}
                {c.nombre}
                {p.cursos && (
                  <>
                    {" "}
                    (<a className="vj-link" onClick={() => ops.guardarCurso({ ...c, activo: true }, false)}>volver a ponerlo</a>)
                  </>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {seccion === "instructores" && (
      <>
      <div className="card" style={{ padding: "4px 14px" }}>
        {db.instructores
          .filter((i) => i.activo)
          .map((i) => (
            <div key={i.id} className="ce-dato">
              <span style={{ color: "var(--texto)" }}>{i.nombre}</span>
              {p.cursos && (
                <button className="btn secondary vj-mini" onClick={() => ops.guardarInstructor({ ...i, activo: false }, false)}>
                  Quitar
                </button>
              )}
            </div>
          ))}
        {p.cursos && (
          <div style={{ display: "flex", gap: 6, padding: "8px 0" }}>
            <input className="ce-input" value={nuevoInstr} onChange={(e) => setNuevoInstr(e.target.value)} placeholder="Nombre del instructor" />
            <button
              className="btn secondary vj-mini"
              disabled={!nuevoInstr.trim()}
              onClick={() => {
                ops.guardarInstructor({ id: nuevoId(), nombre: nuevoInstr.trim(), activo: true }, true);
                setNuevoInstr("");
              }}
            >
              Agregar
            </button>
          </div>
        )}
      </div>
      </>
      )}
    </>
  );
}

// V76 (pedido explícito, con foto: "aqui deberia de tener una ','. deberia
// ser 29,500") -- el precio se ve con comas de miles mientras se escribe.
function formatoPrecioInput(v) {
  const limpio = String(v).replace(/[^\d.]/g, "");
  const punto = limpio.indexOf(".");
  const entero = punto === -1 ? limpio : limpio.slice(0, punto);
  const decimal = punto === -1 ? "" : limpio.slice(punto, punto + 3);
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + decimal;
}

// V76 (pedido explícito, con foto: "quita esta parte, el itinerario es lo
// que uno llena antes de eso, Lunes martes miercoles=teoria 1,2 y 3, Jueve=
// examen, viernes+practica piscina, Sabado caleta 1, domingo caleta 2. Si
// se te ocurre alguna manera de mezclarlos avisame") -- se quita el
// itinerario escrito a mano y sale solo de los pasos marcados arriba,
// siguiendo ese mismo orden. "Caleta Nocturno" va el martes de la semana
// siguiente (ver abajo).
// V81 (respuesta: "caleta nocturno normalmente lo hacemos un martes, el
// martes de la semana siguiente cuando empieza"): el lugar 9 es ese martes
// (el lunes de la semana siguiente, lugar 8, va vacío).
const DIA_PASO = ["teoria1", "teoria2", "teoria3", null, "piscina", "caleta1", "caleta2", "", "caletaNocturna"]; // null = jueves (examen)
function semanaDePasos(pasos, llevaExamen) {
  return DIA_PASO.map((k) => (k === null ? (llevaExamen ? "Examen" : "") : k && pasos.includes(k) ? nombrePaso(k) : ""));
}

// V106 (maqueta V110, "139. sí", "140. A") -- el itinerario del curso se
// edita aquí: una fila por paso de clase/mar marcado (y el examen), con su día
// desde el lunes (hasta el domingo de la semana siguiente) y la hora. El
// examen también puede quedar "por cuadrar con el instructor". Se guarda en
// info.itinerario (sin SQL) y vale para los cursos que todavía no tienen su
// itinerario guardado; los que ya lo confirmaron se cambian en su página.
const ORDEN_ITI = ["teoria1", "teoria2", "teoria3", "examen", "piscina", "caleta1", "caleta2", "caletaNocturna"];
const DIA_DE_SIEMPRE = { teoria1: 0, teoria2: 1, teoria3: 2, examen: 3, piscina: 4, caleta1: 5, caleta2: 6, caletaNocturna: 8 };
const NOMBRE_DIA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const nombreDiaCat = (i) => `${NOMBRE_DIA[i % 7]}${i >= 7 ? " siguiente" : ""}`;
const nombreIti = (k) => (k === "examen" ? "Examen" : nombrePaso(k));
const esTeoriaK = (k) => /^teoria/.test(k);
function itiInicial(c) {
  const guardado = Object.fromEntries((limpiarPlantilla(c.info?.itinerario) || []).filter((x) => x.k).map((x) => [x.k, x]));
  return Object.fromEntries(
    ORDEN_ITI.map((k) => {
      const g = guardado[k];
      return [k, g ? { dia: g.cuadrar ? null : g.dia, hora: g.hora || "", cuadrar: g.cuadrar } : { dia: DIA_DE_SIEMPRE[k], hora: esTeoriaK(k) ? HORA_TEORIA : "", cuadrar: false }];
    })
  );
}
const filasIti = (pasos, llevaExamen) => ORDEN_ITI.filter((k) => (k === "examen" ? llevaExamen : pasos.includes(k)));
function plantillaDe(iti, pasos, llevaExamen) {
  return filasIti(pasos, llevaExamen).map((k) => {
    const x = iti[k] || {};
    const cuadrar = k === "examen" && !!x.cuadrar;
    return { k, t: nombreIti(k), dia: cuadrar ? null : x.dia, hora: cuadrar ? "" : x.hora || "", cuadrar, pos: DIA_DE_SIEMPRE[k] };
  });
}
function choquesIti(plantilla) {
  const visto = {};
  const malos = new Set();
  plantilla.forEach((x) => {
    if (x.cuadrar || x.dia == null) return;
    if (visto[x.dia]) {
      malos.add(x.k);
      malos.add(visto[x.dia]);
    } else visto[x.dia] = x.k;
  });
  return malos;
}

function ItinerarioCatalogo({ iti, setIti, pasos, llevaExamen }) {
  const plantilla = plantillaDe(iti, pasos, llevaExamen);
  const malos = choquesIti(plantilla);
  if (!plantilla.length) return <div className="hint-text">Marca arriba las clases y las salidas al mar del curso para armar su itinerario.</div>;
  const cambiar = (k, cambio) => setIti({ ...iti, [k]: { ...iti[k], ...cambio } });
  return (
    <div className="ce-iticat">
      {plantilla.map((x) => {
        const ocupado = new Set(plantilla.filter((y) => y.k !== x.k && !y.cuadrar && y.dia != null).map((y) => y.dia));
        return (
          <div key={x.k} className={`ce-iticat-fila${malos.has(x.k) ? " choca" : ""}`}>
            <b>{x.t}</b>
            <select
              value={x.cuadrar ? "cuadrar" : String(x.dia)}
              onChange={(e) => (e.target.value === "cuadrar" ? cambiar(x.k, { cuadrar: true }) : cambiar(x.k, { cuadrar: false, dia: Number(e.target.value) }))}
            >
              {Array.from({ length: DIAS_CATALOGO }, (_, i) => (
                <option key={i} value={i} disabled={ocupado.has(i)}>
                  {nombreDiaCat(i)}
                  {ocupado.has(i) ? " (ocupado)" : ""}
                </option>
              ))}
              {x.k === "examen" && <option value="cuadrar">Por cuadrar con el instructor</option>}
            </select>
            <input type="time" value={x.hora} disabled={x.cuadrar} onChange={(e) => cambiar(x.k, { hora: e.target.value })} aria-label={`Hora de ${x.t}`} />
            {malos.has(x.k) && <small className="ce-iti-rojo">Cae el mismo día que otra actividad</small>}
          </div>
        );
      })}
      <div className="hint-text" style={{ margin: "6px 0 0" }}>
        Los días van desde el lunes en que empieza el curso. La hora es opcional. Vale para los cursos que se abran desde ahora; los que ya están abiertos se cambian en su página (tarjeta Itinerario).
      </div>
    </div>
  );
}

// V76 (pedido explícito: "quiero poner esta parte mas organizada") -- los
// pasos se ven en dos grupos en vez de una sola lista.
const GRUPO_CLASES = ["teoria1", "teoria2", "teoria3", "piscina", "caleta1", "caleta2", "caletaNocturna"];
const GRUPO_ENTREGA = ["record", "identificacion", "foto", "equipos", "gorra"];

function EditarCurso({ c, ops, yo, cerrar }) {
  const [borrando, setBorrando] = useState(false);
  const [f, setF] = useState({ ...c, precio: c.precio == null ? "" : formatoPrecioInput(String(c.precio)) });
  const [iti, setIti] = useState(() => itiInicial(c));
  const plantilla = plantillaDe(iti, f.pasos, f.llevaExamen);
  const chocan = choquesIti(plantilla).size > 0;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (lista, v) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  async function guardar() {
    if (!f.nombre.trim() || chocan) return;
    const { nuevo, ...resto } = f;
    // V106: el itinerario sale de la tabla de abajo (info.itinerario) y los
    // textos por día se arman de ahí.
    const { itinerario: _viejo, ...infoSin } = f.info || {};
    const info = plantilla.length ? { ...infoSin, itinerario: plantilla } : infoSin;
    const semana = semanaDePlantilla(plantilla);
    await ops.guardarCurso({ ...resto, info, nombre: f.nombre.trim(), precio: f.precio === "" ? null : Number(f.precio.replace(/,/g, "")), semana }, !!nuevo);
    cerrar();
  }
  return (
    <div className="ce-etapa">
      <h4>{c.nuevo ? "Nuevo curso" : `Editar: ${c.nombre}`}</h4>
      <div className="ce-form">
        <div className="ce-form-fila">
          <label>
            Nombre
            <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} autoFocus={!!c.nuevo} />
          </label>
          <label>
            Precio con ITBIS incluidos (RD$)
            <input inputMode="numeric" value={f.precio} onChange={(e) => set("precio", formatoPrecioInput(e.target.value))} placeholder="Sin precio" />
          </label>
        </div>
        {/* V103 (maqueta V106; "fíjate el mini mensajito... así es que lo quiero", "no en paréntesis"):
            la etiqueta corta junto al nombre ("Buceo básico"), la misma que ya salía en el app Gus Dive
            (info.nivel). Ahora se cambia aquí y sale también en el link de registro. */}
        <label>
          Descripción corta
          <input value={f.info?.nivel || ""} maxLength={40} onChange={(e) => set("info", { ...(f.info || {}), nivel: e.target.value })} placeholder="Ej. Curso básico para principiantes" />
          <span className="hint-text" style={{ margin: 0, fontWeight: 400 }}>
            Sale como etiqueta al lado del nombre, en el app Gus Dive y en el link de registro. Vacía, no sale nada.
          </span>
        </label>
        {/* V55: solo SNSI, así que no se escoge escuela. */}
        {ESCUELAS.length > 1 && (
          <>
            <div className="hint-text" style={{ margin: 0 }}>
              Escuelas
            </div>
            <div className="ce-checks">
              {ESCUELAS.map((x) => (
                <label key={x}>
                  <input type="checkbox" checked={f.escuelas.includes(x)} onChange={() => set("escuelas", toggle(f.escuelas, x))} /> {x}
                </label>
              ))}
            </div>
          </>
        )}
        {/* V91 (maqueta v92, aprobada): el paso "Entregado al instructor" con QR; se puede apagar aquí. */}
        <div className="ce-checks">
          <label>
            <input type="checkbox" checked={f.info?.qr_instructor !== false} onChange={(e) => set("info", { ...(f.info || {}), qr_instructor: e.target.checked })} /> Entregar el presupuesto al instructor con QR (el QR vence a los 15 minutos)
          </label>
        </div>
        {/* V98 (maqueta V99, "29. A por ahora"): los presupuestos predeterminados del curso, por cantidad de estudiantes. */}
        <div className="ce-pasos-grupo-t">Presupuestos</div>
        <PresupuestosCurso info={f.info} setInfo={(info) => set("info", info)} />
        <div className="hint-text" style={{ margin: 0 }}>
          Pasos que lleva (los demás le salen al estudiante como N/A)
        </div>
        <div className="ce-pasos-grupo-t">Clases y mar</div>
        <div className="ce-checks">
          {PASOS.filter((x) => GRUPO_CLASES.includes(x.k)).map((x) => (
            <label key={x.k}>
              <input type="checkbox" checked={f.pasos.includes(x.k)} onChange={() => set("pasos", toggle(f.pasos, x.k))} /> {x.t}
            </label>
          ))}
          <label>
            <input type="checkbox" checked={f.llevaExamen} onChange={(e) => set("llevaExamen", e.target.checked)} /> Examen
          </label>
        </div>
        <div className="ce-pasos-grupo-t">Entrega y documentos</div>
        <div className="ce-checks">
          {PASOS.filter((x) => GRUPO_ENTREGA.includes(x.k)).map((x) => (
            <label key={x.k}>
              <input type="checkbox" checked={f.pasos.includes(x.k)} onChange={() => set("pasos", toggle(f.pasos, x.k))} /> {x.t}
            </label>
          ))}
        </div>
        {/* V106 (maqueta V110): el itinerario se edita aquí. */}
        <div className="ce-pasos-grupo-t">Itinerario</div>
        <ItinerarioCatalogo iti={iti} setIti={setIti} pasos={f.pasos} llevaExamen={f.llevaExamen} />
        {chocan && <div className="pb-error" style={{ margin: 0 }}>Dos actividades caen el mismo día. Cambia una para poder guardar.</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary vj-btn" onClick={guardar} disabled={chocan}>
            Guardar
          </button>
          <button className="btn secondary vj-btn" onClick={cerrar}>
            Cancelar
          </button>
          {!c.nuevo && yo?.esTitular && !borrando && (
            <button className="btn secondary vj-btn vj-rojo-txt" onClick={() => setBorrando(true)}>
              Borrar este curso
            </button>
          )}
        </div>
        {borrando && (
          <div className="vj-borrar" style={{ marginTop: 8 }}>
            <b>¿Borrar {c.nombre}?</b>
            <div className="hint-text" style={{ color: "#8a2020" }}>
              Se borran también sus fechas. Los estudiantes que lo tomaron se quedan con el nombre del curso. No se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="btn danger" style={{ width: "auto", marginTop: 0 }} onClick={async () => (await ops.borrarCurso(c)) && cerrar()}>
                Sí, borrar
              </button>
              <button className="btn secondary vj-btn" onClick={() => setBorrando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        <div className="hint-text">Los pasos cambian también para los estudiantes que ya están en curso. El precio nuevo sale en los estudiantes nuevos.</div>
      </div>
    </div>
  );
}

