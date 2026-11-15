"use client";

import { useEffect, useState } from "react";
import { CampoCel, IconoWA } from "@/components/viajes/Piezas";
import { soloDigitos, formatoCedula, celValido, rd, fechaObj, fechaCorta } from "@/lib/viajes/modelo";
import { leerPersona, guardarPersona, olvidarPersona } from "@/lib/app-gus";
import InstalarApp from "@/components/InstalarApp";
import { IconHome, IconEstudiantes, IconDivingMask, IconCalendar, IconUser, IconMapPin, IconBell, IconArrowLeft, IconInstagram, IconGlobe } from "@/components/icons";

// V81 -- "App Gus" (maqueta V82 aprobada: "1. app gus", "2. ok"; y "¿hay
// manera de que la gente pueda poner su cédula una vez y que quede guardado
// para siempre? y que arriba le diga 'hola fulano'"). Una sola app para los
// clientes: sin entrar, los próximos cursos y buceos; con su cédula y su
// celular (una vez, queda guardado en su celular), "Hola, Ana" con sus
// cursos, sus buceos y su perfil. Lo de adentro usa lo que ya existía: el
// registro de cursos (/estudiante), "Mis documentos", el link de cada buceo
// y el perfil del buzo.
//
// V83: se llama "Gus Dive" ("dentro del app de Gus Dive cambia Gus Dive
// Center por Gus Dive").
//
// V84 (maqueta V84: "1. sí", "2. a b c") -- menú abajo, como en cualquier
// app: Inicio, Cursos, Buceos, Calendario y Mi cuenta. "Entrar con mi
// cédula" pasó a Mi cuenta. Cursos: todos los cursos con su información y
// su precio, aunque no tengan fecha. Calendario: cursos (amarillo) y buceos
// (azul). En Inicio: Contacto (a), precios de alquiler (b) y "Avísame de
// cursos y buceos nuevos" (c, notificación en el celular).
const DIA3 = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIA_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MENU = [
  ["inicio", "Inicio", IconHome],
  ["cursos", "Cursos", IconEstudiantes],
  ["buceos", "Buceos", IconDivingMask],
  ["calendario", "Calendario", IconCalendar],
  ["cuenta", "Mi cuenta", IconUser],
];
// Contacto (a). Pipe: "puedes consultarlo en Google Maps, aparecemos" (con
// el link de la tienda) -- la dirección y el horario son los de Google Maps
// del 15-nov.
const CONTACTO = {
  mapa: "https://maps.app.goo.gl/98rwUPZJQW4ke6Lv7",
  direccion: "Av. Roberto Pastoriza 356, Plaza La Lira II",
  horario: [
    ["Lunes", "9:00 a. m. a 7:00 p. m."],
    ["Martes a viernes", "1:00 a 7:00 p. m."],
    ["Sábado", "9:00 a. m. a 5:00 p. m."],
    ["Domingo", "Cerrado"],
  ],
  // Pipe (15-nov): el Instagram y la página web.
  instagram: "gusdivecenter",
  web: "https://www.gusdivecenter.com/",
};

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
const linkCurso = (c) => `/estudiante?curso=${encodeURIComponent(c.fechaId)}`;

function ItemCurso({ c, titulo }) {
  return (
    <a className="ag-item" href={linkCurso(c)}>
      <Fecha iso={c.inicio} tipo="cur" />
      <span className="ag-tx">
        <b>{titulo || c.curso}</b>
        <small>{cupos(c.quedan) || "Abierto"}</small>
      </span>
      <span className="ag-mini cur">Inscribirme</span>
    </a>
  );
}
function ItemBuceo({ v }) {
  return (
    <a className="ag-item" href={`/inscripcion/${v.slug}`}>
      <Fecha iso={v.fecha} tipo="buc" />
      <span className="ag-tx">
        <b>{v.nombre}</b>
        <small>{cupos(v.quedan) || v.salida}</small>
      </span>
      <span className="ag-mini buc">Inscribirme</span>
    </a>
  );
}

// ------------------------------------------------------------ avisos (c)
// Usa el mismo service worker de los avisos del personal (sw-viajes.js, que
// solo enseña el aviso y abre su link), para no pisarlo en un celular que
// tenga las dos apps. "Desactivar" solo lo quita de la lista de clientes.
const b64 = (s) => {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};
const CLAVE_AVISOS = "gus-avisos";
function leerMarca() {
  try {
    return localStorage.getItem(CLAVE_AVISOS) === "1";
  } catch {
    return false;
  }
}
function ponerMarca(si) {
  try {
    if (si) localStorage.setItem(CLAVE_AVISOS, "1");
    else localStorage.removeItem(CLAVE_AVISOS);
  } catch {}
}
function useAvisos() {
  const [estado, setEstado] = useState(""); // "" (no se puede) | pedir | activos | bloqueados
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "denied") return setEstado("bloqueados");
    (async () => {
      const reg = await navigator.serviceWorker.getRegistration("/").catch(() => null);
      const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
      setEstado(sub && Notification.permission === "granted" && leerMarca() ? "activos" : "pedir");
    })();
  }, []);
  async function activar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw-viajes.js", { scope: "/" });
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setEstado(perm === "denied" ? "bloqueados" : "pedir");
        setOcupado(false);
        return;
      }
      const r = await fetch("/api/app-gus/avisos");
      const j = await r.json();
      if (!r.ok || !j.publica) throw new Error(j.error || "");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(j.publica) }));
      await post("/api/app-gus/avisos", { suscripcion: sub.toJSON() });
      ponerMarca(true);
      setEstado("activos");
    } catch {
      setEstado("pedir");
    }
    setOcupado(false);
  }
  async function desactivar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) await fetch("/api/app-gus/avisos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    } catch {}
    ponerMarca(false);
    setEstado("pedir");
    setOcupado(false);
  }
  return { estado, ocupado, activar, desactivar };
}

// ------------------------------------------------------------ calendario
function Calendario({ cursos, buceos }) {
  const hoy = new Date();
  const [mes, setMes] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [dia, setDia] = useState(null);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const porDia = {};
  for (const c of cursos) (porDia[c.inicio] = porDia[c.inicio] || { c: [], b: [] }).c.push(c);
  for (const v of buceos) (porDia[v.fecha] = porDia[v.fecha] || { c: [], b: [] }).b.push(v);
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const vacios = (primero.getDay() + 6) % 7; // la semana empieza el lunes
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const esteMes = mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth();
  const delMes = Object.keys(porDia)
    .filter((k) => k.startsWith(iso(primero).slice(0, 7)))
    .sort();
  const mostrar = dia ? [dia] : delMes;
  const mover = (n) => (setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1)), setDia(null));
  return (
    <>
      <div className="ag-titulo">Calendario</div>
      <div className="pb-card ag-cal">
        <div className="ag-cal-t">
          <button disabled={esteMes} onClick={() => mover(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <b>
            {MES_LARGO[mes.getMonth()]} {mes.getFullYear()}
          </b>
          <button onClick={() => mover(1)} aria-label="Mes siguiente">
            ›
          </button>
        </div>
        <div className="ag-cal-dias">
          {["L", "M", "M", "J", "V", "S", "D"].map((x, k) => (
            <span key={k} className="h">
              {x}
            </span>
          ))}
          {Array.from({ length: vacios }).map((_, k) => (
            <span key={`v${k}`} />
          ))}
          {Array.from({ length: diasMes }).map((_, k) => {
            const d = iso(new Date(mes.getFullYear(), mes.getMonth(), k + 1));
            const e = porDia[d];
            return (
              <button key={d} className={`d${dia === d ? " sel" : ""}${e ? " con" : ""}`} onClick={() => setDia(dia === d ? null : d)}>
                {k + 1}
                {e && (
                  <span className="pts">
                    {e.c.length > 0 && <i className="cur" />}
                    {e.b.length > 0 && <i className="buc" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="ag-cal-ley">
          <span>
            <i className="cur" />
            Cursos
          </span>
          <span>
            <i className="buc" />
            Buceos
          </span>
        </div>
      </div>
      {mostrar.map((d) => (
        <div key={d}>
          <div className="ag-sec">
            {DIA_LARGO[fechaObj(d).getDay()]} {fechaObj(d).getDate()} de {MES_LARGO[fechaObj(d).getMonth()]}
          </div>
          {(porDia[d]?.c || []).map((c) => (
            <ItemCurso key={c.fechaId} c={c} />
          ))}
          {(porDia[d]?.b || []).map((v) => (
            <ItemBuceo key={v.slug} v={v} />
          ))}
          {!porDia[d] && <div className="pb-card pb-h">No hay cursos ni buceos ese día.</div>}
        </div>
      ))}
      {!mostrar.length && <div className="pb-card pb-h">No hay cursos ni buceos este mes.</div>}
    </>
  );
}

// ------------------------------------------------------------ cursos
function Cursos({ catalogo, cursos }) {
  const [abierto, setAbierto] = useState(null);
  const c = abierto ? catalogo.find((x) => x.id === abierto) : null;
  if (c) {
    const fechas = cursos.filter((f) => f.cursoId === c.id);
    const info = c.info || {};
    return (
      <>
        <button className="ag-volver" onClick={() => setAbierto(null)}>
          <IconArrowLeft size={16} /> Cursos
        </button>
        <div className="ag-titulo">{c.nombre}</div>
        <div className="pb-h" style={{ margin: "0 0 10px" }}>
          {[info.nivel, c.precio ? `${rd(c.precio)} (ITBIS incluido)` : ""].filter(Boolean).join(" · ")}
        </div>
        {(info.que || info.aprenderas || info.duracion || info.requisitos) && (
          <div className="pb-card ag-info">
            {[
              ["Qué es", info.que],
              ["Aprenderás", info.aprenderas],
              ["Duración", info.duracion],
              ["Requisitos", info.requisitos],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <h4>{k}</h4>
                  <p>{v}</p>
                </div>
              ))}
          </div>
        )}
        <div className="ag-sec">Próximas fechas</div>
        {fechas.map((f) => (
          <ItemCurso key={f.fechaId} c={f} titulo={`Empieza el ${DIA_LARGO[fechaObj(f.inicio).getDay()]} ${fechaCorta(f.inicio)}`} />
        ))}
        {!fechas.length && (
          <>
            <div className="pb-card pb-h">Todavía no hay fecha para este curso.</div>
            <a className="pb-btn" href={`/me-interesa?curso=${encodeURIComponent(c.nombre)}`}>
              Avísame cuando haya fecha
            </a>
          </>
        )}
      </>
    );
  }
  return (
    <>
      <div className="ag-titulo">Cursos</div>
      <div className="pb-h" style={{ margin: "0 0 10px" }}>
        Todos los cursos de Gus Dive
      </div>
      {catalogo.map((x) => {
        const prox = cursos.find((f) => f.cursoId === x.id);
        return (
          <button key={x.id} className="ag-curso-cat" onClick={() => (setAbierto(x.id), window.scrollTo(0, 0))}>
            <span className="ag-curso-cat-t">
              <b>{x.nombre}</b>
              {x.info?.nivel && <span className="ag-nivel">{x.info.nivel}</span>}
            </span>
            <span className="ag-curso-cat-l">
              <span>{prox ? `Próximo: ${DIA3[fechaObj(prox.inicio).getDay()]} ${fechaCorta(prox.inicio)}` : "Sin fecha todavía"}</span>
              <span>{x.precio ? <b>{rd(x.precio)}</b> : null} ›</span>
            </span>
          </button>
        );
      })}
      {!catalogo.length && <div className="pb-card pb-h">Pronto publicamos los cursos.</div>}
      <a className="ag-link" href="/me-interesa">
        ¿No hay tu curso? Avísanos que te interesa
      </a>
    </>
  );
}

// ------------------------------------------------------------ app
export default function AppGus({ cursos, catalogo = [], buceos, alquiler = [], whatsapp = "" }) {
  const [tab, setTabEstado] = useState("inicio");
  const [listo, setListo] = useState(false); // ya leyó lo guardado en el celular
  const [persona, setPersona] = useState(null);
  const [yo, setYo] = useState(null); // { primer, cursos, buceos, perfil }
  const [sub, setSub] = useState("cursos");
  const [tipoDoc, setTipoDoc] = useState("cedula");
  const [doc, setDoc] = useState("");
  const [cel, setCel] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verPrecios, setVerPrecios] = useState(false);
  const avisos = useAvisos();

  // La pestaña queda en la dirección (#cursos), así "atrás" vuelve a ella.
  function setTab(t) {
    setTabEstado(t);
    try {
      history.replaceState(null, "", t === "inicio" ? location.pathname + location.search : `#${t}`);
    } catch {}
    window.scrollTo(0, 0);
  }

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
    const h = (location.hash || "").slice(1);
    if (MENU.some(([k]) => k === h)) setTabEstado(h);
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
    setSub("cursos");
  }
  const docListo = tipoDoc === "cedula" ? soloDigitos(doc).length === 11 : doc.replace(/[\s-]/g, "").length >= 6;
  const nombre = yo?.primer || persona?.primer || "";
  const wa = whatsapp ? `https://wa.me/${soloDigitos(whatsapp).length === 10 ? "1" : ""}${soloDigitos(whatsapp)}?text=${encodeURIComponent("Hola, les escribo desde el app de Gus Dive.")}` : "";

  return (
    <div className="pb ag ag-con-menu">
      <div className="pb-head">
        <img src="/logo-gus-icon.png" alt="Gus Dive" style={{ height: 24 }} />
        <img src="/logo-snsi.png" alt="SNSI" className="ce-logo-snsi" />
        <span>Gus Dive</span>
      </div>
      <div className="pb-body">
        {/* ---------- Inicio ---------- */}
        {tab === "inicio" && (
          <>
            <div className="ag-hola">
              <div className="ag-hola-t">{persona && nombre ? `Hola, ${nombre}` : "Hola"}</div>
              <div className="pb-h" style={{ margin: 0 }}>
                Cursos y buceos de Gus Dive
              </div>
            </div>
            <div className="ag-sec">Próximos cursos</div>
            {cursos.slice(0, 3).map((c) => (
              <ItemCurso key={c.fechaId} c={c} />
            ))}
            {!cursos.length && <div className="pb-card pb-h">Pronto abrimos nuevos cursos.</div>}
            {cursos.length > 3 && (
              <button className="ag-link" onClick={() => setTab("calendario")}>
                Ver todos en el calendario
              </button>
            )}
            <div className="ag-sec">Próximos buceos</div>
            {buceos.slice(0, 3).map((v) => (
              <ItemBuceo key={v.slug} v={v} />
            ))}
            {!buceos.length && <div className="pb-card pb-h">Pronto publicamos los próximos buceos.</div>}
            {buceos.length > 3 && (
              <button className="ag-link" onClick={() => setTab("buceos")}>
                Ver todos los buceos
              </button>
            )}

            {(avisos.estado === "pedir" || avisos.estado === "bloqueados") && (
              <div className="pb-card ag-avisos">
                <IconBell size={22} />
                <div>
                  <b>Avísame de cursos y buceos nuevos</b>
                  {avisos.estado === "pedir" ? (
                    <button className="pb-btn ag-avisos-si" disabled={avisos.ocupado} onClick={avisos.activar}>
                      {avisos.ocupado ? "Un momento…" : "Activar avisos"}
                    </button>
                  ) : (
                    <div className="pb-h" style={{ margin: "4px 0 0" }}>
                      Los avisos están bloqueados para esta página. Actívalos en los ajustes del celular.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="ag-sec">Contacto</div>
            <div className="pb-card ag-contacto">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <i>
                    <IconoWA on />
                  </i>
                  <span>
                    <b>Escríbenos por WhatsApp</b>
                    <small>Te contestamos ahí mismo</small>
                  </span>
                </a>
              )}
              <a href={CONTACTO.mapa} target="_blank" rel="noopener noreferrer">
                <i>
                  <IconMapPin size={18} />
                </i>
                <span>
                  <b>Cómo llegar</b>
                  <small>{CONTACTO.direccion}</small>
                </span>
              </a>
              {CONTACTO.horario.length > 0 && (
                <div className="ag-horario">
                  <i>
                    <IconCalendar size={18} />
                  </i>
                  <span>
                    <b>Horario</b>
                    {CONTACTO.horario.map(([d, h]) => (
                      <small key={d}>
                        {d}: {h}
                      </small>
                    ))}
                  </span>
                </div>
              )}
              {CONTACTO.instagram && (
                <a href={`https://www.instagram.com/${CONTACTO.instagram}/`} target="_blank" rel="noopener noreferrer">
                  <i>
                    <IconInstagram size={18} />
                  </i>
                  <span>
                    <b>Instagram</b>
                    <small>@{CONTACTO.instagram}</small>
                  </span>
                </a>
              )}
              {CONTACTO.web && (
                <a href={CONTACTO.web} target="_blank" rel="noopener noreferrer">
                  <i>
                    <IconGlobe size={18} />
                  </i>
                  <span>
                    <b>Página web</b>
                    <small>gusdivecenter.com</small>
                  </span>
                </a>
              )}
            </div>

            {alquiler.length > 0 && (
              <>
                <button className="ag-sec ag-sec-boton" onClick={() => setVerPrecios(!verPrecios)}>
                  Alquiler de equipo <span>{verPrecios ? "▴" : "▾"}</span>
                </button>
                {verPrecios && (
                  <div className="pb-card ag-precios">
                    {alquiler.map((x) => (
                      <div key={x.t} className="ag-dato">
                        <span>{x.t}</span>
                        <b>{rd(x.precio)}</b>
                      </div>
                    ))}
                    <div className="pb-h" style={{ margin: "8px 0 0" }}>
                      Precio por 3 días. El alquiler se hace en la tienda.
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ---------- Cursos ---------- */}
        {tab === "cursos" && <Cursos catalogo={catalogo} cursos={cursos} />}

        {/* ---------- Buceos ---------- */}
        {tab === "buceos" && (
          <>
            <div className="ag-titulo">Buceos</div>
            <div className="pb-h" style={{ margin: "0 0 10px" }}>
              Los próximos buceos y salidas
            </div>
            {buceos.map((v) => (
              <ItemBuceo key={v.slug} v={v} />
            ))}
            {!buceos.length && <div className="pb-card pb-h">Pronto publicamos los próximos buceos.</div>}
          </>
        )}

        {/* ---------- Calendario ---------- */}
        {tab === "calendario" && <Calendario cursos={cursos} buceos={buceos} />}

        {/* ---------- Mi cuenta ---------- */}
        {tab === "cuenta" && persona && (
          <>
            <div className="ag-hola">
              <div className="ag-hola-t">{nombre ? `Hola, ${nombre}` : "Mi cuenta"}</div>
            </div>
            <div className="ag-tabs">
              {[
                ["cursos", "Mis cursos"],
                ["buceos", "Mis buceos"],
                ["perfil", "Mi perfil"],
              ].map(([k, t]) => (
                <button key={k} className={sub === k ? "sel" : ""} onClick={() => setSub(k)}>
                  {t}
                </button>
              ))}
            </div>
            {!yo && cargando && <div className="pb-card pb-h">Un momento…</div>}
            {yo && sub === "cursos" && (
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
            {yo && sub === "buceos" && (
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
                    <ItemBuceo key={v.slug} v={v} />
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
            {yo && sub === "perfil" && (
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
            {avisos.estado === "activos" && (
              <div className="ag-avisos-on">
                Avisos de cursos y buceos nuevos: activados ·{" "}
                <button disabled={avisos.ocupado} onClick={avisos.desactivar}>
                  Desactivar
                </button>
              </div>
            )}
            <button className="ag-link" onClick={salir}>
              Salir
            </button>
          </>
        )}
        {tab === "cuenta" && !persona && listo && (
          <>
            <div className="ag-titulo">Mi cuenta</div>
            <div className="pb-card" style={{ marginTop: 6 }}>
              <div className="pb-h" style={{ marginTop: 0 }}>
                Entra con tu cédula para ver tus cursos, tus buceos y tus datos. La pones una sola vez: queda guardada en este celular.
              </div>
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
                {cargando ? "Un momento…" : "Entrar con mi cédula"}
              </button>
            </div>
            {avisos.estado === "activos" && (
              <div className="ag-avisos-on">
                Avisos de cursos y buceos nuevos: activados ·{" "}
                <button disabled={avisos.ocupado} onClick={avisos.desactivar}>
                  Desactivar
                </button>
              </div>
            )}
          </>
        )}

        <InstalarApp style={{ marginTop: 16 }} />
      </div>

      <nav className="ag-menu">
        {MENU.map(([k, t, Icono]) => (
          <button key={k} className={tab === k ? "sel" : ""} onClick={() => setTab(k)}>
            <Icono size={22} />
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
