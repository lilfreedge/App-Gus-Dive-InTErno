"use client";

import { useState } from "react";
import { Buscar, CampoCel, IconoWA, Modal } from "@/components/viajes/Piezas";
import { IconPlus, IconLink } from "@/components/icons";
import { ESTADOS_INTERESADO, FUENTES, linkWhatsApp, hoyISO, fechaCorta, fechaDeIso, soloDigitos } from "@/lib/estudiantes/modelo";
import { formatoCel } from "@/lib/viajes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";
import { copiarLink } from "./Inicio";

// Interesados (1-nov-2026: "Me interesa poder tener un listado de
// interesados también"): los que preguntan por un curso y todavía no se
// inscriben. "Inscribir" los pasa a Estudiantes.
const VACIO = { nombre: "", cel: "", curso: "", cuando: "", fuente: "Instagram", nota: "", recordar: "" };

export function Interesados({ db, p, ops, ir, avisar }) {
  const [filtro, setFiltro] = useState("nuevo");
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const t = q.trim().toLowerCase();
  const td = soloDigitos(q);
  const hoy = hoyISO();
  const lista = db.interesados
    .filter((x) => (t ? (x.nombre || "").toLowerCase().includes(t) || (td.length >= 4 && soloDigitos(x.cel).includes(td)) : x.estado === filtro))
    .sort((a, b) => (a.recordar && a.recordar <= hoy ? -1 : 0) - (b.recordar && b.recordar <= hoy ? -1 : 0));
  const cursos = db.cursos.filter((c) => c.activo).map((c) => c.nombre);

  function guardarNuevo() {
    if (!nuevo.nombre.trim()) return avisar("Falta el nombre.");
    const x = { ...nuevo, id: nuevoId(), nombre: nuevo.nombre.trim(), cel: soloDigitos(nuevo.cel), estado: "nuevo", via: "mano", creadoEn: new Date().toISOString() };
    ops.guardarInteresado(x, true, `Agregó un interesado: ${x.nombre}${x.curso ? ` (${x.curso})` : ""}`);
    setNuevo(null);
    setFiltro("nuevo");
  }

  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 4 }}>
        Interesados
      </h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
        <button className="btn btn-primary vj-btn" onClick={() => setNuevo({ ...VACIO, curso: cursos[0] || "" })}>
          <IconPlus size={16} /> Agregar interesado
        </button>
        <button className="btn secondary vj-btn" onClick={() => copiarLink("/me-interesa", avisar, 'Link "Me interesa" copiado')}>
          <IconLink size={16} /> Copiar link &quot;Me interesa&quot;
        </button>
      </div>
      {nuevo && (
        <div className="ce-etapa">
          <h4>Nuevo interesado</h4>
          <FormInteresado f={nuevo} setF={setNuevo} cursos={cursos} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary vj-btn" onClick={guardarNuevo}>
              Guardar
            </button>
            <button className="btn secondary vj-btn" onClick={() => setNuevo(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      <div className="vj-filtros">
        {ESTADOS_INTERESADO.map((e) => (
          <button key={e.v} className={`vj-filtro ce-filtro${filtro === e.v && !t ? " sel" : ""}`} onClick={() => (setFiltro(e.v), setQ(""))}>
            {e.t} <span>{db.interesados.filter((x) => x.estado === e.v).length}</span>
          </button>
        ))}
      </div>
      <Buscar value={q} onChange={setQ} placeholder="Buscar por nombre o celular…" />
      {lista.map((x) => (
        <div key={x.id} className="ce-est" role="button" tabIndex={0} onClick={() => setAbierto(x)}>
          <div className="ce-est-t">
            <b>{x.nombre}</b>
            {x.curso && <span className="ce-chip curso">{x.curso}</span>}
          </div>
          <div className="ce-est-m">
            {[x.fuente, x.via === "link" ? "por el link" : "", fechaDeIso(x.creadoEn), x.cuando ? `quiere empezar ${x.cuando}` : ""].filter(Boolean).join(" · ")}
          </div>
          {x.recordar && !["inscrito", "no"].includes(x.estado) && (
            <div className={`ce-est-m${x.recordar <= hoy ? " ce-recordar" : ""}`}>{x.recordar <= hoy ? "Escribirle de nuevo hoy" : `Escribirle de nuevo el ${fechaCorta(x.recordar)}`}</div>
          )}
          {!["inscrito", "no"].includes(x.estado) && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
              {x.cel && (
                <button
                  className="btn vj-mini ce-wa"
                  onClick={() => {
                    window.open(linkWhatsApp(x.cel, `Hola ${x.nombre.split(" ")[0]}, te escribimos de Gus Dive Center por el curso${x.curso ? ` de ${x.curso}` : ""}.`), "_blank", "noopener");
                    if (x.estado === "nuevo") ops.guardarInteresado({ ...x, estado: "escribimos" }, false, `Le escribió a un interesado: ${x.nombre}`);
                  }}
                >
                  <IconoWA on /> WhatsApp
                </button>
              )}
              {p.estudiantes && (
                <button className="btn secondary vj-mini" onClick={() => ir(`nuevo:${x.id}`)}>
                  Inscribir
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      {!lista.length && <div className="card hint-text">{t ? "No hay nadie con esa búsqueda." : "No hay nadie aquí."}</div>}
      {abierto && <DetalleInteresado x={db.interesados.find((y) => y.id === abierto.id) || abierto} db={db} p={p} ops={ops} ir={ir} cursos={cursos} cerrar={() => setAbierto(null)} />}
    </>
  );
}

function FormInteresado({ f, setF, cursos }) {
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="ce-form">
      <div className="ce-form-fila">
        <label>
          Nombre
          <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} autoFocus />
        </label>
        <label>
          Celular
          <CampoCel value={f.cel ? formatoCel(f.cel) : ""} onChange={(v) => set("cel", v)} />
        </label>
      </div>
      <div className="ce-form-fila">
        <label>
          Curso que le interesa
          <select value={f.curso} onChange={(e) => set("curso", e.target.value)}>
            <option value="">No sabe todavía</option>
            {cursos.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          ¿Cómo se enteró?
          <select value={f.fuente} onChange={(e) => set("fuente", e.target.value)}>
            {FUENTES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="ce-form-fila">
        <label>
          ¿Cuándo quiere empezar?
          <input value={f.cuando} onChange={(e) => set("cuando", e.target.value)} placeholder="Ej. en diciembre" />
        </label>
        <label>
          Escribirle de nuevo el
          <input type="date" value={f.recordar || ""} onChange={(e) => set("recordar", e.target.value)} />
        </label>
      </div>
      <label>
        Nota
        <input value={f.nota} onChange={(e) => set("nota", e.target.value)} />
      </label>
    </div>
  );
}

function DetalleInteresado({ x, db, p, ops, ir, cursos, cerrar }) {
  const [f, setF] = useState(x);
  const est = x.estudianteId ? db.estudiantes.find((e) => e.id === x.estudianteId) : null;
  return (
    <Modal titulo={x.nombre} sub={x.via === "link" ? `Llegó por el link · ${fechaDeIso(x.creadoEn)}` : fechaDeIso(x.creadoEn)} cerrar={cerrar}>
      {p.interesados ? <FormInteresado f={f} setF={setF} cursos={cursos} /> : null}
      <label className="hint-text" style={{ display: "block", marginTop: 8 }}>
        Estado
      </label>
      <div className="vj-filtros">
        {ESTADOS_INTERESADO.filter((e) => e.v !== "inscrito" || x.estado === "inscrito").map((e) => (
          <button key={e.v} className={`vj-filtro ce-filtro${f.estado === e.v ? " sel" : ""}`} disabled={!p.interesados} onClick={() => setF({ ...f, estado: e.v })}>
            {e.t}
          </button>
        ))}
      </div>
      {est && (
        <a className="vj-link" onClick={() => (cerrar(), ir(`estudiante:${est.id}`))}>
          Ver su ficha de estudiante ({est.curso}) ›
        </a>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {p.interesados && (
          <button
            className="btn btn-primary vj-btn"
            onClick={() => {
              ops.guardarInteresado({ ...f, cel: soloDigitos(f.cel) }, false, f.estado !== x.estado ? `Cambió un interesado: ${x.nombre}` : null);
              cerrar();
            }}
          >
            Guardar
          </button>
        )}
        {p.estudiantes && x.estado !== "inscrito" && (
          <button className="btn secondary vj-btn" onClick={() => (cerrar(), ir(`nuevo:${x.id}`))}>
            Inscribir
          </button>
        )}
      </div>
    </Modal>
  );
}
