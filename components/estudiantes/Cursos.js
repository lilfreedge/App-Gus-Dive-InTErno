"use client";

import { useState } from "react";
import { IconEdit, IconPlus } from "@/components/icons";
import { PASOS, ESCUELAS, rd, DIAS_SEMANA, SEMANA_OWD } from "@/lib/estudiantes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";

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
      <h1 className="page-title">Base de datos</h1>
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

function EditarCurso({ c, ops, yo, cerrar }) {
  const [semana, setSemana] = useState(Array.isArray(c.semana) ? [...c.semana, "", "", "", "", "", "", ""].slice(0, 7) : ["", "", "", "", "", "", ""]);
  const [borrando, setBorrando] = useState(false);
  const [f, setF] = useState({ ...c, precio: c.precio == null ? "" : String(c.precio) });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (lista, v) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  async function guardar() {
    if (!f.nombre.trim()) return;
    const { nuevo, ...resto } = f;
    await ops.guardarCurso({ ...resto, nombre: f.nombre.trim(), precio: f.precio === "" ? null : Number(f.precio), semana: semana.some((x) => x.trim()) ? semana : null }, !!nuevo);
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
            Precio (RD$)
            <input inputMode="numeric" value={f.precio} onChange={(e) => set("precio", e.target.value.replace(/[^\d.]/g, ""))} placeholder="Sin precio" />
          </label>
        </div>
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
        <div className="hint-text" style={{ margin: 0 }}>
          Pasos que lleva (los demás le salen al estudiante como N/A)
        </div>
        <div className="ce-checks">
          {PASOS.map((x) => (
            <label key={x.k}>
              <input type="checkbox" checked={f.pasos.includes(x.k)} onChange={() => set("pasos", toggle(f.pasos, x.k))} /> {x.t}
            </label>
          ))}
          <label>
            <input type="checkbox" checked={f.llevaExamen} onChange={(e) => set("llevaExamen", e.target.checked)} /> Examen
          </label>
        </div>
        {/* V55: cómo es la semana (le sale al estudiante en el link al escoger
            la fecha; "79": por ahora solo Open Water). */}
        <div className="hint-text" style={{ margin: "4px 0 0" }}>
          Itinerario (opcional; empieza el lunes). Le sale al estudiante al escoger la fecha.
        </div>
        <div className="ce-semana-form">
          {DIAS_SEMANA.map((d, i) => (
            <label key={d}>
              {d}
              <input value={semana[i]} onChange={(e) => setSemana(semana.map((x, j) => (j === i ? e.target.value : x)))} placeholder="—" />
            </label>
          ))}
        </div>
        {!semana.some((x) => x.trim()) && /open water/i.test(f.nombre) && !/advanced/i.test(f.nombre) && (
          <a className="vj-link" onClick={() => setSemana([...SEMANA_OWD])}>
            Poner la de Open Water
          </a>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary vj-btn" onClick={guardar}>
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
