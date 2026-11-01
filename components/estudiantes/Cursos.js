"use client";

import { useState } from "react";
import { IconEdit, IconPlus } from "@/components/icons";
import { PASOS, ESCUELAS, rd } from "@/lib/estudiantes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";

// Cursos (de la pestaña DB del sheet): precio, escuelas y qué pasos lleva
// cada uno; los que no lleva le salen al estudiante como N/A solos. Y los
// instructores.
export function Cursos({ db, p, ops }) {
  const [edit, setEdit] = useState(null);
  const [nuevoInstr, setNuevoInstr] = useState("");
  const activos = db.cursos.filter((c) => c.activo);
  const inactivos = db.cursos.filter((c) => !c.activo);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Cursos
        </h1>
        {p.cursos && !edit && (
          <button className="btn btn-primary vj-btn" onClick={() => setEdit({ id: nuevoId(), nombre: "", escuelas: ["SNSI", "PADI"], precio: null, pasos: PASOS.map((x) => x.k), llevaExamen: true, activo: true, orden: 99, nuevo: true })}>
            <IconPlus size={16} /> Nuevo curso
          </button>
        )}
      </div>
      {edit && <EditarCurso c={edit} ops={ops} cerrar={() => setEdit(null)} />}
      <div style={{ marginTop: 12 }}>
        {activos.map((c) => (
          <div key={c.id} className="ce-curso">
            <div className="ce-est-t">
              <span>
                <b>{c.nombre}</b> <span className="ce-chip curso">{c.precio == null ? "Sin precio" : rd(c.precio)}</span> <span className="ce-chip gris">{c.escuelas.join(" · ") || "—"}</span>
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
        {inactivos.length > 0 && <div className="hint-text">Quitados: {inactivos.map((c) => c.nombre).join(", ")}</div>}
      </div>

      <div className="section-title">Instructores</div>
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
  );
}

function EditarCurso({ c, ops, cerrar }) {
  const [f, setF] = useState({ ...c, precio: c.precio == null ? "" : String(c.precio) });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (lista, v) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  async function guardar() {
    if (!f.nombre.trim()) return;
    const { nuevo, ...resto } = f;
    await ops.guardarCurso({ ...resto, nombre: f.nombre.trim(), precio: f.precio === "" ? null : Number(f.precio) }, !!nuevo);
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary vj-btn" onClick={guardar}>
            Guardar
          </button>
          <button className="btn secondary vj-btn" onClick={cerrar}>
            Cancelar
          </button>
          {!c.nuevo && (
            <button className="btn secondary vj-btn vj-rojo-txt" onClick={async () => (await ops.guardarCurso({ ...c, activo: false }, false), cerrar())}>
              Quitar este curso
            </button>
          )}
        </div>
        <div className="hint-text">Los pasos cambian también para los estudiantes que ya están en curso. El precio nuevo sale en los estudiantes nuevos.</div>
      </div>
    </div>
  );
}
