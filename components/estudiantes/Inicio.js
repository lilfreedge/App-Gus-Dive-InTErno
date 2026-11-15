"use client";

import { useState } from "react";
import { Buscar, IconoWA } from "@/components/viajes/Piezas";
import { IconHistory, IconPlus, IconCatalog, IconEdit, IconChart, IconLink } from "@/components/icons";
import { listoParaAlmacen, pagoInstructorPendiente, debe, pagoListo, rd, avance, faltaDe, fechaCorta, hoyISO, nombreEtapa, soloDigitos, fechasDe, textoCupo, fechaCursoCorta, ocupados, quedan, linkWhatsApp } from "@/lib/estudiantes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";
import CompartirLink, { svgQr, urlCompleta, VentanaQr } from "@/components/CompartirLink";
import MenuMas from "@/components/MenuMas";
import { sumarDias, fechaLarga, formatoCel } from "@/lib/viajes/modelo";
import { urlPrincipal } from "@/lib/direccion";
import InteresadosCurso, { interesadosDeCurso } from "./InteresadosCurso";
import { ElegirCurso } from "./Interesados";

// Pantallas de Control Estudiantes: Inicio, la lista, Más y la Bitácora.

export const cursoDe = (db, est) => db.cursos.find((c) => c.id === est.cursoId) || db.cursos.find((c) => c.nombre === est.curso) || null;
export const buzoDe = (db, est) => db.buzos.find((b) => b.id === est.buzoId) || { nombre: "—" };

const diasDesde = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0);

export function copiarLink(ruta, avisar, texto) {
  const url = urlPrincipal(ruta);
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
  { k: "almacen", t: "Pendiente procesar", f: (e) => e.estado === "almacen" },
  { k: "por-avisar", t: "Por avisar", f: (e) => e.estado === "certificacion" },
  { k: "pago-instructor", t: "Pago al instructor", f: (e) => pagoInstructorPendiente(e) },
  { k: "debe", t: "Deben", f: (e) => e.estado !== "cancelado" && debe(e) > 0 },
  // V55: la lista de espera (curso sin fecha o fecha llena, "65").
  { k: "espera", t: "Lista de espera", f: (e) => e.estado === "espera" },
  // V55: sin "Por recoger" ("87"); los que quedaron en "avisado" de antes cuentan como terminados.
  { k: "terminados", t: "Terminados", f: (e) => e.estado === "entregada" || e.estado === "avisado" },
  { k: "cancelados", t: "Cancelados", f: (e) => e.estado === "cancelado" },
];

export function FilaEstudiante({ db, est, ir, p }) {
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
        {d > 0 && p?.montos !== false && <span className="ce-debe"> · debe {rd(d)}</span>}
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
export function DetalleCurso({ db, p, yo, ops, ir, avisar, fechaId, avisarDeEntrada = false }) {
  const [form, setForm] = useState(null);
  // V62 ("242. ok", maqueta V62): como la página de un buceo. Arriba la
  // fecha grande; una tarjeta con el cupo, quién pagó y quién debe; los
  // botones en una fila (Compartir link, Editar y ⋯) y las pestañas
  // Estudiantes, Lista de espera y Datos.
  // V79 (maqueta V79, "1. B. Quitemos 'lista de espera'"): la pestaña "Lista
  // de espera" pasa a ser "Interesados": los que ya llenaron sus datos y
  // esperan cupo (lo que salía antes) y, debajo, los interesados de ese
  // curso, con el botón para avisarles por correo.
  const [tab, setTab] = useState(avisarDeEntrada ? "interesados" : "estudiantes");
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
  const intsCurso = interesadosDeCurso(db, c?.nombre);
  const q = quedan(db, f);
  const hayCupo = q !== 0;
  const pagaron = gente.filter((e) => pagoListo(e)).length;
  const deben = gente.filter((e) => debe(e) > 0).length;
  const [, m, d] = f.inicio.split("-").map(Number);
  const fin = sumarDias(f.inicio, 6);
  const pasar = (e) =>
    ops.cambiarEst(
      e,
      { estado: "curso", fechaId: f.id, fechaInicio: f.inicio, ...(e.instructor ? {} : f.instructor ? { instructor: f.instructor } : {}) },
      `Lo pasó a una fecha: ${buzoDe(db, e).nombre}`,
      "Lista de espera",
      fechaCursoCorta(f.inicio)
    );
  const abrirEditar = () => setForm({ id: f.id, cursoId: f.cursoId, inicio: f.inicio, cupo: f.cupo == null ? "" : String(f.cupo), instructor: f.instructor, nota: f.nota });
  async function borrar() {
    const k = gente.length;
    if (!window.confirm(k > 0 ? `Este curso tiene ${k} estudiante${k === 1 ? "" : "s"}. Ya no van a salir en el curso (quedan cancelados, con su ficha en la base). ¿Borrarlo?` : "¿Borrar este curso?")) return;
    const ok = await ops.borrarFecha({ id: f.id, inicio: f.inicio }, c);
    if (ok !== false) ir("cursos");
  }
  const tabs = [
    { k: "estudiantes", t: "Estudiantes", n: gente.length },
    { k: "interesados", t: "Interesados", n: espera.length + intsCurso.length },
    { k: "datos", t: "Datos" },
  ];
  return (
    <>
      {atras}
      <div className="pg-cab">
        <span className="ce-fcaja">
          <small>{["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][new Date(f.inicio + "T12:00:00").getDay()]}</small>
          <b>{d}</b>
          <small>{MES3[m - 1]}</small>
        </span>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">{c?.nombre || "Curso"}</h1>
          <div className="hint-text">
            {[f.instructor || "Instructor por definir", `del ${fechaCursoCorta(f.inicio)} al ${fechaCursoCorta(fin)}`].join(" · ")}
          </div>
        </div>
      </div>

      <div className="card pg-res">
        <div className="pg-res-top">
          <b>{f.cupo == null ? `${gente.length} estudiante${gente.length === 1 ? "" : "s"}` : `${gente.length} de ${f.cupo} cupos`}</b>
          {f.cupo != null && <span className={q === 0 ? "pg-lleno" : ""}>{q === 0 ? "lleno" : `quedan ${q}`}</span>}
        </div>
        {f.cupo != null && (
          <div className="pg-barra">
            <i style={{ width: `${Math.min(100, Math.round((gente.length / Math.max(1, f.cupo)) * 100))}%` }} />
          </div>
        )}
        <div className="pg-res-nums">
          {p.montos && (
            <>
              <div>
                <b>{pagaron}</b>
                <span>pagaron</span>
              </div>
              <div className={deben ? "pg-rojo" : ""}>
                <b>{deben}</b>
                <span>{deben === 1 ? "debe" : "deben"}</span>
              </div>
            </>
          )}
          <div>
            <b>{espera.length + intsCurso.length}</b>
            <span>{espera.length + intsCurso.length === 1 ? "interesado" : "interesados"}</span>
          </div>
        </div>
      </div>

      <div className="pg-acciones">
        {/* V62 ("249"): Compartir link (copiar, WhatsApp o código QR). */}
        {/* V66 ("313. ok"): el link de este curso; el estudiante no escoge curso. */}
        <CompartirLink ruta={`/estudiante?curso=${encodeURIComponent(f.id)}`} etiqueta="Compartir link" mensaje={`Hola, aquí te dejo el link para registrarte en ${c?.nombre || "el curso"}, que empieza el ${fechaLarga(f.inicio)}:`} tituloQr={`Regístrate: ${c?.nombre || "curso"}`} avisar={avisar} />
        {p.cursos && (
          <button className="btn secondary vj-btn" onClick={() => (form ? setForm(null) : abrirEditar())}>
            <IconEdit size={16} /> Editar
          </button>
        )}
        <MenuMas
          opciones={[
            { t: "Ver en el calendario", d: "Los cursos y los buceos de la semana.", onClick: () => ir("calendario") },
            p.cursos && { t: "Borrar este curso", d: gente.length ? "Sus estudiantes ya no salen en el curso (quedan en la base)." : "No tiene estudiantes.", onClick: borrar, peligro: true },
          ]}
        />
      </div>
      {form && (
        <div className="card">
          <FormCurso db={db} form={form} setForm={setForm} yo={yo} ops={ops} avisar={avisar} />
        </div>
      )}

      <div className="vj-tabs">
        {tabs.map((t) => (
          <button key={t.k} className={`vj-tab${tab === t.k ? " sel" : ""}`} onClick={() => setTab(t.k)}>
            {t.t}
            {t.n != null && <span className="pg-tab-n">{t.n}</span>}
          </button>
        ))}
      </div>

      {tab === "estudiantes" && (
        <>
          {gente.length > 0 ? (
            <div className="card vj-lista">
              {gente.map((e) => (
                <FilaDeCurso key={e.id} db={db} est={e} ir={ir} p={p} />
              ))}
            </div>
          ) : (
            <div className="card hint-text" style={{ margin: 0 }}>
              Todavía no tiene estudiantes. Mándales el link de registro o avísales a los interesados.
            </div>
          )}
        </>
      )}

      {tab === "interesados" && (
        <>
          {espera.length > 0 && <div className="hint-text" style={{ marginTop: 0 }}>Ya llenaron sus datos y esperan un cupo:</div>}
          {espera.length > 0 && (
            <div className="card vj-lista">
              {espera.map((e) => (
                <div key={e.id} className="pg-fila-espera">
                  <FilaDeCurso db={db} est={e} ir={ir} espera p={p} />
                  {p.estudiantes && hayCupo && (
                    <button className="btn secondary vj-mini" onClick={() => pasar(e)}>
                      Pasarlo a este curso
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {espera.length > 0 && !hayCupo && <div className="hint-text">Este curso está lleno.</div>}
          {(intsCurso.length > 0 || !espera.length) && <InteresadosCurso db={db} p={p} yo={yo} ops={ops} ir={ir} avisar={avisar} f={f} c={c} elegirDeEntrada={avisarDeEntrada} />}
        </>
      )}

      {tab === "datos" && (
        <div className="card ce-curso-datos">
          <div className="vj-dato">
            <span>Empieza</span>
            <b>
              {fechaCursoCorta(f.inicio)} {f.inicio.slice(0, 4)}
            </b>
          </div>
          <div className="vj-dato">
            <span>Termina</span>
            <b>
              {fechaCursoCorta(fin)} {fin.slice(0, 4)}
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
        </div>
      )}
    </>
  );
}

// V62 ("242"): la fila de un estudiante dentro de la página del curso: el
// nombre, cómo va y, a la derecha, si pagó o cuánto debe.
function FilaDeCurso({ db, est, ir, espera, p }) {
  const b = buzoDe(db, est);
  const c = cursoDe(db, est);
  const a = avance(est, c);
  const falta = est.estado === "curso" ? faltaDe(est, c) : [];
  const d = debe(est);
  const sub = espera
    ? `Se anotó${est.creadoEn ? ` el ${fechaCorta(String(est.creadoEn).slice(0, 10))}` : ""} · esperando cupo`
    : est.estado === "curso"
      ? est.fechaInicio && est.fechaInicio > hoyISO()
        ? "Todavía no empieza"
        : falta.length
          ? `Lleva ${a.hechos} de ${a.total} · falta ${falta.slice(0, 2).join(", ")}${falta.length > 2 ? "…" : ""}`
          : "Listo para procesar"
      : nombreEtapa(est.estado);
  return (
    <button className="vj-fila pg-fila" onClick={() => ir(`estudiante:${est.id}`)}>
      <span className="vj-fila-main">
        <span className="vj-fila-nombre">{b.nombre}</span>
        <span className="hint-text">{sub}</span>
        {!espera && est.estado === "curso" && (
          <span className="ce-barra">
            <i style={{ width: `${a.pct}%` }} />
          </span>
        )}
      </span>
      {/* V67 ("3"): sin "Ver montos", no sale lo del pago. */}
      {p?.montos === false ? null : d > 0 ? <span className="vj-chip rojo">Debe {rd(d)}</span> : pagoListo(est) ? <span className="vj-chip verde">Pagado</span> : <span className="vj-chip gris">Sin precio</span>}
    </button>
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
    { k: "almacen", t: "Pendiente procesar" },
    { k: "por-avisar", t: "Certificación lista, por avisar", rojo: true },
    { k: "pago-instructor", t: "Pago al instructor pendiente" },
    { k: "espera", t: "En lista de espera" },
  ];
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 4 }}>
        Control Estudiantes
      </h1>
      {/* V85 (maqueta V85, pregunta 2: "2, a") -- arriba de todo, los
          interesados a los que les toca hoy (o ya se pasó) el "Próximo
          seguimiento". Si no hay ninguno, no sale. */}
      {p.interesados && intHoy.length > 0 && (
        <div className="ce-hoy">
          <div className="ce-hoy-t">Para escribir hoy ({intHoy.length})</div>
          {[...intHoy]
            .sort((a, b) => a.recordar.localeCompare(b.recordar))
            .map((x) => {
              const dias = Math.round((new Date(hoy + "T12:00:00") - new Date(x.recordar + "T12:00:00")) / 86400000);
              return (
                <div key={x.id} className="ce-hoy-fila">
                  <button className="ce-hoy-nombre" onClick={() => ir(`interesados:${x.id}`)}>
                    <b>{x.nombre}</b>
                    <small>
                      {[x.curso, dias <= 0 ? "le toca hoy" : dias === 1 ? "tocaba ayer" : `tocaba el ${fechaCursoCorta(x.recordar)}`].filter(Boolean).join(" · ")}
                    </small>
                  </button>
                  {x.cel && (
                    <a className="btn vj-btn ce-wa ce-hoy-wa" href={linkWhatsApp(x.cel, `Hola ${x.nombre.split(" ")[0]}, te escribimos de Gus Dive Center por el curso${x.curso ? ` de ${x.curso}` : ""}.`)} target="_blank" rel="noopener noreferrer">
                      <IconoWA on /> WhatsApp
                    </a>
                  )}
                  <button className="btn secondary vj-btn ce-hoy-abrir" onClick={() => ir(`interesados:${x.id}`)}>
                    Abrir
                  </button>
                </div>
              );
            })}
        </div>
      )}
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
        {p.montos && (
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
export function Lista({ db, p, yo, ops, ir, avisar }) {
  const [abierto, setAbierto] = useState(null); // id de la fecha abierta, "sin" o "espera:<curso>"
  const [form, setForm] = useState(null); // crear o editar un curso (una fecha)
  // V79 (maqueta V79, "1. B"): apenas se crea un curso que tiene
  // interesados, pregunta si se les avisa por correo.
  const [creado, setCreado] = useState(null);
  const [inscribiendo, setInscribiendo] = useState(null); // V80: id del interesado que se va a inscribir
  const alCrear = (f, c) => {
    const ints = interesadosDeCurso(db, c.nombre);
    if (p.interesados && ints.length) setCreado({ fechaId: f.id, curso: c.nombre, inicio: f.inicio, n: ints.length, conCorreo: ints.filter((x) => x.correo).length });
  };
  // V57 -- "123": solo los cursos abiertos (cada fecha es un curso), con
  // cuántos estudiantes tiene; "+ Crear curso"; la lista de espera por curso.
  // Ya no salen los botones de todo el catálogo (eso está en Más > Base de
  // datos). V68 ("17. A"): sin "Por etapa"; los cuadros de Inicio llevan a
  // cada etapa (PorEtapa, más abajo).
  const hoy = hoyISO();
  const haceUnaSemana = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const deFecha = (f) => db.estudiantes.filter((e) => e.fechaId === f.id && e.estado !== "cancelado");
  const abiertos = (db.fechas || [])
    .filter((f) => f.activo && (f.inicio >= haceUnaSemana || deFecha(f).some((e) => e.estado === "curso")))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const sinFecha = db.estudiantes.filter((e) => e.estado === "curso" && !e.fechaId);
  const espera = db.estudiantes.filter((e) => e.estado === "espera");
  // V76 (pedido explícito, con foto: "donde dice lista de espera poner
  // 'Interesados' y que figuren los interesados a según el curso") -- esta
  // sección se llama "Interesados" ahora; además de los estudiantes
  // esperando cupo, también salen los Interesados (de la lista de
  // Interesados, los que todavía no se resolvieron) agrupados por el curso
  // que les interesa. Se agrupa por el NOMBRE del curso (lo único que
  // comparten las dos listas: un estudiante en espera tiene cursoId, un
  // interesado solo el nombre del curso como texto).
  const nombreEsperaDe = (e) => cursoDe(db, e)?.nombre || e.curso;
  const interesadosAbiertos = (db.interesados || []).filter((x) => x.curso && !["inscrito", "no"].includes(x.estado));
  const nombresGrupo = [...new Set([...espera.map(nombreEsperaDe), ...interesadosAbiertos.map((x) => x.curso)])];
  const esperaPorCurso = nombresGrupo.map((nombre) => {
    const c = db.cursos.find((c) => c.nombre === nombre) || null;
    return {
      k: nombre,
      c,
      nombre,
      gente: espera.filter((e) => nombreEsperaDe(e) === nombre),
      interesados: interesadosAbiertos.filter((x) => x.curso === nombre),
    };
  });
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
          {/* V62 ("249"): Compartir link (copiar, WhatsApp o código QR). */}
          <CompartirLink ruta="/estudiante" etiqueta="Compartir link de registro" mensaje="Hola, aquí te dejo el link para registrarte en el curso:" tituloQr="Regístrate en tu curso" avisar={avisar} />
        </div>
      </div>
      {db.sinFechas && <div className="hint-text">Falta correr el SQL de la V55 en Supabase para poder crear cursos con fecha.</div>}
      {form && !form.id && <FormCurso db={db} form={form} setForm={setForm} yo={yo} ops={ops} avisar={avisar} alCrear={alCrear} />}
      {creado && (
        <div className="ce-avisar" style={{ marginTop: 10, border: "2px solid var(--ce)" }}>
          <b>
            Curso creado: {creado.curso}, {fechaLarga(creado.inicio)}
          </b>
          <div className="ce-avisar-h">
            Hay {creado.n} interesado{creado.n === 1 ? "" : "s"} en este curso ({creado.conCorreo} con correo). ¿Les avisas ahora?
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary vj-btn" onClick={() => ir(`curso:${creado.fechaId}:avisar`)}>
              Ver y avisar
            </button>
            <button className="btn secondary vj-btn" onClick={() => setCreado(null)}>
              Después
            </button>
          </div>
        </div>
      )}

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
                  <FilaEstudiante key={e.id} db={db} est={e} ir={ir} p={p} />
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
                <FilaEstudiante key={e.id} db={db} est={e} ir={ir} p={p} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="section-title">Interesados</div>
      {esperaPorCurso.map((g) => {
        const k = `espera:${g.k}`;
        const total = g.gente.length + g.interesados.length;
        return (
          <div key={k} className={`ce-abierto${abierto === k ? " sel" : ""}`}>
            <button type="button" className="ce-abierto-top" onClick={() => setAbierto(abierto === k ? null : k)}>
              <span>
                <b>{g.nombre}</b>
              </span>
              <span className="ce-abierto-n espera">{total} interesado{total === 1 ? "" : "s"}</span>
            </button>
            {abierto === k && (
              <div className="ce-abierto-cuerpo">
                {g.gente.sort(porNombre).map((e) => (
                  <FilaEstudiante key={e.id} db={db} est={e} ir={ir} p={p} />
                ))}
                {g.interesados
                  .sort((a, b) => a.nombre.localeCompare(b.nombre))
                  .map((x) => (
                    // V80 (maqueta V81, "5. ok"): botón "Inscribir" en cada
                    // interesado (escoge el curso abierto y sigue a la
                    // inscripción); tocar el nombre abre su ficha.
                    <div key={x.id}>
                      <div className="ce-est ce-int-fila-curso" role="button" tabIndex={0} onClick={() => ir(`interesados:${x.id}`)}>
                        <div className="ce-est-t">
                          <b>{x.nombre}</b>
                          {p.estudiantes ? (
                            <button className="btn vj-btn ce-int-insc ce-int-insc-mini" onClick={(e) => (e.stopPropagation(), setInscribiendo(inscribiendo === x.id ? null : x.id))}>
                              Inscribir
                            </button>
                          ) : (
                            <span className="ce-chip">Interesado</span>
                          )}
                        </div>
                        <div className="ce-est-m">{[x.fuente, x.cel ? formatoCel(x.cel) : ""].filter(Boolean).join(" · ")}</div>
                      </div>
                      {inscribiendo === x.id && <ElegirCurso db={db} x={x} modo="inscribir" ir={ir} cerrar={() => setInscribiendo(null)} alInscribir={(f) => ir(`nuevo:${x.id}:${f.id}`)} alMandar={async () => {}} avisar={avisar} />}
                    </div>
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
      {!esperaPorCurso.length && <div className="card hint-text">No hay interesados.</div>}
    </>
  );
}

// V68 ("17. A"): los estudiantes de una etapa. Se llega tocando un cuadro de
// "Seguimiento" en Inicio (antes era "Por etapa", abajo en Cursos).
export function PorEtapa({ db, p, ir, etapa }) {
  const fx = FILTROS.find((f) => f.k === etapa && (f.k !== "debe" || p.montos)) || FILTROS[0];
  const lista = db.estudiantes.filter((e) => fx.f(e, db)).sort((a, b) => buzoDe(db, a).nombre.localeCompare(buzoDe(db, b).nombre));
  return (
    <>
      <a className="back-link" onClick={() => ir("inicio")} style={{ cursor: "pointer" }}>
        ← Inicio
      </a>
      <h1 className="page-title">
        {fx.t} <span className="ce-etapa-n">{lista.length}</span>
      </h1>
      {lista.map((e) => (
        <FilaEstudiante key={e.id} db={db} est={e} ir={ir} p={p} />
      ))}
      {!lista.length && <div className="card hint-text">{`Nadie en "${fx.t}".`}</div>}
    </>
  );
}

// V80 (maqueta V81, "4"): escoger el lunes en que empieza un curso.
const MESES_CAL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const isoCal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function CalendarioLunes({ valor, onChange, marcados = [] }) {
  const hoy = hoyISO();
  const [abierto, setAbierto] = useState(!valor);
  const [mes, setMes] = useState(() => {
    const [a, m] = (valor || hoy).split("-").map(Number);
    return { a, m: m - 1 };
  });
  const primero = new Date(mes.a, mes.m, 1);
  const inicio = new Date(primero);
  inicio.setDate(1 - ((primero.getDay() + 6) % 7));
  const celdas = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
  const cambiar = (n) => setMes(({ a, m }) => ({ a: m + n < 0 ? a - 1 : m + n > 11 ? a + 1 : a, m: (m + n + 12) % 12 }));
  return (
    <>
      <button type="button" className="ce-fecha-val" onClick={() => setAbierto((x) => !x)}>
        <span>{valor ? `lunes ${fechaCorta(valor)} ${valor.slice(0, 4)}` : "Escoge el lunes…"}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {abierto && (
        <div className="ce-mcal">
          <div className="ce-mcal-cab">
            <button type="button" onClick={() => cambiar(-1)} aria-label="Mes anterior">
              ‹
            </button>
            <b>
              {MESES_CAL[mes.m][0].toUpperCase() + MESES_CAL[mes.m].slice(1)} {mes.a}
            </b>
            <button type="button" onClick={() => cambiar(1)} aria-label="Mes siguiente">
              ›
            </button>
          </div>
          <div className="ce-mcal-g">
            {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => (
              <span key={d}>{d}</span>
            ))}
            {celdas.map((d) => {
              const k = isoCal(d);
              const fuera = d.getMonth() !== mes.m;
              const lun = d.getDay() === 1 && (k >= hoy || k === valor);
              return (
                <button
                  type="button"
                  key={k}
                  disabled={!lun}
                  className={`${fuera ? "fuera " : ""}${lun ? "lun " : ""}${k === valor ? "sel " : ""}${marcados.includes(k) ? "ya" : ""}`}
                  title={marcados.includes(k) ? "Ya hay un curso igual ese lunes" : undefined}
                  onClick={() => (onChange(k), setAbierto(false))}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          {marcados.length > 0 && <div className="hint-text" style={{ margin: "6px 0 0" }}>En verde: ya hay un curso igual ese lunes.</div>}
        </div>
      )}
    </>
  );
}

// V57 -- Crear o editar un curso (una fecha de un curso de la Base de datos).
function FormCurso({ db, form, setForm, yo, ops, avisar, alCrear }) {
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
    if (ok && nueva) alCrear?.(f, c);
  }
  return (
    <div className="ce-form ce-form-curso" style={{ marginTop: 10 }}>
      <b>{form.id ? "Editar este curso" : "Crear curso"}</b>
      {!form.id && enEspera > 0 && <div className="tec-recordatorio">Hay {enEspera} esperando un cupo de {c.nombre}. Cuando lo crees, pásalos desde su ficha.</div>}
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
        {/* V80 (notas del 13-nov: 'Quita el "siempre lunes". y escribe el
            formato de la fecha completo "lunes"', y "Aquí para coger la
            fecha que me aparezca tipo calendario" → maqueta V81, "4. El
            calendario me gusta"): un calendario donde solo se tocan los
            lunes; en verde los que ya tienen ese mismo curso abierto. */}
        <div className="ce-campo-fecha">
          <span>Empieza el</span>
          <CalendarioLunes valor={form.inicio} onChange={(v) => setForm({ ...form, inicio: v })} marcados={c ? (db.fechas || []).filter((x) => x.activo && x.cursoId === c.id && x.id !== form.id).map((x) => x.inicio) : []} />
        </div>
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
              if (k > 0 && !window.confirm(`Este curso tiene ${k} estudiante${k === 1 ? "" : "s"}. Ya no van a salir en el curso (quedan cancelados, con su ficha en la base). ¿Borrarlo?`)) return;
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
// V62 ("234. B"): cómo va cada curso, en palabras, con el color del puntito.
function lineaCurso(e) {
  if (e.estado === "espera") return { c: "amarillo", t: "esperando fecha" };
  if (e.estado === "curso") {
    if (!e.fechaInicio) return { c: "verde", t: "en curso" };
    return e.fechaInicio > hoyISO() ? { c: "verde", t: `empieza el ${fechaCursoCorta(e.fechaInicio)}` } : { c: "verde", t: `en curso (${fechaCursoCorta(e.fechaInicio)})` };
  }
  if (e.estado === "almacen") return { c: "naranja", t: "pendiente procesar" };
  if (e.estado === "certificacion") return { c: "rojo", t: "certificación lista" };
  if (e.estado === "entregada" || e.estado === "avisado") return { c: "gris", t: "terminado" };
  if (e.estado === "cancelado") return { c: "gris", t: "cancelado" };
  return { c: "gris", t: nombreEtapa(e.estado).toLowerCase() };
}

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
              {/* V62 ("234. B", maqueta de la 200): una línea por curso con un
                  puntito de color, en vez de dos etiquetas separadas. */}
              {ests.map((e) => {
                const l = lineaCurso(e);
                return (
                  <button key={e.id} className="ce-dir-curso" onClick={() => ir(`estudiante:${e.id}`)}>
                    <i className={`ce-punto ${l.c}`} />
                    <span>
                      {e.curso} — {l.t}
                    </span>
                  </button>
                );
              })}
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
    // V76 (pedido explícito, con foto: "Cambiar base de datos por 'catalogo
    // de cursos'").
    { r: "basedatos", t: "Catálogo de cursos", sub: "Los cursos que damos y los instructores.", I: IconCatalog },
    // V85 (maqueta V85, "1, a"): darle el app de los clientes a la gente.
    { r: "appgus", t: "App Gus Dive (para los clientes)", sub: "El link, el código QR y mandarlo por WhatsApp.", I: IconLink },
    // V67 ("4"): Estadísticas; y la Bitácora con su permiso ("3").
    ...(p.estadisticas ? [{ r: "estadisticas", t: "Estadísticas", sub: "Estudiantes, cursos, cobros, interesados y certificaciones.", I: IconChart }] : []),
    ...(p.bitacora ? [{ r: "bitacora", t: "Bitácora", sub: "Todo lo que se ha hecho, con quién y cuándo.", I: IconHistory }] : []),
    // V76 (pedido explícito, con foto: "Quitame administracion de mas y
    // ponmelo en settings asi como lo tenemos en los otros apps") -- ya
    // estaba en Settings (el engranaje); aquí era un duplicado. Como en
    // App Interno y App Equipos de clientes, Administración vive solo ahí.
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

// V85 (maqueta V85, pregunta 1: "1, a") -- Más › App Gus Dive: el link del
// app de los clientes (/gus), su código QR para que lo escaneen en la tienda,
// "Copiar link", "Mandar por WhatsApp" (con el mensaje ya escrito) e
// "Imprimir el QR".
const MSG_APP_GUS = "Hola, descarga el app de Gus Dive para ver los próximos cursos y buceos, tus cursos y tus datos:";
export function AppGusDive({ ir, avisar }) {
  const [imprimir, setImprimir] = useState(false);
  const url = urlCompleta("/gus");
  function copiar() {
    try {
      navigator.clipboard
        .writeText(url)
        .then(() => avisar?.("Link copiado"))
        .catch(() => avisar?.(url));
    } catch {
      avisar?.(url);
    }
  }
  return (
    <>
      <a className="back-link" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">App Gus Dive</h1>
      <div className="hint-text" style={{ marginBottom: 12 }}>
        La app de los clientes: los próximos cursos y buceos, sus cursos, sus buceos y sus datos. Se instala desde el link, sin App Store.
      </div>
      <div className="card ce-appgus">
        <div className="ce-appgus-qr" dangerouslySetInnerHTML={{ __html: svgQr(url, 5) }} />
        <div className="hint-text">Que lo escaneen con la cámara del celular</div>
        <div className="ce-appgus-url">{url}</div>
        <div className="ce-appgus-bot">
          <button className="btn secondary vj-btn" onClick={copiar}>
            Copiar link
          </button>
          <a className="btn vj-btn ce-wa" href={`https://wa.me/?text=${encodeURIComponent(`${MSG_APP_GUS} ${url}`)}`} target="_blank" rel="noopener noreferrer">
            <IconoWA on /> Mandar por WhatsApp
          </a>
          <button className="btn secondary vj-btn" onClick={() => setImprimir(true)}>
            Imprimir el QR
          </button>
        </div>
      </div>
      {imprimir && <VentanaQr url={url} titulo="Descarga el app de Gus Dive" onCerrar={() => setImprimir(false)} />}
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
