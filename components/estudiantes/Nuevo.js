"use client";

import { useState } from "react";
import { Atras, Buscar, CampoCel } from "@/components/viajes/Piezas";
import { ESCUELAS, pasosIniciales, soloDigitos, hoyISO } from "@/lib/estudiantes/modelo";
import { formatoCel, formatoCedula } from "@/lib/viajes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";

// Registrar un estudiante a mano. La persona se busca en Buzos (los de
// Buceos) o se crea nueva, y queda en los dos apps ("53. si y viceversa").
// Desde Interesados, llega con su nombre, celular y curso ya puestos.
export function Nuevo({ db, p, ops, ir, avisar, interesadoId }) {
  const interesado = interesadoId ? db.interesados.find((x) => x.id === interesadoId) : null;
  const cursos = db.cursos.filter((c) => c.activo);
  const cursoInt = interesado ? cursos.find((c) => c.nombre.toLowerCase() === String(interesado.curso || "").toLowerCase()) : null;
  const [q, setQ] = useState(interesado?.nombre || "");
  const [buzo, setBuzo] = useState(null);
  const [nueva, setNueva] = useState(interesado ? { nombre: interesado.nombre, doc: "", pasaporte: "", cel: interesado.cel ? formatoCel(interesado.cel) : "", correo: "", nac: "", direccion: "", emergencia: "" } : null);
  const primero = cursoInt || cursos[0];
  const [f, setF] = useState({
    cursoId: primero?.id || "",
    escuela: primero?.escuelas?.[0] || "",
    instructor: "",
    fechaInicio: hoyISO(),
    buceosPrevios: "",
    precio: primero?.precio == null ? "" : String(primero.precio),
  });
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const curso = cursos.find((c) => c.id === f.cursoId);

  const t = q.trim().toLowerCase();
  const td = soloDigitos(q);
  const resultados =
    t.length >= 2
      ? db.buzos
          .filter((b) => (b.nombre || "").toLowerCase().includes(t) || (td.length >= 4 && (soloDigitos(b.doc).includes(td) || soloDigitos(b.cel).includes(td))) || (b.pasaporte || "").toLowerCase().includes(t))
          .slice(0, 8)
      : [];

  function cambiarCurso(id) {
    const c = cursos.find((x) => x.id === id);
    setF((x) => ({ ...x, cursoId: id, escuela: c?.escuelas?.includes(x.escuela) ? x.escuela : c?.escuelas?.[0] || "", precio: c?.precio == null ? "" : String(c.precio) }));
  }

  async function guardar() {
    if (!buzo && !nueva) return avisar("Escoge o agrega a la persona.");
    if (nueva && !nueva.nombre.trim()) return avisar("Falta el nombre.");
    if (nueva && soloDigitos(nueva.cel).length !== 10) return avisar("Falta el celular completo.");
    if (!curso) return avisar("Escoge el curso.");
    if (nueva && nueva.doc && db.buzos.some((b) => soloDigitos(b.doc) === soloDigitos(nueva.doc))) return avisar("Esa cédula ya está en la base: búscala arriba.");
    setGuardando(true);
    const buzoNuevo = nueva
      ? {
          id: nuevoId(),
          nombre: nueva.nombre.trim(),
          doc: nueva.doc ? formatoCedula(nueva.doc) : "",
          pasaporte: nueva.pasaporte || "",
          cel: soloDigitos(nueva.cel),
          correo: nueva.correo.trim(),
          nac: nueva.nac,
          direccion: nueva.direccion.trim(),
          emergencia: nueva.emergencia.trim(),
          tallas: {},
          abono: 0,
          staff: false,
        }
      : null;
    const est = {
      id: nuevoId(),
      buzoId: buzoNuevo ? buzoNuevo.id : buzo.id,
      cursoId: curso.id,
      curso: curso.nombre,
      escuela: f.escuela,
      instructor: f.instructor,
      fechaInicio: f.fechaInicio,
      buceosPrevios: f.buceosPrevios === "" ? null : Number(f.buceosPrevios),
      pasos: pasosIniciales(curso),
      examen: curso.llevaExamen ? "pendiente" : "na",
      precio: f.precio === "" ? null : Number(f.precio),
      pagos: [],
      comprobantes: [],
      etapas: {},
      numeroCert: "",
      seguimiento: [],
      estado: "curso",
      via: "mano",
      interesadoId: interesado?.id || null,
      creadoEn: new Date().toISOString(),
    };
    const ok = await ops.crearEst(est, buzoNuevo, interesado);
    setGuardando(false);
    if (ok) {
      avisar("Estudiante registrado");
      ir(`estudiante:${est.id}`);
    }
  }

  return (
    <>
      <Atras onClick={() => ir(interesado ? "interesados" : "estudiantes")}>{interesado ? "Interesados" : "Estudiantes"}</Atras>
      <h1 className="page-title">Nuevo estudiante</h1>

      <div className="ce-etapa">
        <h4>1. La persona</h4>
        {buzo ? (
          <div className="ce-ck">
            <span>
              <b>{buzo.nombre}</b>
              <div className="hint-text" style={{ margin: 0 }}>
                {[buzo.doc || buzo.pasaporte, buzo.cel ? formatoCel(buzo.cel) : ""].filter(Boolean).join(" · ")}
              </div>
            </span>
            <button className="btn secondary vj-mini" onClick={() => setBuzo(null)}>
              Cambiar
            </button>
          </div>
        ) : nueva ? (
          <div className="ce-form">
            <label>
              Nombre completo
              <input value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} autoFocus />
            </label>
            <div className="ce-form-fila">
              <label>
                Cédula
                <input value={nueva.doc} onChange={(e) => setNueva({ ...nueva, doc: e.target.value })} placeholder="000-0000000-0" />
              </label>
              <label>
                Celular
                <CampoCel value={nueva.cel} onChange={(v) => setNueva({ ...nueva, cel: v })} />
              </label>
            </div>
            <div className="ce-form-fila">
              <label>
                Correo
                <input value={nueva.correo} onChange={(e) => setNueva({ ...nueva, correo: e.target.value })} />
              </label>
              <label>
                Fecha de nacimiento
                <input type="date" value={nueva.nac} onChange={(e) => setNueva({ ...nueva, nac: e.target.value })} />
              </label>
            </div>
            <label>
              Dirección
              <input value={nueva.direccion} onChange={(e) => setNueva({ ...nueva, direccion: e.target.value })} />
            </label>
            <label>
              Contacto de emergencia
              <input value={nueva.emergencia} onChange={(e) => setNueva({ ...nueva, emergencia: e.target.value })} placeholder="Nombre, celular y qué es suyo" />
            </label>
            <button className="btn secondary vj-mini" onClick={() => setNueva(null)}>
              Buscar en Buzos en vez de esto
            </button>
          </div>
        ) : (
          <>
            <Buscar value={q} onChange={setQ} placeholder="Buscar en Buzos por nombre, cédula o celular…" autoFocus />
            {resultados.map((b) => (
              <button key={b.id} className="ce-est" onClick={() => setBuzo(b)}>
                <div className="ce-est-t">
                  <b>{b.nombre}</b>
                  {db.estudiantes.some((e) => e.buzoId === b.id && !["entregada", "cancelado"].includes(e.estado)) && <span className="ce-chip alm">Ya tiene un curso abierto</span>}
                </div>
                <div className="ce-est-m">{[b.doc || b.pasaporte, b.cel ? formatoCel(b.cel) : "", b.nivel].filter(Boolean).join(" · ")}</div>
              </button>
            ))}
            {t.length >= 2 && !resultados.length && <div className="hint-text">No está en Buzos.</div>}
            <button className="btn secondary vj-btn" style={{ marginTop: 8 }} onClick={() => setNueva({ nombre: q.trim() && !/\d/.test(q) ? q.trim() : "", doc: /\d{6,}/.test(td) && td.length === 11 ? q : "", pasaporte: "", cel: "", correo: "", nac: "", direccion: "", emergencia: "" })}>
              + Persona nueva
            </button>
          </>
        )}
      </div>

      <div className="ce-etapa">
        <h4>2. El curso</h4>
        <div className="ce-form">
          <label>
            Curso
            <select value={f.cursoId} onChange={(e) => cambiarCurso(e.target.value)}>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="ce-form-fila">
            <label>
              Escuela
              <select value={f.escuela} onChange={(e) => set("escuela", e.target.value)}>
                {(curso?.escuelas?.length ? curso.escuelas : ESCUELAS).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Fecha de inicio
              <input type="date" value={f.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)} />
            </label>
          </div>
          <label>
            Instructor
            <select value={f.instructor} onChange={(e) => set("instructor", e.target.value)}>
              <option value="">Todavía no se sabe</option>
              {db.instructores
                .filter((i) => i.activo)
                .map((i) => (
                  <option key={i.id}>{i.nombre}</option>
                ))}
            </select>
          </label>
          <div className="ce-form-fila">
            <label>
              Buceos antes del curso
              <input inputMode="numeric" value={f.buceosPrevios} onChange={(e) => set("buceosPrevios", e.target.value.replace(/\D/g, ""))} placeholder="0" />
            </label>
            <label>
              Precio (RD$)
              <input inputMode="numeric" value={f.precio} disabled={!p.pagos} onChange={(e) => set("precio", e.target.value.replace(/[^\d.]/g, ""))} placeholder={curso?.precio == null ? "Sin precio" : ""} />
            </label>
          </div>
        </div>
      </div>
      <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={guardando} onClick={guardar}>
        {guardando ? "Guardando…" : "Registrar estudiante"}
      </button>
    </>
  );
}
