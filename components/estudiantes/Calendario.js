"use client";

import { useState } from "react";
import { cursosDelDia } from "@/components/viajes/Inicio";
import { hoyISO } from "@/lib/estudiantes/modelo";

// V59 ("161"; nota 2-nov: "un botón de calendario entre Estudiantes e
// Interesados vinculado con el calendario de buceos"): el mes, como en
// Buceos, con los cursos (amarillo, de lunes a domingo) y los buceos (azul).
// Es el mismo calendario: en Buceos también salen los cursos.
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function Calendario({ db, ir }) {
  const [mes, setMes] = useState(() => {
    const [a, m] = hoyISO().split("-").map(Number);
    return { a, m: m - 1 };
  });
  const primero = new Date(mes.a, mes.m, 1);
  const inicio = new Date(primero);
  inicio.setDate(1 - primero.getDay());
  const celdas = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
  const cambiarMes = (n) => setMes(({ a, m }) => ({ a: m + n < 0 ? a - 1 : m + n > 11 ? a + 1 : a, m: (m + n + 12) % 12 }));
  const nombreCurso = Object.fromEntries(db.cursos.map((c) => [c.id, c.nombre]));
  const cursosCal = (db.fechas || []).filter((f) => f.activo).map((f) => ({ id: f.id, nombre: nombreCurso[f.cursoId] || "Curso", inicio: f.inicio }));
  const hoy = hoyISO();
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
            const cursos = cursosDelDia(cursosCal, iso);
            const buceos = (db.viajes || []).filter((v) => v.fecha === iso && v.estado !== "cancelado");
            return (
              <div key={iso} className={`vj-cal-dia${d.getMonth() !== mes.m ? " fuera" : ""}${iso === hoy ? " hoy" : ""}`}>
                <div className="vj-cal-n">{d.getDate()}</div>
                {cursos.map((c) => (
                  <button key={c.id} type="button" className={`vj-cal-curso${c.dia === 1 ? " empieza" : ""}`} title={`${c.nombre} · día ${c.dia} de 7`} onClick={() => ir("cursos")} style={{ border: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                    {c.dia === 1 ? c.nombre : `${c.nombre.split(" ").map((w) => w[0]).join("").slice(0, 4)} · día ${c.dia}`}
                  </button>
                ))}
                {buceos.map((v) => (
                  <div key={v.id} className="vj-cal-viaje" style={{ cursor: "default" }} title={v.nombre}>
                    {v.nombre.split(/[,(]/)[0]}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="hint-text" style={{ marginTop: 8 }}>
          <span className="vj-cal-curso muestra">Curso</span> <span className="vj-cal-viaje muestra">Buceo</span> · Los cursos van de lunes a domingo. Es el mismo calendario de Buceos.
        </div>
        {db.sinViajes && <div className="hint-text">Para ver los buceos aquí, falta correr en Supabase el SQL de la V59.</div>}
      </div>
    </>
  );
}
