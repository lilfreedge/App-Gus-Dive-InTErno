"use client";

import { useState } from "react";
import { debe, rd, hoyISO, pagoInstructorPendiente } from "@/lib/estudiantes/modelo";

// V67 ("4. está bien así, pero pon las secciones cerradas", maqueta V67):
// Control Estudiantes › Más › Estadísticas. Arriba se escoge el tiempo y
// salen cuatro números; abajo, las secciones cerradas (se abren al tocarlas).
// La ve quien tiene "Ver estadísticas"; los montos, solo si también puede ver
// montos. Todo sale de lo que ya está en el app.
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const PERIODOS = [
  { k: "mes", t: "Este mes" },
  { k: "6", t: "Últimos 6 meses" },
  { k: "ano", t: "Este año" },
];

function desdeDe(periodo, hoy) {
  const [a, m] = hoy.split("-").map(Number);
  if (periodo === "mes") return `${a}-${String(m).padStart(2, "0")}-01`;
  if (periodo === "ano") return `${a}-01-01`;
  const d = new Date(Date.UTC(a, m - 1 - 5, 1));
  return d.toISOString().slice(0, 10);
}
function mesesDesde(desde, hoy) {
  const out = [];
  let [a, m] = desde.split("-").map(Number);
  const [ha, hm] = hoy.split("-").map(Number);
  while (a < ha || (a === ha && m <= hm)) {
    out.push({ k: `${a}-${String(m).padStart(2, "0")}`, t: MESES[m - 1] });
    m += 1;
    if (m > 12) (m = 1), (a += 1);
  }
  return out;
}
const dia = (iso) => String(iso || "").slice(0, 10);
const diasEntre = (a, b) => Math.round((new Date(dia(b) + "T12:00:00") - new Date(dia(a) + "T12:00:00")) / 86400000);
const compacto = (n) => (n >= 1000000 ? `RD$${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M` : n >= 10000 ? `RD$${Math.round(n / 1000)}K` : rd(n));

function Seccion({ titulo, resumen, sub, children }) {
  return (
    <details className="card ce-st-sec">
      <summary>
        <span>
          <b>{titulo}</b>
          {sub && <span className="hint-text">{sub}</span>}
        </span>
        <span className="ce-st-res">
          {resumen}
          <i aria-hidden="true">▸</i>
        </span>
      </summary>
      <div className="ce-st-cuerpo">{children}</div>
    </details>
  );
}

function Barras({ filas, vacio = "Nada en este tiempo." }) {
  const max = Math.max(1, ...filas.map((f) => f.v));
  if (!filas.length || filas.every((f) => !f.v)) return <div className="hint-text">{vacio}</div>;
  return filas.map((f) => (
    <div key={f.t} className="ce-st-hb" title={`${f.t}: ${f.v}`}>
      <span>{f.t}</span>
      <div className="ce-st-barra">
        <i style={{ width: `${Math.max(2, Math.round((f.v / max) * 100))}%` }} />
      </div>
      <b>{f.v}</b>
    </div>
  ));
}

export function Estadisticas({ db, p, ir }) {
  const [periodo, setPeriodo] = useState("6");
  const hoy = hoyISO();
  const desde = desdeDe(periodo, hoy);
  const en = (iso) => !!iso && dia(iso) >= desde && dia(iso) <= hoy;
  const ests = db.estudiantes || [];

  // Estudiantes nuevos: los que empezaron un curso en este tiempo.
  const empezo = (e) => e.fechaInicio || dia(e.creadoEn);
  const nuevos = ests.filter((e) => !["cancelado", "espera"].includes(e.estado) && en(empezo(e)));
  const certificados = ests.filter((e) => en(e.etapas?.avisado?.en));
  const pagos = ests.flatMap((e) => (e.estado === "cancelado" ? [] : e.pagos || [])).filter((x) => en(x.fecha));
  const cobrado = pagos.reduce((a, x) => a + (Number(x.monto) || 0), 0);
  const confirmado = pagos.filter((x) => x.conciliado).reduce((a, x) => a + (Number(x.monto) || 0), 0);
  const deudores = ests.filter((e) => e.estado !== "cancelado" && debe(e) > 0);
  const porCobrar = deudores.reduce((a, e) => a + (debe(e) || 0), 0);

  const meses = mesesDesde(desde, hoy).map((m) => ({ ...m, v: nuevos.filter((e) => dia(empezo(e)).slice(0, 7) === m.k).length }));
  const maxMes = Math.max(1, ...meses.map((m) => m.v));

  const cuentaCurso = {};
  for (const e of nuevos) cuentaCurso[e.curso || "—"] = (cuentaCurso[e.curso || "—"] || 0) + 1;
  let porCurso = Object.entries(cuentaCurso)
    .map(([t, v]) => ({ t, v }))
    .sort((a, b) => b.v - a.v);
  if (porCurso.length > 6) porCurso = [...porCurso.slice(0, 5), { t: "Otros", v: porCurso.slice(5).reduce((a, x) => a + x.v, 0) }];

  const ints = (db.interesados || []).filter((x) => en(x.creadoEn));
  const escritos = ints.filter((x) => x.estado !== "nuevo" || (x.seguimiento || []).length > 0);
  const inscritos = ints.filter((x) => x.estado === "inscrito" || x.estudianteId);

  const conTiempo = certificados.filter((e) => e.etapas?.mandado?.en).map((e) => diasEntre(e.etapas.mandado.en, e.etapas.avisado.en));
  const promedio = conTiempo.length ? Math.round(conTiempo.reduce((a, x) => a + x, 0) / conTiempo.length) : null;
  const atrasados = ests.filter((e) => ["almacen", "certificacion"].includes(e.estado) && e.etapas?.mandado?.en && diasEntre(e.etapas.mandado.en, hoy) > 30);

  const cuentaEspera = {};
  for (const e of ests.filter((x) => x.estado === "espera")) cuentaEspera[e.curso || "—"] = (cuentaEspera[e.curso || "—"] || 0) + 1;
  const espera = Object.entries(cuentaEspera)
    .map(([t, v]) => ({ t, v }))
    .sort((a, b) => b.v - a.v);

  const inst = {};
  for (const e of nuevos) {
    const k = e.instructor || "Sin instructor";
    inst[k] = inst[k] || { n: 0, falta: 0 };
    inst[k].n += 1;
  }
  for (const e of ests.filter(pagoInstructorPendiente)) {
    const k = e.instructor || "Sin instructor";
    inst[k] = inst[k] || { n: 0, falta: 0 };
    inst[k].falta += 1;
  }
  const porInstructor = Object.entries(inst).sort((a, b) => b[1].n - a[1].n);
  const textoPeriodo = periodo === "mes" ? "este mes" : periodo === "ano" ? "este año" : "en 6 meses";

  return (
    <>
      <a className="back-link" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">Estadísticas</h1>
      <div className="ce-st-periodo" role="tablist">
        {PERIODOS.map((x) => (
          <button key={x.k} type="button" className={periodo === x.k ? "sel" : ""} onClick={() => setPeriodo(x.k)}>
            {x.t}
          </button>
        ))}
      </div>
      <div className="ce-st-kpis">
        <div className="card">
          <span>Estudiantes nuevos</span>
          <b>{nuevos.length}</b>
          <i>{textoPeriodo}</i>
        </div>
        <div className="card">
          <span>Certificados</span>
          <b>{certificados.length}</b>
          <i>ya avisados</i>
        </div>
        {p.montos && (
          <>
            <div className="card">
              <span>Cobrado</span>
              <b>{compacto(cobrado)}</b>
              <i>{confirmado === cobrado ? "pagos registrados" : `${compacto(confirmado)} confirmados`}</i>
            </div>
            <div className="card">
              <span>Por cobrar</span>
              <b>{compacto(porCobrar)}</b>
              <i>
                {deudores.length} {deudores.length === 1 ? "estudiante" : "estudiantes"}, hoy
              </i>
            </div>
          </>
        )}
      </div>

      <Seccion titulo="Estudiantes por mes" sub="Los que empezaron un curso cada mes." resumen={nuevos.length}>
        <div className="ce-st-cols">
          {meses.map((m) => (
            <div key={m.k} title={`${m.t}: ${m.v} estudiantes`}>
              <em>{m.v}</em>
              <i style={{ height: `${Math.round((m.v / maxMes) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="ce-st-colx">
          {meses.map((m) => (
            <span key={m.k}>{m.t}</span>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Por curso" sub={`Estudiantes ${textoPeriodo}.`} resumen={porCurso.length ? `${porCurso.length} ${porCurso.length === 1 ? "curso" : "cursos"}` : "—"}>
        <Barras filas={porCurso} />
      </Seccion>

      <Seccion titulo="De interesado a estudiante" sub="Cuántos de los interesados terminaron inscribiéndose." resumen={ints.length ? `${inscritos.length} de ${ints.length}` : "—"}>
        <div className="ce-st-emb">
          <div>
            <b>{ints.length}</b>interesados
          </div>
          <span aria-hidden="true">›</span>
          <div>
            <b>{escritos.length}</b>les escribimos
          </div>
          <span aria-hidden="true">›</span>
          <div>
            <b>{inscritos.length}</b>se inscribieron
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Tiempo hasta la certificación" sub="Desde que se manda a procesar hasta que le avisamos." resumen={promedio == null ? "—" : `${promedio} ${promedio === 1 ? "día" : "días"}`}>
        <div className="ce-st-emb">
          <div>
            <b>{promedio == null ? "—" : `${promedio} ${promedio === 1 ? "día" : "días"}`}</b>en promedio
          </div>
          <div className={atrasados.length ? "rojo" : ""}>
            <b>{atrasados.length}</b>llevan más de 30 días
          </div>
        </div>
        {atrasados.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {atrasados.map((e) => (
              <a key={e.id} className="vj-link" style={{ display: "block", padding: "3px 0" }} onClick={() => ir(`estudiante:${e.id}`)}>
                {(db.buzos || []).find((b) => b.id === e.buzoId)?.nombre || "—"} · {e.curso} · {diasEntre(e.etapas.mandado.en, hoy)} días
              </a>
            ))}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Lista de espera" sub="Cuántos esperan fecha, por curso (hoy)." resumen={espera.reduce((a, x) => a + x.v, 0)}>
        <Barras filas={espera} vacio="Nadie en lista de espera." />
      </Seccion>

      <Seccion titulo="Por instructor" sub={`Estudiantes ${textoPeriodo} y a cuántos falta pagarle.`} resumen={porInstructor.length ? `${porInstructor.length}` : "—"}>
        {porInstructor.length ? (
          <table className="ce-st-tabla">
            <thead>
              <tr>
                <th>Instructor</th>
                <th>Estudiantes</th>
                <th>Falta pagarle</th>
              </tr>
            </thead>
            <tbody>
              {porInstructor.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v.n}</td>
                  <td className={v.falta ? "rojo" : ""}>{v.falta ? `${v.falta} ${v.falta === 1 ? "estudiante" : "estudiantes"}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="hint-text">Nada en este tiempo.</div>
        )}
      </Seccion>
    </>
  );
}
