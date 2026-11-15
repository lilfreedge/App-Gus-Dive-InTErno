"use client";

import { useEffect, useState } from "react";
import { CampoCel } from "@/components/viajes/Piezas";
import { soloDigitos, formatoCedula, celValido, rd, fechaObj, fechaCorta } from "@/lib/viajes/modelo";
import { leerPersona, guardarPersona, olvidarPersona } from "@/lib/app-gus";
import InstalarApp from "@/components/InstalarApp";

// V81 -- "App Gus" (maqueta V82 aprobada: "1. app gus", "2. ok"; y "¿hay
// manera de que la gente pueda poner su cédula una vez y que quede guardado
// para siempre? y que arriba le diga 'hola fulano'"). Una sola app para los
// clientes: sin entrar, los próximos cursos y buceos; con su cédula y su
// celular (una vez, queda guardado en su celular), "Hola, Ana" con sus
// cursos, sus buceos y su perfil. Lo de adentro usa lo que ya existía: el
// registro de cursos (/estudiante), "Mis documentos", el link de cada buceo
// y el perfil del buzo.
const DIA3 = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIA_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

async function post(url, cuerpo) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error || "No se pudo. Intenta de nuevo.");
    e.status = r.status;
    throw e;
  }
  return j;
}

function Fecha({ iso, tipo }) {
  const d = fechaObj(iso);
  return (
    <span className={`ag-fc ${tipo}`}>
      <small>{DIA3[d.getDay()]}</small>
      <b>{d.getDate()}</b>
      <small>{MES3[d.getMonth()]}</small>
    </span>
  );
}
const cupos = (q) => (q == null ? "" : q === 0 ? "Lleno · lista de espera" : `Quedan ${q} ${q === 1 ? "cupo" : "cupos"}`);

export default function AppGus({ cursos, buceos }) {
  const [listo, setListo] = useState(false); // ya leyó lo guardado en el celular
  const [persona, setPersona] = useState(null);
  const [yo, setYo] = useState(null); // { primer, cursos, buceos, perfil }
  const [tab, setTab] = useState("cursos");
  const [entrando, setEntrando] = useState(false);
  const [tipoDoc, setTipoDoc] = useState("cedula");
  const [doc, setDoc] = useState("");
  const [cel, setCel] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function cargar(p, nuevo) {
    setCargando(true);
    setError("");
    try {
      const [b, e] = await Promise.all([
        post("/api/app-gus", p),
        post("/api/estudiantes/publico", { accion: "estado", ...p }).catch(() => null),
      ]);
      guardarPersona({ ...p, primer: b.primer });
      setPersona({ ...p, primer: b.primer });
      setYo({ primer: b.primer, perfil: b.perfil, proximos: b.proximos, anteriores: b.anteriores, estudios: e?.estudios || [], falta: e?.falta || {} });
      if (nuevo) setEntrando(false);
    } catch (err) {
      // Si lo guardado ya no sirve (cambió el celular, por ejemplo), se olvida.
      if (!nuevo) {
        olvidarPersona();
        setPersona(null);
      }
      setError(err.message);
    }
    setCargando(false);
  }

  useEffect(() => {
    const p = leerPersona();
    if (p) {
      setPersona(p);
      cargar({ tipoDoc: p.tipoDoc, doc: p.doc, cel: p.cel }, false);
    }
    setListo(true);
  }, []);

  function salir() {
    olvidarPersona();
    setPersona(null);
    setYo(null);
    setDoc("");
    setCel("");
    setTab("cursos");
  }
  const docListo = tipoDoc === "cedula" ? soloDigitos(doc).length === 11 : doc.replace(/[\s-]/g, "").length >= 6;
  const nombre = yo?.primer || persona?.primer || "";

  return (
    <div className="pb ag">
      <div className="pb-head">
        <img src="/logo-gus-icon.png" alt="Gus Dive Center" style={{ height: 24 }} />
        <img src="/logo-snsi.png" alt="SNSI" className="ce-logo-snsi" />
        <span>Gus Dive Center</span>
      </div>
      <div className="pb-body">
        <div className="ag-hola">
          <div className="ag-hola-t">{persona && nombre ? `Hola, ${nombre}` : "Hola"}</div>
          {!persona && <div className="pb-h" style={{ margin: 0 }}>Cursos y buceos de Gus Dive Center</div>}
        </div>

        {/* ---------- Ya entró ---------- */}
        {persona && (
          <>
            <div className="ag-tabs">
              {[
                ["cursos", "Mis cursos"],
                ["buceos", "Mis buceos"],
                ["perfil", "Mi perfil"],
              ].map(([k, t]) => (
                <button key={k} className={tab === k ? "sel" : ""} onClick={() => setTab(k)}>
                  {t}
                </button>
              ))}
            </div>
            {!yo && cargando && <div className="pb-card pb-h">Un momento…</div>}
            {yo && tab === "cursos" && (
              <>
                {yo.estudios.map((e) => (
                  <div key={e.id} className="pb-card ag-curso">
                    <b>{e.curso}</b>
                    <div className="pb-h" style={{ margin: "2px 0 0" }}>
                      {e.fechaInicio ? `Empieza el ${DIA_LARGO[fechaObj(e.fechaInicio).getDay()]} ${fechaCorta(e.fechaInicio)}` : e.etapa}
                    </div>
                    {e.avance?.total > 0 && (
                      <>
                        <div className="ag-barra">
                          <i style={{ width: `${e.avance.pct}%` }} />
                        </div>
                        <small className="ag-gris">
                          {e.avance.hechos} de {e.avance.total} pasos listos
                        </small>
                      </>
                    )}
                    <div className="ag-chips">
                      {e.debe > 0 ? <span className="ag-chip rojo">Debe {rd(e.debe)}</span> : e.precio ? <span className="ag-chip">Pagado</span> : null}
                      {e.estado !== "espera" && (yo.falta.foto || yo.falta.cedula) && <span className="ag-chip rojo">Falta {[yo.falta.foto && "tu foto", yo.falta.cedula && "tu cédula"].filter(Boolean).join(" y ")}</span>}
                      {e.estado === "espera" && <span className="ag-chip gris">En lista de espera</span>}
                    </div>
                  </div>
                ))}
                {!yo.estudios.length && <div className="pb-card pb-h">Todavía no tienes cursos con nosotros.</div>}
                <a className="pb-btn" href="/estudiante?mis=1">
                  Ver mis documentos
                </a>
                <a className="ag-link" href="/estudiante">
                  Inscribirme en un curso
                </a>
              </>
            )}
            {yo && tab === "buceos" && (
              <>
                {yo.proximos.map((x) => (
                  <a key={x.id} className="ag-item" href={`/inscripcion/${x.slug}`}>
                    <Fecha iso={x.fecha} tipo="buc" />
                    <span className="ag-tx">
                      <b>{x.nombre}</b>
                      <small>{x.espera ? "En lista de espera" : x.pago?.t || "Inscrito"}</small>
                    </span>
                  </a>
                ))}
                {!yo.proximos.length && <div className="pb-card pb-h">No tienes buceos próximos.</div>}
                {buceos.filter((v) => !yo.proximos.some((x) => x.slug === v.slug)).length > 0 && <div className="ag-sec">Otros próximos buceos</div>}
                {buceos
                  .filter((v) => !yo.proximos.some((x) => x.slug === v.slug))
                  .map((v) => (
                    <a key={v.slug} className="ag-item" href={`/inscripcion/${v.slug}`}>
                      <Fecha iso={v.fecha} tipo="buc" />
                      <span className="ag-tx">
                        <b>{v.nombre}</b>
                        <small>{cupos(v.quedan) || v.salida}</small>
                      </span>
                      <span className="ag-mini buc">Inscribirme</span>
                    </a>
                  ))}
                {yo.anteriores.length > 0 && (
                  <>
                    <div className="ag-sec">Tus buceos anteriores</div>
                    {yo.anteriores.map((x) => (
                      <div key={x.id} className="ag-item ag-viejo">
                        <Fecha iso={x.fecha} tipo="gris" />
                        <span className="ag-tx">
                          <b>{x.nombre}</b>
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
            {yo && tab === "perfil" && (
              <div className="pb-card">
                {[
                  ["Nombre", yo.perfil.nombre],
                  ["Celular", yo.perfil.cel],
                  ["Correo", yo.perfil.correo || "—"],
                  ["Certificación", [yo.perfil.agencia, yo.perfil.nivel].filter(Boolean).join(" · ") || "—"],
                  ["Tallas", [yo.perfil.tallas?.bcd && `BCD ${yo.perfil.tallas.bcd}`, yo.perfil.tallas?.wetsuit && `Wetsuit ${yo.perfil.tallas.wetsuit}`, yo.perfil.tallas?.chapaletas && `Chapaletas ${yo.perfil.tallas.chapaletas}`].filter(Boolean).join(" · ") || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="ag-dato">
                    <span>{k}</span>
                    <b>{v}</b>
                  </div>
                ))}
                <a className="pb-btn sec" href="/estudiante?mis=1" style={{ marginTop: 12 }}>
                  Cambiar mis datos
                </a>
              </div>
            )}
            {error && <div className="pb-error">{error}</div>}
            <button className="ag-link" onClick={salir}>
              Salir
            </button>
          </>
        )}

        {/* ---------- Sin entrar ---------- */}
        {!persona && listo && (
          <>
            <div className="ag-sec">Próximos cursos</div>
            {cursos.map((c) => (
              <a key={c.fechaId} className="ag-item" href={`/estudiante?curso=${encodeURIComponent(c.fechaId)}`}>
                <Fecha iso={c.inicio} tipo="cur" />
                <span className="ag-tx">
                  <b>{c.curso}</b>
                  <small>{cupos(c.quedan) || "Abierto"}</small>
                </span>
                <span className="ag-mini cur">Inscribirme</span>
              </a>
            ))}
            {!cursos.length && <div className="pb-card pb-h">Pronto abrimos nuevos cursos.</div>}
            <div className="ag-sec">Próximos buceos</div>
            {buceos.map((v) => (
              <a key={v.slug} className="ag-item" href={`/inscripcion/${v.slug}`}>
                <Fecha iso={v.fecha} tipo="buc" />
                <span className="ag-tx">
                  <b>{v.nombre}</b>
                  <small>{cupos(v.quedan) || v.salida}</small>
                </span>
                <span className="ag-mini buc">Inscribirme</span>
              </a>
            ))}
            {!buceos.length && <div className="pb-card pb-h">Pronto publicamos los próximos buceos.</div>}

            {!entrando ? (
              <button className="pb-btn ag-entrar" onClick={() => setEntrando(true)}>
                Entrar con mi cédula
              </button>
            ) : (
              <div className="pb-card" style={{ marginTop: 14 }}>
                <div className="pb-t">Entrar</div>
                <div className="pb-h">Lo pones una sola vez: queda guardado en este celular.</div>
                <div className="pb-seg">
                  <button className={tipoDoc === "cedula" ? "sel" : ""} onClick={() => (setTipoDoc("cedula"), setDoc(""))}>
                    Cédula
                  </button>
                  <button className={tipoDoc === "pasaporte" ? "sel" : ""} onClick={() => (setTipoDoc("pasaporte"), setDoc(""))}>
                    Otro documento
                  </button>
                </div>
                <input
                  className="pb-input"
                  inputMode={tipoDoc === "cedula" ? "numeric" : "text"}
                  value={doc}
                  onChange={(e) => setDoc(tipoDoc === "cedula" ? formatoCedula(e.target.value) : e.target.value.toUpperCase())}
                  placeholder={tipoDoc === "cedula" ? "000-0000000-0" : "Pasaporte"}
                  autoComplete="off"
                />
                <label className="ce-pub-l">Tu celular</label>
                <CampoCel className="pb-input" value={cel} onChange={setCel} />
                {error && <div className="pb-error">{error}</div>}
                <button className="pb-btn" disabled={cargando || !docListo || !celValido(cel)} onClick={() => cargar({ tipoDoc, doc, cel }, true)}>
                  {cargando ? "Un momento…" : "Entrar"}
                </button>
                <button className="pb-btn sec" onClick={() => (setEntrando(false), setError(""))}>
                  Atrás
                </button>
              </div>
            )}
            <a className="ag-link" href="/me-interesa">
              ¿No hay tu curso? Avísanos que te interesa
            </a>
          </>
        )}

        <InstalarApp style={{ marginTop: 16 }} />
      </div>
    </div>
  );
}
