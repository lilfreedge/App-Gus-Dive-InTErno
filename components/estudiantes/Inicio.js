"use client";

import { useState } from "react";
import { Buscar } from "@/components/viajes/Piezas";
import { IconHistory, IconUsers, IconLink, IconPlus } from "@/components/icons";
import { listoParaAlmacen, pagoInstructorPendiente, debe, rd, avance, faltaDe, fechaCorta, hoyISO, nombreEtapa, soloDigitos } from "@/lib/estudiantes/modelo";

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
  { k: "para-almacen", t: "Para el almacén", f: (e, db) => listoParaAlmacen(e, cursoDe(db, e)) },
  { k: "almacen", t: "En almacén", f: (e) => e.estado === "almacen" },
  { k: "por-avisar", t: "Por avisar", f: (e) => e.estado === "certificacion" },
  { k: "por-recoger", t: "Por recoger", f: (e) => e.estado === "avisado" },
  { k: "pago-instructor", t: "Pago al instructor", f: (e) => pagoInstructorPendiente(e) },
  { k: "debe", t: "Deben", f: (e) => e.estado !== "cancelado" && debe(e) > 0 },
  { k: "terminados", t: "Terminados", f: (e) => e.estado === "entregada" },
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
          {est.escuela ? ` · ${est.escuela}` : ""}
        </span>
      </div>
      <div className="ce-est-m">
        {[est.instructor, est.fechaInicio ? `${est.fechaInicio > hoyISO() ? "empieza" : "empezó"} el ${fechaCorta(est.fechaInicio)}` : ""].filter(Boolean).join(" · ")}
        {est.estado === "curso" ? (falta.length ? ` · falta ${falta.slice(0, 3).join(", ")}${falta.length > 3 ? "…" : ""}` : " · listo para el almacén") : ` · ${nombreEtapa(est.estado)}`}
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
    { k: "para-almacen", t: "Listos para mandar al almacén" },
    { k: "almacen", t: "En el almacén" },
    { k: "por-avisar", t: "Certificación lista, por avisar", rojo: true },
    { k: "por-recoger", t: "Avisados, por recoger" },
    { k: "pago-instructor", t: "Pago al instructor pendiente" },
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
            <button key={c.k} className={`ce-cuadro${c.rojo && v > 0 ? " rojo" : ""}`} onClick={() => ir(`estudiantes:${c.k}`)}>
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
          <button className="ce-cuadro" onClick={() => ir("estudiantes:debe")}>
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

export function Lista({ db, p, ir, filtroInicial }) {
  const [filtro, setFiltro] = useState(FILTROS.some((f) => f.k === filtroInicial) ? filtroInicial : "curso");
  const [q, setQ] = useState("");
  const fx = FILTROS.find((f) => f.k === filtro);
  const t = q.trim().toLowerCase();
  const td = soloDigitos(q);
  const lista = db.estudiantes
    .filter((e) => (t ? true : fx.f(e, db)))
    .filter((e) => {
      if (!t) return true;
      const b = buzoDe(db, e);
      return (b.nombre || "").toLowerCase().includes(t) || (td.length >= 4 && (soloDigitos(b.doc).includes(td) || soloDigitos(b.cel).includes(td))) || (b.pasaporte || "").toLowerCase().includes(t);
    })
    .sort((a, b) => buzoDe(db, a).nombre.localeCompare(buzoDe(db, b).nombre));
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
      <div className="vj-filtros" style={{ marginTop: 12 }}>
        {FILTROS.map((f) => (
          <button key={f.k} className={`vj-filtro ce-filtro${filtro === f.k && !t ? " sel" : ""}`} onClick={() => (setFiltro(f.k), setQ(""))}>
            {f.t} <span>{db.estudiantes.filter((e) => f.f(e, db)).length}</span>
          </button>
        ))}
      </div>
      <Buscar value={q} onChange={setQ} placeholder="Buscar por nombre, cédula o celular…" />
      {lista.map((e) => (
        <FilaEstudiante key={e.id} db={db} est={e} ir={ir} />
      ))}
      {!lista.length && <div className="card hint-text">{t ? "No hay nadie con esa búsqueda." : "No hay estudiantes en este paso."}</div>}
    </>
  );
}

export function Mas({ yo, ir }) {
  return (
    <>
      <h1 className="page-title">Más</h1>
      <div className="list">
        <button className="list-item toca ce-mas" onClick={() => ir("bitacora")}>
          <span className="list-item-title">
            <IconHistory size={16} /> Bitácora
          </span>
          <div className="list-item-meta">Todo lo que se ha hecho, con quién y cuándo.</div>
        </button>
        {yo.esTitular && (
          <button className="list-item toca ce-mas" onClick={() => ir("administracion")}>
            <span className="list-item-title">
              <IconUsers size={16} /> Administración
            </span>
            <div className="list-item-meta">Qué puede hacer cada persona en Control Estudiantes.</div>
          </button>
        )}
      </div>
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
