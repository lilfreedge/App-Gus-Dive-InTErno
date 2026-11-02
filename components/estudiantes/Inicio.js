"use client";

import { useState } from "react";
import { Buscar } from "@/components/viajes/Piezas";
import { IconHistory, IconUsers, IconLink, IconPlus, IconCatalog, IconEdit } from "@/components/icons";
import { listoParaAlmacen, pagoInstructorPendiente, debe, rd, avance, faltaDe, fechaCorta, hoyISO, nombreEtapa, soloDigitos, fechasDe, textoCupo, fechaCursoCorta, lunesProximos, ocupados } from "@/lib/estudiantes/modelo";
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

export function Inicio({ db, p, ir, avisar }) {
  const n = (k) => db.estudiantes.filter((e) => FILTROS.find((f) => f.k === k).f(e, db)).length;
  const porCobrar = db.estudiantes.filter((e) => e.estado !== "cancelado").reduce((a, e) => a + (debe(e) || 0), 0);
  const hoy = hoyISO();
  const pronto = db.estudiantes
    .filter((e) => e.estado === "curso" && e.fechaInicio && e.fechaInicio >= hoy)
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
    .slice(0, 5);
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 4px" }}>
        {p.estudiantes && (
          <button className="btn btn-primary vj-btn" onClick={() => ir("nuevo")}>
            <IconPlus size={16} /> Nuevo estudiante
          </button>
        )}
        <button className="btn secondary vj-btn" onClick={() => copiarLink("/estudiante", avisar, "Link de registro copiado")}>
          <IconLink size={16} /> Copiar link de registro
        </button>
      </div>
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
      {pronto.length > 0 && (
        <>
          <div className="section-title">Empiezan pronto</div>
          {pronto.map((e) => (
            <FilaEstudiante key={e.id} db={db} est={e} ir={ir} />
          ))}
        </>
      )}
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
            Mándale el link de registro al estudiante, o regístralo tú con &quot;Nuevo estudiante&quot;.
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
  const [cursoSel, setCursoSel] = useState("");
  const activos = db.cursos.filter((c) => c.activo);
  const delCurso = (e) => !cursoSel || e.cursoId === cursoSel || (!e.cursoId && db.cursos.find((c) => c.id === cursoSel)?.nombre === e.curso);
  const base = db.estudiantes.filter(delCurso);
  const fx = FILTROS.find((f) => f.k === filtro);
  const lista = base.filter((e) => fx.f(e, db)).sort((a, b) => buzoDe(db, a).nombre.localeCompare(buzoDe(db, b).nombre));
  const c = db.cursos.find((x) => x.id === cursoSel);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Cursos
        </h1>
        {p.estudiantes && (
          <button className="btn btn-primary vj-btn" onClick={() => ir("nuevo")}>
            <IconPlus size={16} /> Nuevo estudiante
          </button>
        )}
      </div>
      <div className="ce-etq-fila">Curso</div>
      <div className="vj-filtros ce-cursos-chips">
        <button className={`vj-filtro${!cursoSel ? " sel" : ""}`} onClick={() => setCursoSel("")}>
          Todos
        </button>
        {activos.map((x) => (
          <button key={x.id} className={`vj-filtro${cursoSel === x.id ? " sel" : ""}`} onClick={() => setCursoSel(x.id)}>
            {x.nombre}
          </button>
        ))}
      </div>
      {c && <TarjetaCurso db={db} c={c} p={p} yo={yo} ops={ops} avisar={avisar} verEspera={() => setFiltro("espera")} />}
      <div className="ce-etq-fila">En qué van</div>
      <div className="vj-filtros">
        {FILTROS.map((f) => (
          <button key={f.k} className={`vj-filtro ce-filtro${filtro === f.k ? " sel" : ""}`} onClick={() => setFiltro(f.k)}>
            {f.t} <span>{base.filter((e) => f.f(e, db)).length}</span>
          </button>
        ))}
      </div>
      {lista.map((e) => (
        <FilaEstudiante key={e.id} db={db} est={e} ir={ir} />
      ))}
      {!lista.length && <div className="card hint-text">{`Nadie en "${fx.t}"${c ? ` de ${c.nombre}` : ""}.`}</div>}
    </>
  );
}

// La tarjeta del curso escogido: precio, próximas fechas y agregar fecha.
function TarjetaCurso({ db, c, p, yo, ops, avisar, verEspera }) {
  const [form, setForm] = useState(null); // { id?, inicio, cupo, instructor, nota }
  const fechas = fechasDe(db, c.id);
  const enEspera = db.estudiantes.filter((e) => e.estado === "espera" && e.cursoId === c.id).length;
  const lunes = lunesProximos(26);
  async function guardar() {
    if (!form.inicio) return avisar("Escoge el lunes en que empieza.");
    if (form.cupo !== "" && !(Number(form.cupo) > 0)) return avisar("El cupo tiene que ser un número.");
    const nueva = !form.id;
    const f = { id: form.id || nuevoId(), cursoId: c.id, inicio: form.inicio, cupo: form.cupo === "" ? null : Number(form.cupo), instructor: form.instructor, nota: form.nota.trim(), activo: true };
    const ok = await ops.guardarFecha(f, nueva, c);
    if (ok) setForm(null);
  }
  return (
    <div className="ce-etapa ce-tarjeta-curso">
      <div className="ce-est-t">
        <b style={{ fontSize: 16 }}>{c.nombre}</b>
        <span className="ce-chip curso">{c.precio == null ? "Sin precio" : rd(c.precio)}</span>
      </div>
      <div className="ce-etq-fila" style={{ marginTop: 8 }}>
        Próximas fechas
      </div>
      {db.sinFechas && <div className="hint-text">Falta correr el SQL de la V55 en Supabase para poder poner fechas.</div>}
      {fechas.map((f) => (
        <div key={f.id} className="ce-fecha">
          <span>
            <b>{fechaCursoCorta(f.inicio)}</b>
            {f.inicio < hoyISO() && <span className="hint-text" style={{ margin: 0 }}> · ya empezó</span>}
            <div className="hint-text" style={{ margin: 0 }}>
              {[textoCupo(db, f), f.instructor, f.nota].filter(Boolean).join(" · ")}
            </div>
          </span>
          {p.cursos && (
            <button className="btn secondary vj-mini" onClick={() => setForm({ id: f.id, inicio: f.inicio, cupo: f.cupo == null ? "" : String(f.cupo), instructor: f.instructor, nota: f.nota })}>
              <IconEdit size={14} /> Editar
            </button>
          )}
        </div>
      ))}
      {!fechas.length && !db.sinFechas && <div className="hint-text">No tiene fechas. En el link, este curso sale como &quot;Lista de espera&quot;.</div>}
      {enEspera > 0 && (
        <div className="hint-text" style={{ marginTop: 4 }}>
          <a className="vj-link" onClick={verEspera}>
            {enEspera} en lista de espera
          </a>
        </div>
      )}
      {form ? (
        <div className="ce-form" style={{ marginTop: 8 }}>
          {!form.id && enEspera > 0 && <div className="tec-recordatorio">Hay {enEspera} en lista de espera de {c.nombre}. Cuando guardes la fecha, pásalos desde el filtro &quot;Lista de espera&quot;.</div>}
          <div className="ce-form-fila">
            <label>
              Empieza el (siempre lunes)
              <select value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })}>
                <option value="">Escoge…</option>
                {[...new Set([...(form.id ? [form.inicio] : []), ...lunes])].map((l) => (
                  <option key={l} value={l}>
                    {fechaCursoCorta(l)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cupo
              <input inputMode="numeric" value={form.cupo} onChange={(e) => setForm({ ...form, cupo: e.target.value.replace(/\D/g, "") })} placeholder="Sin límite" />
            </label>
          </div>
          <div className="ce-form-fila">
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
            <label>
              Nota (opcional)
              <input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} placeholder="Ej. en la tarde" />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary vj-btn" onClick={guardar}>
              Guardar fecha
            </button>
            <button className="btn secondary vj-btn" onClick={() => setForm(null)}>
              Cancelar
            </button>
            {form.id && yo.esTitular && (
              <button
                className="btn secondary vj-btn vj-rojo-txt"
                onClick={async () => {
                  const n = ocupados(db, form.id);
                  if (n > 0 && !window.confirm(`Esta fecha tiene ${n} estudiante${n === 1 ? "" : "s"}. Se quedan sin fecha. ¿Borrarla?`)) return;
                  const ok = await ops.borrarFecha({ id: form.id, inicio: form.inicio }, c);
                  if (ok) setForm(null);
                }}
              >
                Borrar fecha
              </button>
            )}
          </div>
        </div>
      ) : (
        p.cursos &&
        !db.sinFechas && (
          <button className="btn secondary vj-mini" style={{ marginTop: 8 }} onClick={() => setForm({ inicio: "", cupo: "", instructor: "", nota: "" })}>
            <IconPlus size={14} /> Agregar fecha
          </button>
        )
      )}
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
