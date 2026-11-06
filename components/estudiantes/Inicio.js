"use client";

import { useState } from "react";
import { Buscar } from "@/components/viajes/Piezas";
import { IconHistory, IconUsers, IconLink, IconPlus, IconCatalog, IconEdit } from "@/components/icons";
import { listoParaAlmacen, pagoInstructorPendiente, debe, rd, avance, faltaDe, fechaCorta, hoyISO, nombreEtapa, soloDigitos, fechasDe, textoCupo, fechaCursoCorta, lunesProximos, ocupados, quedan } from "@/lib/estudiantes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";

// Pantallas de Control Estudiantes: Inicio, la lista, Más y la Bitácora.

export const cursoDe = (db, est) => db.cursos.find((c) => c.id === est.cursoId) || db.cursos.find((c) => c.nombre === est.curso) || null;
export const buzoDe = (db, est) => db.buzos.find((b) => b.id === est.buzoId) || { nombre: "—" };

const diasDesde = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0);

export function copiarLink(ruta, avisar, texto) {
  const url = `${window.location.origin}${ruta}`;
  try {
    navigator.clipboard
      .writeText(url)
      .then(() => avisar(texto))
      .catch(() => avisar(url));
  } catch {
    avisar(url);
  }
}

// "Pend Recibir en almacén", "Pendiente Procesar" y "Pendiente Notificar"
// del sheet, como cuadros con cuántos hay en cada paso.
export const FILTROS = [
  { k: "curso", t: "En curso", f: (e) => e.estado === "curso" },
  // V55: antes "Para el almacén" ("78. Cambiar 'listos para el almacén' por 'Listo para procesar'").
  { k: "para-almacen", t: "Listo para procesar", f: (e, db) => listoParaAlmacen(e, cursoDe(db, e)) },
  { k: "almacen", t: "Procesando", f: (e) => e.estado === "almacen" },
  { k: "por-avisar", t: "Por avisar", f: (e) => e.estado === "certificacion" },
  { k: "pago-instructor", t: "Pago al instructor", f: (e) => pagoInstructorPendiente(e) },
  { k: "debe", t: "Deben", f: (e) => e.estado !== "cancelado" && debe(e) > 0 },
  // V55: la lista de espera (curso sin fecha o fecha llena, "65").
  { k: "espera", t: "Lista de espera", f: (e) => e.estado === "espera" },
  // V55: sin "Por recoger" ("87"); los que quedaron en "avisado" de antes cuentan como terminados.
  { k: "terminados", t: "Terminados", f: (e) => e.estado === "entregada" || e.estado === "avisado" },
  { k: "cancelados", t: "Cancelados", f: (e) => e.estado === "cancelado" },
];

export function FilaEstudiante({ db, est, ir }) {
  const b = buzoDe(db, est);
  const c = cursoDe(db, est);
  const a = avance(est, c);
  const falta = est.estado === "curso" ? faltaDe(est, c) : [];
  const d = debe(est);
  return (
    <button className="ce-est" onClick={() => ir(`estudiante:${est.id}`)}>
      <div className="ce-est-t">
        <b>{b.nombre}</b>
        <span className="ce-chip curso">
          {est.curso}
          {est.escuela && est.escuela !== "SNSI" ? ` · ${est.escuela}` : ""}
        </span>
      </div>
      <div className="ce-est-m">
        {[est.instructor, est.fechaInicio ? `${est.fechaInicio > hoyISO() ? "empieza" : "empezó"} el ${fechaCorta(est.fechaInicio)}` : ""].filter(Boolean).join(" · ")}
        {est.estado === "curso" ? (falta.length ? ` · falta ${falta.slice(0, 3).join(", ")}${falta.length > 3 ? "…" : ""}` : " · listo para procesar") : ` · ${nombreEtapa(est.estado)}`}
        {d > 0 && <span className="ce-debe"> · debe {rd(d)}</span>}
      </div>
      {est.estado === "curso" && (
        <div className="ce-barra">
          <i style={{ width: `${a.pct}%` }} />
        </div>
      )}
    </button>
  );
}

// V59 ("158"): la tarjeta de un curso abierto, con la fecha grande y cuántos
// estudiantes tiene. Sale en Inicio (Próximos cursos) y en Cursos.
const MES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function TarjetaCurso({ db, f, onClick, abierta }) {
  const c = db.cursos.find((x) => x.id === f.cursoId);
  const k = db.estudiantes.filter((e) => e.fechaId === f.id && e.estado !== "cancelado").length;
  const [, m, d] = f.inicio.split("-").map(Number);
  return (
    <button type="button" className={`ce-tcurso${abierta ? " sel" : ""}`} onClick={onClick} aria-expanded={abierta}>
      <span className="ce-fcaja">
        <small>lun</small>
        <b>{d}</b>
        <small>{MES3[m - 1]}</small>
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <b className="ce-tcurso-n">{c?.nombre || "Curso"}</b>
        <span className="hint-text" style={{ display: "block", margin: 0 }}>
          {f.inicio < hoyISO() ? "Empezó" : "Empieza"} el {fechaCursoCorta(f.inicio)} {f.inicio.slice(0, 4)}
          {f.instructor ? ` · ${f.instructor}` : ""}
          {f.cupo ? ` · cupo ${f.cupo}` : ""}
          {f.nota ? ` · ${f.nota}` : ""}
        </span>
      </span>
      <span className="ce-tcurso-k">
        <b>{k}</b>
        <small>estudiante{k === 1 ? "" : "s"}</small>
      </span>
    </button>
  );
}

// V60 -- "170" y la nota del 2-nov ("si le doy click al curso... debería
// abrirle el curso directo"): la página del curso, con sus datos, sus
// estudiantes y la gente en lista de espera para ese curso.
export function DetalleCurso({ db, p, yo, ops, ir, avisar, fechaId }) {
  const [form, setForm] = useState(null);
  const f = (db.fechas || []).find((x) => x.id === fechaId);
  const atras = (
    <a className="back-link" onClick={() => ir("cursos")} style={{ cursor: "pointer" }}>
      ← Cursos
    </a>
  );
  if (!f)
    return (
      <>
        {atras}
        <div className="card hint-text">Este curso ya no está.</div>
      </>
    );
  const c = db.cursos.find((x) => x.id === f.cursoId);
  const porNombre = (a, b) => buzoDe(db, a).nombre.localeCompare(buzoDe(db, b).nombre);
  const gente = db.estudiantes.filter((e) => e.fechaId === f.id && e.estado !== "cancelado").sort(porNombre);
  const espera = db.estudiantes.filter((e) => e.estado === "espera" && cursoDe(db, e)?.id === f.cursoId).sort(porNombre);
  const hayCupo = quedan(db, f) !== 0;
  const pasar = (e) =>
    ops.cambiarEst(
      e,
      { estado: "curso", fechaId: f.id, fechaInicio: f.inicio, ...(e.instructor ? {} : f.instructor ? { instructor: f.instructor } : {}) },
      `Lo pasó a una fecha: ${buzoDe(db, e).nombre}`,
      "Lista de espera",
      fechaCursoCorta(f.inicio)
    );
  return (
    <>
      {atras}
      <h1 className="page-title" style={{ marginBottom: 6 }}>
        {c?.nombre || "Curso"}
      </h1>
      <div className="ce-abierto fuerte sel ce-curso-cab">
        <TarjetaCurso db={db} f={f} />
      </div>
      <div className="card ce-curso-datos">
        <div className="vj-dato">
          <span>Empieza</span>
          <b>
            {fechaCursoCorta(f.inicio)} {f.inicio.slice(0, 4)}
          </b>
        </div>
        <div className="vj-dato">
          <span>Instructor</span>
          <b>{f.instructor || "Por definir"}</b>
        </div>
        <div className="vj-dato">
          <span>Cupo</span>
          <b>{textoCupo(db, f)}</b>
        </div>
        {f.nota && (
          <div className="vj-dato">
            <span>Nota</span>
            <b>{f.nota}</b>
          </div>
        )}
        {p.cursos &&
          (form ? (
            <FormCurso db={db} form={form} setForm={setForm} yo={yo} ops={ops} avisar={avisar} />
          ) : (
            <button className="btn secondary vj-mini" style={{ marginTop: 10 }} onClick={() => setForm({ id: f.id, cursoId: f.cursoId, inicio: f.inicio, cupo: f.cupo == null ? "" : String(f.cupo), instructor: f.instructor, nota: f.nota })}>
              <IconEdit size={14} /> Editar este curso
            </button>
          ))}
      </div>

      <div className="section-title">
        Estudiantes ({gente.length})
      </div>
      {gente.map((e) => (
        <FilaEstudiante key={e.id} db={db} est={e} ir={ir} />
      ))}
      {!gente.length && (
        <div className="card hint-text" style={{ margin: 0 }}>
          Todavía no tiene estudiantes. Mándales el link de registro o pasa a alguien de la lista de espera.
        </div>
      )}
      <button className="btn secondary vj-btn" style={{ marginTop: 10 }} onClick={() => copiarLink("/estudiante", avisar, "Link de registro copiado")}>
        <IconLink size={16} /> Copiar link de registro
      </button>

      {espera.length > 0 && (
        <>
          <div className="section-title">
            En lista de espera para {c?.nombre || "este curso"} ({espera.length})
          </div>
          {espera.map((e) => (
            <div key={e.id} className="ce-curso-espera">
              <FilaEstudiante db={db} est={e} ir={ir} />
              {p.estudiantes && hayCupo && (
                <button className="btn secondary vj-mini" onClick={() => pasar(e)}>
                  Pasarlo a este curso
                </button>
              )}
            </div>
          ))}
          {!hayCupo && <div className="hint-text">Este curso está lleno.</div>}
        </>
      )}
    </>
  );
}

export function Inicio({ db, p, ir, avisar }) {
  const n = (k) => db.estudiantes.filter((e) => FILTROS.find((f) => f.k === k).f(e, db)).length;
  const porCobrar = db.estudiantes.filter((e) => e.estado !== "cancelado").reduce((a, e) => a + (debe(e) || 0), 0);
  const hoy = hoyISO();
  const haceUnaSemana = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const proximos = (db.fechas || [])
    .filter((f) => f.activo && f.inicio >= haceUnaSemana)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, 4);
  const atencion = db.estudiantes.filter((e) => e.estado === "certificacion" && diasDesde(e.etapas?.cert?.en) >= 3);
  const intNuevos = db.interesados.filter((x) => x.estado === "nuevo").length;
  const intHoy = db.interesados.filter((x) => x.recordar && x.recordar <= hoy && !["inscrito", "no"].includes(x.estado));
  const cuadros = [
    { k: "curso", t: "En curso" },
    { k: "para-almacen", t: "Listo para procesar" },
    { k: "almacen", t: "Procesando" },
    { k: "por-avisar", t: "Certificación lista, por avisar", rojo: true },
    { k: "pago-instructor", t: "Pago al instructor pendiente" },
    { k: "espera", t: "En lista de espera" },
  ];
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 4 }}>
        Control Estudiantes
      </h1>
      {/* V59 (nota 2-nov): sin "Nuevo estudiante" aquí; el link de registro pasó a Cursos.
          "158": arriba los próximos cursos; los cuadros van debajo, en "Seguimiento". */}
      {proximos.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 8 }}>
            Próximos cursos
          </div>
          {proximos.map((f) => (
            <TarjetaCurso key={f.id} db={db} f={f} onClick={() => ir(`curso:${f.id}`)} />
          ))}
        </>
      )}
      <div className="section-title">Seguimiento</div>
      <div className="ce-cuadros">
        {cuadros.map((c) => {
          const v = n(c.k);
          return (
            <button key={c.k} className={`ce-cuadro${c.rojo && v > 0 ? " rojo" : ""}`} onClick={() => ir(`cursos:${c.k}`)}>
              <b>{v}</b>
              <span>{c.t}</span>
            </button>
          );
        })}
        {p.interesados && (
          <button className={`ce-cuadro${intHoy.length ? " rojo" : ""}`} onClick={() => ir("interesados")}>
            <b>{intNuevos}</b>
            <span>Interesados nuevos{intHoy.length ? ` · ${intHoy.length} para escribirles hoy` : ""}</span>
          </button>
        )}
        {(p.pagos || p.conciliar) && (
          <button className="ce-cuadro" onClick={() => ir("cursos:debe")}>
            <b>{rd(porCobrar)}</b>
            <span>Pendiente por cobrar</span>
          </button>
        )}
      </div>
      {atencion.length > 0 && (
        <>
          <div className="section-title">Necesitan atención</div>
          {atencion.map((e) => (
            <button key={e.id} className="ce-est" onClick={() => ir(`estudiante:${e.id}`)}>
              <div className="ce-est-t">
                <b>{buzoDe(db, e).nombre}</b>
                <span className="ce-chip rojo">Por avisar hace {diasDesde(e.etapas?.cert?.en)} días</span>
              </div>
              <div className="ce-est-m">{e.curso} · su certificación llegó el {fechaCorta(String(e.etapas?.cert?.en || "").slice(0, 10))}</div>
            </button>
          ))}
        </>
      )}
      {db.estudiantes.length === 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <b>Todavía no hay estudiantes.</b>
          <div className="hint-text" style={{ marginTop: 4 }}>
            Mándale el link de registro (está en Cursos), o regístralo tú desde Estudiantes.
          </div>
        </div>
      )}
    </>
  );
}

// V55 -- Cursos: donde se trabaja ("78": "esos botones que figuran en
// estudiantes deberían de estar en cursos"; maqueta-v55c). Arriba se escoge el
// curso (o Todos) y abajo en qué van. Con un curso escogido sale su tarjeta:
// precio, próximas fechas con cupos y "+ Agregar fecha".
export function Lista({ db, p, yo, ops, ir, avisar, filtroInicial }) {
  const [filtro, setFiltro] = useState(FILTROS.some((f) => f.k === filtroInicial) ? filtroInicial : "curso");
  const [abierto, setAbierto] = useState(null); // id de la fecha abierta, "sin" o "espera:<curso>"
  const [form, setForm] = useState(null); // crear o editar un curso (una fecha)
  // V57 -- "123": solo los cursos abiertos (cada fecha es un curso), con
  // cuántos estudiantes tiene; "+ Crear curso"; la lista de espera por curso.
  // Ya no salen los botones de todo el catálogo (eso está en Más > Base de
  // datos). "Por etapa" se queda abajo mientras se decide cómo ponerlo.
  const hoy = hoyISO();
  const haceUnaSemana = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const deFecha = (f) => db.estudiantes.filter((e) => e.fechaId === f.id && e.estado !== "cancelado");
  const abiertos = (db.fechas || [])
    .filter((f) => f.activo && (f.inicio >= haceUnaSemana || deFecha(f).some((e) => e.estado === "curso")))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const sinFecha = db.estudiantes.filter((e) => e.estado === "curso" && !e.fechaId);
  const espera = db.estudiantes.filter((e) => e.estado === "espera");
  const esperaPorCurso = [...new Set(espera.map((e) => cursoDe(db, e)?.id || e.curso))].map((k) => ({
    k,
    c: db.cursos.find((c) => c.id === k) || null,
    nombre: db.cursos.find((c) => c.id === k)?.nombre || k,
    gente: espera.filter((e) => (cursoDe(db, e)?.id || e.curso) === k),
  }));
  const fx = FILTROS.find((f) => f.k === filtro);
  const lista = db.estudiantes.filter((e) => fx.f(e, db)).sort((a, b) => buzoDe(db, a).nombre.localeCompare(buzoDe(db, b).nombre));
  const porNombre = (a, b) => buzoDe(db, a).nombre.localeCompare(buzoDe(db, b).nombre);
  const n = (k) => `${k} estudiante${k === 1 ? "" : "s"}`;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Cursos abiertos
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {p.cursos && !db.sinFechas && (
            <button className="btn btn-primary vj-btn" onClick={() => setForm({ cursoId: "", inicio: "", cupo: "", instructor: "", nota: "" })}>
              <IconPlus size={16} /> Crear curso
            </button>
          )}
          {/* V59: "quita el botón de nuevo estudiante de aquí y pon el link de registro en cursos". */}
          <button className="btn secondary vj-btn" onClick={() => copiarLink("/estudiante", avisar, "Link de registro copiado")}>
            <IconLink size={16} /> Copiar link de registro
          </button>
        </div>
      </div>
      {db.sinFechas && <div className="hint-text">Falta correr el SQL de la V55 en Supabase para poder crear cursos con fecha.</div>}
      {form && !form.id && <FormCurso db={db} form={form} setForm={setForm} yo={yo} ops={ops} avisar={avisar} />}

      {abiertos.map((f) => {
        const c = db.cursos.find((x) => x.id === f.cursoId);
        const gente = deFecha(f).sort(porNombre);
        const esta = abierto === f.id;
        return (
          <div key={f.id} className={`ce-abierto fuerte${esta ? " sel" : ""}`}>
            {/* V60 ("170", nota 2-nov): al tocar el curso se entra a él. */}
            <TarjetaCurso db={db} f={f} onClick={() => ir(`curso:${f.id}`)} />
            {esta && (
              <div className="ce-abierto-cuerpo">
                {gente.map((e) => (
                  <FilaEstudiante key={e.id} db={db} est={e} ir={ir} />
                ))}
                {!gente.length && <div className="hint-text">Todavía no tiene estudiantes.</div>}
                {p.cursos &&
                  (form?.id === f.id ? (
                    <FormCurso db={db} form={form} setForm={setForm} yo={yo} ops={ops} avisar={avisar} />
                  ) : (
                    <button className="btn secondary vj-mini" style={{ marginTop: 8 }} onClick={() => setForm({ id: f.id, cursoId: f.cursoId, inicio: f.inicio, cupo: f.cupo == null ? "" : String(f.cupo), instructor: f.instructor, nota: f.nota })}>
                      <IconEdit size={14} /> Editar este curso
                    </button>
                  ))}
              </div>
            )}
          </div>
        );
      })}
      {!abiertos.length && !db.sinFechas && <div className="card hint-text">No hay cursos abiertos. Toca &quot;Crear curso&quot; para abrir uno.</div>}

      {sinFecha.length > 0 && (
        <div className={`ce-abierto${abierto === "sin" ? " sel" : ""}`}>
          <button type="button" className="ce-abierto-top" onClick={() => setAbierto(abierto === "sin" ? null : "sin")}>
            <span>
              <b>En curso, sin fecha</b>
              <span className="hint-text" style={{ display: "block", margin: 0 }}>
                Anotados antes de las fechas, o con una fecha escrita a mano.
              </span>
            </span>
            <span className="ce-abierto-n">{n(sinFecha.length)}</span>
          </button>
          {abierto === "sin" && (
            <div className="ce-abierto-cuerpo">
              {sinFecha.sort(porNombre).map((e) => (
                <FilaEstudiante key={e.id} db={db} est={e} ir={ir} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="section-title">Lista de espera</div>
      {esperaPorCurso.map((g) => {
        const k = `espera:${g.k}`;
        return (
          <div key={k} className={`ce-abierto${abierto === k ? " sel" : ""}`}>
            <button type="button" className="ce-abierto-top" onClick={() => setAbierto(abierto === k ? null : k)}>
              <span>
                <b>{g.nombre}</b>
              </span>
              <span className="ce-abierto-n espera">{g.gente.length} esperando</span>
            </button>
            {abierto === k && (
              <div className="ce-abierto-cuerpo">
                {g.gente.sort(porNombre).map((e) => (
                  <FilaEstudiante key={e.id} db={db} est={e} ir={ir} />
                ))}
                {p.cursos && g.c && !db.sinFechas && (
                  <button className="btn secondary vj-mini" style={{ marginTop: 8 }} onClick={() => setForm({ cursoId: g.c.id, inicio: "", cupo: "", instructor: "", nota: "" })}>
                    <IconPlus size={14} /> Crear un curso de {g.nombre}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!esperaPorCurso.length && <div className="card hint-text">Nadie en lista de espera.</div>}

      <div className="section-title">Por etapa</div>
      <div className="vj-filtros">
        {FILTROS.map((f) => (
          <button key={f.k} className={`vj-filtro ce-filtro${filtro === f.k ? " sel" : ""}`} onClick={() => setFiltro(f.k)}>
            {f.t} <span>{db.estudiantes.filter((e) => f.f(e, db)).length}</span>
          </button>
        ))}
      </div>
      {lista.map((e) => (
        <FilaEstudiante key={e.id} db={db} est={e} ir={ir} />
      ))}
      {!lista.length && <div className="card hint-text">{`Nadie en "${fx.t}".`}</div>}
    </>
  );
}

// V57 -- Crear o editar un curso (una fecha de un curso de la Base de datos).
function FormCurso({ db, form, setForm, yo, ops, avisar }) {
  const lunes = lunesProximos(26);
  const c = db.cursos.find((x) => x.id === form.cursoId);
  const enEspera = c ? db.estudiantes.filter((e) => e.estado === "espera" && e.cursoId === c.id).length : 0;
  async function guardar() {
    if (!c) return avisar("Escoge el curso.");
    if (!form.inicio) return avisar("Escoge el lunes en que empieza.");
    if (form.cupo !== "" && !(Number(form.cupo) > 0)) return avisar("El cupo tiene que ser un número.");
    const nueva = !form.id;
    const f = { id: form.id || nuevoId(), cursoId: c.id, inicio: form.inicio, cupo: form.cupo === "" ? null : Number(form.cupo), instructor: form.instructor, nota: (form.nota || "").trim(), activo: true };
    const ok = await ops.guardarFecha(f, nueva, c);
    if (ok) setForm(null);
  }
  return (
    <div className="ce-form ce-form-curso" style={{ marginTop: 10 }}>
      <b>{form.id ? "Editar este curso" : "Crear curso"}</b>
      {!form.id && enEspera > 0 && <div className="tec-recordatorio">Hay {enEspera} en lista de espera de {c.nombre}. Cuando lo crees, pásalos desde su ficha.</div>}
      <div className="ce-form-fila">
        <label>
          Curso
          <select value={form.cursoId} disabled={!!form.id} onChange={(e) => setForm({ ...form, cursoId: e.target.value })}>
            <option value="">Escoge…</option>
            {db.cursos
              .filter((x) => x.activo || x.id === form.cursoId)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
          </select>
        </label>
        <label>
          Empieza el (siempre lunes)
          <select value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })}>
            <option value="">Escoge…</option>
            {[...new Set([...(form.id ? [form.inicio] : []), ...lunes])].map((l) => (
              <option key={l} value={l}>
                {fechaCursoCorta(l)} {l.slice(0, 4)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="ce-form-fila">
        <label>
          Cupo
          {/* V59 ("144"): un desplegable del 1 al 7. */}
          <select value={form.cupo} onChange={(e) => setForm({ ...form, cupo: e.target.value })}>
            <option value="">Sin límite</option>
            {[...new Set([1, 2, 3, 4, 5, 6, 7, ...(form.cupo && Number(form.cupo) > 7 ? [Number(form.cupo)] : [])])].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Instructor
          <select value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })}>
            <option value="">Por definir</option>
            {db.instructores
              .filter((i) => i.activo || i.nombre === form.instructor)
              .map((i) => (
                <option key={i.id}>{i.nombre}</option>
              ))}
          </select>
        </label>
      </div>
      <label>
        Nota (opcional)
        <input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} placeholder="Ej. en la tarde" />
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button className="btn btn-primary vj-btn" onClick={guardar}>
          {form.id ? "Guardar" : "Crear curso"}
        </button>
        <button className="btn secondary vj-btn" onClick={() => setForm(null)}>
          Cancelar
        </button>
        {form.id && yo.esTitular && (
          <button
            className="btn secondary vj-btn vj-rojo-txt"
            onClick={async () => {
              const k = ocupados(db, form.id);
              if (k > 0 && !window.confirm(`Este curso tiene ${k} estudiante${k === 1 ? "" : "s"}. Se quedan sin fecha. ¿Borrarlo?`)) return;
              const ok = await ops.borrarFecha({ id: form.id, inicio: form.inicio }, c);
              if (ok) setForm(null);
            }}
          >
            Borrar este curso
          </button>
        )}
      </div>
    </div>
  );
}

// V55 -- Estudiantes: el listado de todos los que se han registrado, con
// buscador ("78": "la pestaña estudiantes debería de ser un listado de los
// estudiantes registrados, tipo historial con un search bar").
export function Directorio({ db, p, ir }) {
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const td = soloDigitos(q);
  const porPersona = new Map();
  for (const e of db.estudiantes) {
    if (!porPersona.has(e.buzoId)) porPersona.set(e.buzoId, []);
    porPersona.get(e.buzoId).push(e);
  }
  const filas = [...porPersona.entries()]
    .map(([buzoId, ests]) => ({ b: db.buzos.find((x) => x.id === buzoId) || { nombre: "—" }, ests: ests.sort((a, b) => String(b.creadoEn || "").localeCompare(String(a.creadoEn || ""))) }))
    .filter(({ b }) => !t || (b.nombre || "").toLowerCase().includes(t) || (td.length >= 4 && (soloDigitos(b.doc).includes(td) || soloDigitos(b.cel).includes(td))) || (b.pasaporte || "").toLowerCase().includes(t))
    .sort((a, b) => (a.b.nombre || "").localeCompare(b.b.nombre || ""));
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Estudiantes
        </h1>
        {p.estudiantes && (
          <button className="btn btn-primary vj-btn" onClick={() => ir("nuevo")}>
            <IconPlus size={16} /> Nuevo estudiante
          </button>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <Buscar value={q} onChange={setQ} placeholder="Buscar por nombre, cédula o celular…" />
      </div>
      <div className="hint-text" style={{ margin: "0 0 6px" }}>
        {filas.length} estudiante{filas.length === 1 ? "" : "s"} · de la A a la Z
      </div>
      <div className="card ce-dir">
        {filas.map(({ b, ests }) => (
          <div key={b.id || ests[0].id} className="ce-dir-fila">
            <button className="ce-dir-nombre" onClick={() => ir(`estudiante:${ests[0].id}`)}>
              {b.nombre}
            </button>
            <div className="ce-dir-cursos">
              {ests.map((e) => (
                <button key={e.id} className="ce-dir-curso" onClick={() => ir(`estudiante:${e.id}`)}>
                  <span className="ce-chip gris">{e.curso}</span>
                  <span className={`ce-chip ${e.estado === "entregada" || e.estado === "avisado" ? "ok" : e.estado === "cancelado" ? "gris" : e.estado === "certificacion" ? "rojo" : "curso"}`}>{nombreEtapa(e.estado === "certificacion" ? "certificacion" : e.estado)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {!filas.length && <div className="hint-text" style={{ padding: "10px 0" }}>{t ? "No hay nadie con esa búsqueda." : "Todavía no hay estudiantes."}</div>}
      </div>
    </>
  );
}

export function Mas({ yo, p, ir }) {
  // V55: como el Más de los otros apps ("El menú de más se ve extraño,
  // corregir"), y con la Base de datos de los cursos ("ponme en 'más' un
  // botón de base de datos").
  const opciones = [
    { r: "basedatos", t: "Base de datos", sub: "Los cursos que damos y los instructores.", I: IconCatalog },
    { r: "bitacora", t: "Bitácora", sub: "Todo lo que se ha hecho, con quién y cuándo.", I: IconHistory },
    ...(yo.esTitular ? [{ r: "administracion", t: "Administración", sub: "Qué puede hacer cada persona en Control Estudiantes.", I: IconUsers }] : []),
  ];
  return (
    <>
      <h1 className="page-title">Más</h1>
      {opciones.map((o) => (
        <button key={o.r} type="button" className="card hub-link-card vj-mas-card ce-mas-card" onClick={() => ir(o.r)}>
          <div className="hub-link-card-inner">
            <div className="hub-link-icon">
              <o.I size={20} />
            </div>
            <div>
              <div className="hub-link-title">{o.t}</div>
              <div className="hub-link-desc">{o.sub}</div>
            </div>
          </div>
        </button>
      ))}
    </>
  );
}

export function Bitacora({ db, ir }) {
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const filas = db.bitacora.filter((x) => !t || `${x.texto} ${x.quien} ${x.antes || ""} ${x.despues || ""}`.toLowerCase().includes(t));
  return (
    <>
      <a className="back-link" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">Bitácora</h1>
      <Buscar value={q} onChange={setQ} placeholder="Buscar en la bitácora…" />
      <div className="card" style={{ padding: "4px 14px" }}>
        {filas.map((x) => (
          <div key={x.id} className="ce-nota">
            {x.estudianteId && db.estudiantes.some((e) => e.id === x.estudianteId) ? (
              <a className="vj-link" onClick={() => ir(`estudiante:${x.estudianteId}`)}>
                {x.texto}
              </a>
            ) : (
              x.texto
            )}
            {(x.antes || x.despues) && (
              <div className="hint-text" style={{ margin: 0 }}>
                {x.antes || "—"} → {x.despues || "—"}
              </div>
            )}
            <small>
              {x.quien} · {new Date(x.cuando).toLocaleString("es-DO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
            </small>
          </div>
        ))}
        {!filas.length && <div className="hint-text" style={{ padding: "10px 0" }}>Nada todavía.</div>}
      </div>
    </>
  );
}
