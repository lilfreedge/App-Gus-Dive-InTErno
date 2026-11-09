"use client";

import { useState } from "react";
import { Buscar, CampoCel, IconoWA, Modal } from "@/components/viajes/Piezas";
import { IconPlus } from "@/components/icons";
import { ESTADOS_INTERESADO, FUENTES, linkWhatsApp, hoyISO, fechaCorta, fechaDeIso, soloDigitos, fechaCursoCorta } from "@/lib/estudiantes/modelo";
import FechaNacimiento from "@/components/FechaNacimiento";
import { formatoCel } from "@/lib/viajes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";
import CompartirLink from "@/components/CompartirLink";

// Interesados (1-nov-2026: "Me interesa poder tener un listado de
// interesados también"): los que preguntan por un curso y todavía no se
// inscriben. "Inscribir" los pasa a Estudiantes.
const VACIO = { nombre: "", cel: "", curso: "", cuando: "", fuente: "Instagram", nota: "", recordar: "", seguimiento: [] };

// V62 ("245. ok", maqueta V62): un seguimiento como el de los Holds y el de
// las fichas. Cada interesado tiene su historia (qué le dijiste, qué te dijo y
// cuándo volver a escribirle). El estado se pone solo según lo último que se
// anota.
export const TIPOS_SEG_INT = [
  { k: "escribi", t: "Le escribí", estado: "escribimos" },
  { k: "no_contesta", t: "No contesta", estado: "escribimos" },
  { k: "va", t: "Va a inscribirse", estado: "va" },
  { k: "otra_fecha", t: "Quiere otra fecha", estado: "escribimos" },
  { k: "no", t: "No le interesa", estado: "no" },
];
const tipoSeg = (k) => TIPOS_SEG_INT.find((x) => x.k === k) || { k, t: k === "nota" ? "Nota" : k === "inscrito" ? "Se inscribió" : "Anotó" };
const cuandoFue = (iso) => {
  if (!iso) return "";
  // La hora guardada es UTC; aquí se pasa a la hora de RD (UTC-4).
  const t = new Date(iso).getTime();
  const d = isNaN(t) ? String(iso).slice(0, 10) : new Date(t - 4 * 3600 * 1000).toISOString().slice(0, 10);
  const h = hoyISO();
  const ayer = new Date(new Date(h + "T12:00:00").getTime() - 86400000).toISOString().slice(0, 10);
  return d === h ? "hoy" : d === ayer ? "ayer" : fechaCorta(d);
};
// La historia completa, la más nueva arriba. La primera línea (cómo llegó) y
// la nota vieja (de antes del seguimiento) salen aunque no estén guardadas.
export function historiaInteresado(x) {
  const lista = [...(x.seguimiento || [])].sort((a, b) => String(b.en || "").localeCompare(String(a.en || "")));
  const base = [];
  if (x.nota) base.push({ id: "nota", tipo: "nota", texto: x.nota, en: x.creadoEn, fija: true });
  base.push({ id: "llego", tipo: "llego", t: x.via === "link" ? "Se anotó por el link" : "Lo agregaron a mano", en: x.creadoEn, fija: true });
  const arriba = x.estado === "inscrito" && !lista.some((h) => h.tipo === "inscrito") ? [{ id: "inscrito", tipo: "inscrito", t: "Se inscribió", fija: true }] : [];
  return [...arriba, ...lista, ...base];
}
const ultimo = (x) => [...(x.seguimiento || [])].sort((a, b) => String(b.en || "").localeCompare(String(a.en || "")))[0] || null;

export function Interesados({ db, p, yo, ops, ir, avisar }) {
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
        {/* V62 ("249"): "Lo mismo para Me interesa". */}
        <CompartirLink ruta="/me-interesa" etiqueta='Compartir link "Me interesa"' mensaje="Hola, aquí te dejo el link para que nos dejes tus datos y te mandemos la información de los cursos:" tituloQr="Información de cursos" avisar={avisar} />
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
      {lista.map((x) => {
        const u = ultimo(x);
        return (
          <div key={x.id} className="ce-est" role="button" tabIndex={0} onClick={() => setAbierto(x)}>
            <div className="ce-est-t">
              <b>{x.nombre}</b>
              {x.curso && <span className="ce-chip curso">{x.curso}</span>}
              {/* V60 ("164"): si ya es buzo o estudiante de Gus. */}
              {x.buzoId && <span className="ce-chip">Ya es buzo de Gus</span>}
            </div>
            {/* V62 ("245"): en la lista se ve lo último que pasó. */}
            <div className="ce-est-m ce-int-ult">
              {u
                ? [`Último: "${tipoSeg(u.tipo).t}"`, u.quien, cuandoFue(u.en)].filter(Boolean).join(" · ") + (u.texto ? ` · ${u.texto}` : "")
                : x.estado === "nuevo"
                  ? `Nuevo, nadie le ha escrito · ${x.via === "link" ? "por el link" : x.fuente || "a mano"} · ${fechaDeIso(x.creadoEn)}`
                  : [x.fuente, x.via === "link" ? "por el link" : "", fechaDeIso(x.creadoEn)].filter(Boolean).join(" · ")}
            </div>
            {x.recordar && !["inscrito", "no"].includes(x.estado) && (
              <div className={`ce-est-m${x.recordar <= hoy ? " ce-recordar" : ""}`}>{x.recordar <= hoy ? "Escribirle de nuevo hoy" : `Escribirle de nuevo el ${fechaCursoCorta(x.recordar)}`}</div>
            )}
            {!["inscrito", "no"].includes(x.estado) && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                {x.cel && (
                  <button
                    className="btn vj-mini ce-wa"
                    onClick={() => {
                      window.open(linkWhatsApp(x.cel, `Hola ${x.nombre.split(" ")[0]}, te escribimos de Gus Dive Center por el curso${x.curso ? ` de ${x.curso}` : ""}.`), "_blank", "noopener");
                      if (x.estado === "nuevo")
                        ops.guardarInteresado(
                          { ...x, estado: "escribimos", seguimiento: [...(x.seguimiento || []), { id: nuevoId(), tipo: "escribi", texto: "Por WhatsApp", quien: yo?.corto || "", en: new Date().toISOString() }] },
                          false,
                          `Le escribió a un interesado: ${x.nombre}`
                        );
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
        );
      })}
      {!lista.length && <div className="card hint-text">{t ? "No hay nadie con esa búsqueda." : "No hay nadie aquí."}</div>}
      {abierto && <DetalleInteresado x={db.interesados.find((y) => y.id === abierto.id) || abierto} db={db} p={p} yo={yo} ops={ops} ir={ir} cursos={cursos} avisar={avisar} cerrar={() => setAbierto(null)} />}
    </>
  );
}

function FormInteresado({ f, setF, cursos, sinRecordar }) {
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
        {!sinRecordar && (
          <label>
            Escribirle de nuevo el
            <input type="date" value={f.recordar || ""} onChange={(e) => set("recordar", e.target.value)} />
          </label>
        )}
      </div>
      <label>
        Nota
        <input value={f.nota} onChange={(e) => set("nota", e.target.value)} />
      </label>
    </div>
  );
}

// V62 ("245"): al tocar a alguien se abre su ficha con el seguimiento, en vez
// del formulario. Los datos se cambian con "Editar datos".
function DetalleInteresado({ x, db, p, yo, ops, ir, cursos, cerrar, avisar }) {
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState(x);
  const [tipo, setTipo] = useState("");
  const [texto, setTexto] = useState("");
  const [recordar, setRecordar] = useState(x.recordar || "");
  const [llaveFecha, setLlaveFecha] = useState(0);
  // V57 -- "dame ese poder absoluto": el Titular puede borrar un interesado.
  const [borrando, setBorrando] = useState(false);
  const est = x.estudianteId ? db.estudiantes.find((e) => e.id === x.estudianteId) : null;
  const historia = historiaInteresado(x);
  const cerradoYa = x.estado === "inscrito";

  function anotar() {
    if (!tipo && !texto.trim() && recordar === (x.recordar || "")) return avisar("Escoge qué pasó o escribe algo.");
    const entrada = tipo || texto.trim() ? { id: nuevoId(), tipo: tipo || "nota", texto: texto.trim(), quien: yo?.corto || "", en: new Date().toISOString() } : null;
    const nuevoEstado = tipo ? tipoSeg(tipo).estado : x.estado === "nuevo" && entrada ? "escribimos" : x.estado;
    const y = { ...x, seguimiento: entrada ? [...(x.seguimiento || []), entrada] : x.seguimiento || [], estado: cerradoYa ? x.estado : nuevoEstado, recordar: tipo === "no" ? "" : recordar };
    ops.guardarInteresado(y, false, entrada ? `Seguimiento de un interesado: ${x.nombre} (${tipoSeg(entrada.tipo).t}${entrada.texto ? `: ${entrada.texto}` : ""})` : `Cambió cuándo escribirle a un interesado: ${x.nombre}`);
    setTipo("");
    setTexto("");
  }

  return (
    <Modal titulo={x.nombre} sub={[x.curso || "Sin curso todavía", x.via === "link" ? "por el link" : "a mano", fechaDeIso(x.creadoEn), x.cel ? formatoCel(x.cel) : ""].filter(Boolean).join(" · ")} cerrar={cerrar}>
      <div className="ce-int-acc">
        {x.cel && (
          <a className="btn vj-mini ce-wa" href={linkWhatsApp(x.cel, `Hola ${x.nombre.split(" ")[0]}, te escribimos de Gus Dive Center por el curso${x.curso ? ` de ${x.curso}` : ""}.`)} target="_blank" rel="noopener noreferrer">
            <IconoWA on /> WhatsApp
          </a>
        )}
        {p.estudiantes && !cerradoYa && (
          <button className="btn secondary vj-mini" onClick={() => (cerrar(), ir(`nuevo:${x.id}`))}>
            Inscribir
          </button>
        )}
        {p.interesados && (
          <button className="btn secondary vj-mini" onClick={() => (setF(x), setEditando((e) => !e))}>
            {editando ? "Cerrar datos" : "Editar datos"}
          </button>
        )}
      </div>
      {x.buzoId && <div className="hint-text" style={{ marginTop: 6 }}>Ya es buzo de Gus.</div>}
      {est && (
        <a className="vj-link" onClick={() => (cerrar(), ir(`estudiante:${est.id}`))}>
          Ver su ficha de estudiante ({est.curso}) ›
        </a>
      )}

      {editando && (
        <div className="ce-etapa" style={{ marginTop: 10 }}>
          <FormInteresado f={f} setF={setF} cursos={cursos} sinRecordar />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-primary vj-btn"
              onClick={() => {
                if (!f.nombre.trim()) return avisar("Falta el nombre.");
                ops.guardarInteresado({ ...x, nombre: f.nombre.trim(), cel: soloDigitos(f.cel), curso: f.curso, fuente: f.fuente, cuando: f.cuando, nota: f.nota }, false, `Cambió los datos de un interesado: ${x.nombre}`);
                setEditando(false);
              }}
            >
              Guardar datos
            </button>
            <button className="btn secondary vj-btn" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="section-title" style={{ marginTop: 14 }}>
        Seguimiento
      </div>
      <div className="ce-int-hist">
        {historia.map((h) => (
          <div key={h.id} className={`ce-int-h${h.fija ? " fija" : ""}`}>
            <b>{h.t || tipoSeg(h.tipo).t}</b>
            <span>
              {[h.quien, cuandoFue(h.en)].filter(Boolean).join(" · ")}
              {h.texto ? ` · "${h.texto}"` : ""}
            </span>
          </div>
        ))}
      </div>

      {p.interesados && !cerradoYa && (
        <div className="ce-int-nuevo">
          <div className="hint-text" style={{ marginBottom: 6 }}>
            ¿Qué pasó? (el estado se pone solo)
          </div>
          <div className="vj-filtros" style={{ marginBottom: 6 }}>
            {TIPOS_SEG_INT.map((tp) => (
              <button key={tp.k} className={`vj-filtro ce-filtro${tipo === tp.k ? " sel" : ""}`} onClick={() => setTipo(tipo === tp.k ? "" : tp.k)}>
                {tp.t}
              </button>
            ))}
          </div>
          <input className="ce-int-txt" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Comentario (opcional): qué le dijiste o qué te dijo" />
          {tipo !== "no" && (
            <>
              <label className="hint-text" style={{ display: "block", margin: "10px 0 4px" }}>
                Escribirle de nuevo el
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <FechaNacimiento key={llaveFecha} value={recordar} onChange={setRecordar} futuro className="ce-int-fecha" />
                {recordar && (
                  <a className="vj-link" style={{ fontSize: 13 }} onClick={() => (setRecordar(""), setLlaveFecha((k) => k + 1))}>
                    Quitar fecha
                  </a>
                )}
              </div>
            </>
          )}
          <button className="btn btn-primary vj-btn" style={{ marginTop: 12 }} onClick={anotar}>
            Guardar
          </button>
        </div>
      )}

      {yo?.esTitular && (
        <div className="vj-borrar" style={{ marginTop: 14 }}>
          {borrando ? (
            <>
              <b>¿Borrar a {x.nombre} de Interesados?</b>
              <div className="hint-text">No se puede deshacer. Queda anotado en la bitácora.{est ? " Su ficha de estudiante no se toca." : ""}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn vj-btn vj-rojo" onClick={async () => (await ops.borrarInteresado(x)) && cerrar()}>
                  Sí, borrar
                </button>
                <button className="btn secondary vj-btn" onClick={() => setBorrando(false)}>
                  No
                </button>
              </div>
            </>
          ) : (
            <button className="btn secondary vj-mini vj-rojo-txt" onClick={() => setBorrando(true)}>
              Borrar este interesado…
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
