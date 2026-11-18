"use client";

import { useEffect, useRef, useState } from "react";
import { textoCalzado } from "@/lib/tallas";
import { useRouter } from "next/navigation";
import { CampoCel, IconoWA } from "@/components/viajes/Piezas";
import { soloDigitos, formatoCedula, celValido, rd, fechaObj, fechaCorta, hoyISO } from "@/lib/viajes/modelo";
import { leerPersona, guardarPersona, olvidarPersona, enApp } from "@/lib/app-gus";
import InstalarApp from "@/components/InstalarApp";
import { IconHome, IconEstudiantes, IconDivingMask, IconCalendar, IconUser, IconMapPin, IconBell, IconArrowLeft, IconInstagram, IconGlobe, IconCheck } from "@/components/icons";
import { horaBonita } from "@/lib/estudiantes/itinerario";

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
//
// V86 (maqueta V86: "¿cómo vamos a manejar esta parte aquí? porque quisiera
// que el cliente tenga acceso a ver su foto y demás" → "1. sí pero... otro
// color en vez de ese azul... intentemos con el amarillo de SNSI", "2. B",
// "3. sí", "puedes quitar la parte de mi certificación") -- Mi cuenta: arriba
// una tarjeta amarilla con su foto, su nombre y su certificación; en Mi
// perfil, "Mis datos" (con dirección y emergencia) y "Mis documentos" (su
// foto, su cédula y su firma, con "Ver"; sin la fila de "Mi certificación");
// en Mis cursos, sus pagos uno por uno. Las imágenes se abren con un permiso
// corto que da /api/app-gus/archivo (cédula + celular, igual que al entrar).
const DIA3 = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIA_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIA_NOMBRE = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]; // V87: el itinerario empieza el lunes
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
const cupos = (q) => (q == null ? "" : q === 0 ? "Lleno" : `Quedan ${q} ${q === 1 ? "cupo" : "cupos"}`);
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

// V87 (maqueta V87: "1. a", "2. hace falta más info para poder llamar más la
// atención del cliente, cuenta los beneficios", "3. no, solo en owd") -- la
// tarjeta de Nitrox dentro de Open Water Diver, antes de las fechas. Es la
// misma pareja que "Agregar Nitrox" del registro (Open Water → Nitrox). El
// precio y el botón salen del curso Nitrox del Catálogo; si no está en el
// link, la tarjeta no sale.
const ES_OWD = /^open water diver$/i;
const ES_NITROX = /^nitrox$/i;
const NITROX_BENEFICIOS = [
  ["Más tiempo en el fondo.", "Al respirar menos nitrógeno, puedes quedarte más tiempo a la misma profundidad."],
  ["Menos espera entre buceos.", "Sales con menos nitrógeno en el cuerpo, así que el descanso en la superficie puede ser más corto."],
  ["Más buceos en un mismo día.", "Ideal para viajes y fines de semana de buceo."],
  ["Te sirve en todas partes.", "La mayoría de los centros de buceo ofrecen Nitrox."],
];

// ------------------------------------------------------------ cursos
function Cursos({ catalogo, cursos, mensaje = "" }) {
  const [abierto, setAbierto] = useState(null);
  const c = abierto ? catalogo.find((x) => x.id === abierto) : null;
  if (c) {
    const fechas = cursos.filter((f) => f.cursoId === c.id);
    const info = c.info || {};
    // V87 ("en duración cámbialo y ponlo por días, lunes martes miércoles
    // etc"): la duración sale día por día, del itinerario del curso. Si el
    // curso no tiene itinerario, queda el texto de antes.
    const nitrox = ES_OWD.test(String(c.nombre || "").trim()) ? catalogo.find((x) => ES_NITROX.test(String(x.nombre || "").trim())) || null : null;
    const dias = (Array.isArray(c.semana) ? c.semana : []).map((t, i) => ({ dia: `${DIA_NOMBRE[i % 7]}${i >= 7 ? " siguiente" : ""}`, texto: String(t || "").trim() })).filter((x) => x.texto);
    return (
      <>
        <button className="ag-volver" onClick={() => setAbierto(null)}>
          <IconArrowLeft size={16} /> Cursos
        </button>
        <div className="ag-titulo">{c.nombre}</div>
        <div className="pb-h" style={{ margin: "0 0 10px" }}>
          {[info.nivel, c.precio ? `${rd(c.precio)} (ITBIS incluido)` : ""].filter(Boolean).join(" · ")}
        </div>
        {(info.que || info.aprenderas || info.duracion || info.requisitos || dias.length > 0) && (
          <div className="pb-card ag-info">
            {[
              ["Qué es", info.que],
              ["Aprenderás", info.aprenderas],
              ["Duración", dias.length ? "dias" : info.duracion],
              ["Requisitos", info.requisitos],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <h4>{k}</h4>
                  {v === "dias" ? (
                    <div className="ag-dias">
                      {dias.map((d) => (
                        <div key={d.dia}>
                          <span>{d.dia}</span>
                          <span>{d.texto}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>{v}</p>
                  )}
                </div>
              ))}
          </div>
        )}
        {nitrox && (
          <div className="ag-nx">
            <span className="ag-nx-et">Hazlo con Nitrox</span>
            <b className="ag-nx-t">Agrégale Nitrox a tu Open Water</b>
            <p>Nitrox es aire enriquecido: lleva más oxígeno y menos nitrógeno que el aire normal.</p>
            <ul>
              {NITROX_BENEFICIOS.map(([t, x]) => (
                <li key={t}>
                  <IconCheck size={16} />
                  <span>
                    <b>{t}</b> {x}
                  </span>
                </li>
              ))}
            </ul>
            <div className="ag-nx-fila">
              {nitrox.precio ? <span className="ag-nx-precio">+{rd(nitrox.precio)}</span> : <span />}
              <button className="ag-nx-btn" onClick={() => (setAbierto(nitrox.id), window.scrollTo(0, 0))}>
                Ver el curso de Nitrox
              </button>
            </div>
            <small>Al inscribirte en Open Water, marca "Agregar Nitrox".</small>
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
      {mensaje ? (
        <div className="pb-h" style={{ margin: "0 0 10px" }}>
          {mensaje}
        </div>
      ) : null}
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
// V96 (app Gus Dive, "Mi curso"): el estudiante toca su curso en Mi cuenta y
// ve su progreso. V97 ("15. C", maqueta V96): sus pasos como línea de tiempo,
// día por día, con la próxima clase marcada; arriba lo que le falta hacer a
// él y abajo sus pagos.
const LINEA_MI_CURSO = [
  ["antes", ["record", "identificacion", "foto"]],
  ["dia", ["teoria1", "teoria2", "teoria3", "examen"]],
  ["agua", ["equipos"]],
  ["dia", ["piscina", "caleta1", "caleta2", "caletaNocturna"]],
  ["fin", ["gorra"]],
];
const ETIQUETA_LINEA = { antes: "Antes del curso", agua: "Antes de entrar al agua", fin: "Al terminar el curso" };
const sinTildes = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const linkWa = (num, texto) => (num ? `https://wa.me/${soloDigitos(num).length === 10 ? "1" : ""}${soloDigitos(num)}?text=${encodeURIComponent(texto)}` : "");
function textoEtapa(e) {
  const escuela = e.escuela || "la escuela";
  if (e.estado === "almacen") return "Terminaste el curso. Estamos procesando tu certificación.";
  if (e.estado === "certificacion") return "Tu certificación ya está lista.";
  if (e.estado === "entregada" || e.estado === "avisado") return `Tu certificación está lista. ${escuela} te mandó un correo con tus datos para entrar a su app.`;
  return "";
}
function MiCurso({ e, falta, whatsapp, alVolver }) {
  const hoy = hoyISO();
  const enCurso = e.estado === "curso";
  const pasos = [...(e.pasos || [])];
  if (e.examen) pasos.push({ k: "examen", t: "Examen", v: e.examen.v === "aprobado" ? "listo" : ["na", "pendiente"].includes(e.examen.v) ? e.examen.v : "otro", nota: e.examen.t });
  // Cada paso con su día (del itinerario del curso, por el nombre del paso).
  const linea = LINEA_MI_CURSO.flatMap(([tipo, ks]) =>
    ks
      .map((k) => pasos.find((p) => p.k === k))
      .filter((p) => p && p.v !== "na")
      .map((p) => {
        // V100 (maqueta V102): con la hora del itinerario del curso; el examen lo cuadra con el instructor.
        const d = tipo === "dia" ? (e.dias || []).find((x) => sinTildes(x.texto) === sinTildes(p.t)) : null;
        return { ...p, tipo, fecha: d?.fecha || "", hora: d?.hora || "", cuadrar: !!d?.cuadrar };
      })
  );
  // V101 (maqueta V105, "76. B"): si agregó Nitrox, su teoría va después del
  // examen (por cuadrar con el instructor), con la etiqueta "Nitrox".
  if (e.nitrox) {
    const i = linea.map((p) => p.k).lastIndexOf("examen");
    const j = i >= 0 ? i : linea.map((p) => p.tipo).lastIndexOf("dia");
    linea.splice(j >= 0 ? j + 1 : linea.length, 0, { k: "teoriaNitrox", t: "Teoría Nitrox", tipo: "dia", v: e.nitrox.v === "listo" ? "listo" : "pendiente", fecha: "", hora: "", cuadrar: true, nitrox: true });
  }
  const proxima = enCurso ? linea.find((p) => p.v !== "listo" && p.fecha && p.fecha >= hoy) : null;
  const diaDe = (f) => (f === hoy ? "Hoy" : `${DIA_LARGO[fechaObj(f).getDay()]} ${fechaCorta(f)}`);
  const pend = [];
  if (e.debe > 0) pend.push({ k: "pago", t: `Debe ${rd(e.debe)}`, sub: "Escríbenos y te decimos cómo pagar.", href: linkWa(whatsapp, `Hola, quiero pagar mi curso de ${e.curso}.`), boton: "Escribir", fuera: true });
  if (e.estado !== "espera" && falta?.foto) pend.push({ k: "foto", t: "Falta tu foto", sub: "Para tu certificación.", href: "/estudiante?mis=1", boton: "Subir foto" });
  if (e.estado !== "espera" && falta?.cedula) pend.push({ k: "cedula", t: "Falta tu cédula", sub: "Una foto donde se lea bien.", href: "/estudiante?mis=1", boton: "Subir cédula" });
  const etapa = textoEtapa(e);
  return (
    <>
      <button className="ag-volver" onClick={alVolver}>
        <IconArrowLeft size={16} /> Mis cursos
      </button>
      <div className="pb-card ag-mc-cab">
        <b className="ag-mc-titulo">{e.curso}</b>
        <div className="pb-h" style={{ margin: "2px 0 0" }}>
          {e.con
            ? `Con tu ${e.con.curso}${e.con.inicio ? ` del ${DIA_LARGO[fechaObj(e.con.inicio).getDay()]} ${fechaCorta(e.con.inicio)}` : ""} · la teoría la cuadras con tu instructor`
            : e.fechaInicio
              ? `${e.fechaInicio > hoy ? "Empieza" : "Empezó"} el ${DIA_LARGO[fechaObj(e.fechaInicio).getDay()]} ${fechaCorta(e.fechaInicio)}`
              : e.etapa}
        </div>
        {e.instructor && <div className="pb-h" style={{ margin: "2px 0 0" }}>Instructor: {e.instructor}</div>}
        {e.avance?.total > 0 && (
          <>
            <div className="ag-barra ag-mc-barra">
              <i style={{ width: `${e.avance.pct}%` }} />
            </div>
            <div className="ag-mc-avance">
              <b>
                {e.avance.hechos} de {e.avance.total} pasos
              </b>
              <span>{e.avance.pct}%</span>
            </div>
          </>
        )}
        {etapa && <div className="ag-mc-etapa">{etapa}</div>}
      </div>

      {pend.length > 0 && (
        <>
          <div className="ag-sec">Te falta</div>
          {pend.map((x) => (
            <div key={x.k} className="ag-mc-pend">
              <span>
                <b>{x.t}</b>
                <small>{x.sub}</small>
              </span>
              {x.href && (
                <a className="ag-mc-pend-btn" href={x.href} {...(x.fuera ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {x.boton}
                </a>
              )}
            </div>
          ))}
        </>
      )}

      {linea.length > 0 && (
        <>
          <div className="ag-sec">Tu curso, día por día</div>
          <div className="pb-card ag-tl">
            {linea.map((p) => {
              const esProx = proxima && proxima.k === p.k;
              const cuando = p.fecha ? `${diaDe(p.fecha)}${p.hora ? ` · ${horaBonita(p.hora)}` : ""}` : p.cuadrar ? "Lo cuadras con tu instructor" : ETIQUETA_LINEA[p.tipo] || "";
              return (
                <div key={p.k} className={`ag-tl-p ${p.v}${esProx ? " prox" : ""}`}>
                  <i>{p.v === "listo" && <IconCheck size={12} />}</i>
                  <b>
                    {p.t}
                    {esProx && <span className="ag-tl-tag">Próxima clase</span>}
                    {p.nitrox && <span className="ag-tl-tag nx">Nitrox</span>}
                  </b>
                  <small>
                    {[cuando, p.v === "listo" ? "Listo" : p.v === "otro" ? p.nota : ""].filter(Boolean).join(" · ")}
                  </small>
                  {esProx && !p.hora && <small>La tienda te confirma la hora.</small>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {e.precio != null && e.estado !== "espera" && (
        <>
          <div className="ag-sec">Pagos</div>
          <div className="pb-card ag-pagos" style={{ marginTop: 0, borderTop: 0 }}>
            <div className="ag-pagos-t">
              Curso {rd(e.precio)} · pagado {rd(e.pagado || 0)}
            </div>
            {(e.pagos || []).map((x, i) => (
              <div key={i} className="ag-pago">
                <span>{[x.fecha ? fechaCorta(x.fecha) : "", x.forma].filter(Boolean).join(" · ")}</span>
                <b>{rd(x.monto)}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function AppGus({ cursos, catalogo = [], buceos, alquiler = [], whatsapp = "", mensaje = "" }) {
  const [tab, setTabEstado] = useState("inicio");
  const [listo, setListo] = useState(false); // ya leyó lo guardado en el celular
  const [persona, setPersona] = useState(null);
  const [yo, setYo] = useState(null); // { primer, cursos, buceos, perfil }
  const [sub, setSubEstado] = useState("cursos");
  // V96: el curso abierto en Mi cuenta › Mis cursos ("Mi curso").
  const [miCurso, setMiCurso] = useState(null);
  const setSub = (k) => {
    setSubEstado(k);
    setMiCurso(null);
  };
  const [tipoDoc, setTipoDoc] = useState("cedula");
  const [doc, setDoc] = useState("");
  const [cel, setCel] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  // V97 ("16. C", maqueta V96): entrar con la cédula O con el celular, más un
  // código que le llega a su correo. paso: "pedir" | "codigo" | "dos" (como
  // antes, con las dos cosas: si no tenemos su correo o si él lo prefiere).
  const [porCel, setPorCel] = useState(false);
  const [paso, setPaso] = useState("pedir");
  const [codigo, setCodigo] = useState("");
  const [envio, setEnvio] = useState(null); // { id, correo }
  const [aviso, setAviso] = useState("");
  const [verPrecios, setVerPrecios] = useState(false);
  // V86 (maqueta V86): la foto de la tarjeta de Mi cuenta y la ventana para
  // ver su foto, su cédula o su firma en grande.
  const [fotoMala, setFotoMala] = useState(false);
  const fotoPedida = useRef(false);
  const [visor, setVisor] = useState(null); // { titulo, url, pdf, cargando, error, mala }
  const avisos = useAvisos();
  const router = useRouter();
  const ultimaVez = useRef(Date.now());

  // V85 (nota del 15-nov: "creé un curso y me llegó la notificación... pero
  // cuando entro al app y voy al curso, me aparece como que todavía no se ha
  // creado curso") -- el app instalada se queda abierta por detrás y, al
  // volver a ella, enseñaba los cursos y buceos de cuando se abrió. Ahora,
  // cada vez que vuelve a estar a la vista (o se regresa a ella con "atrás"),
  // pide los datos otra vez.
  useEffect(() => {
    const refrescar = (forzar) => {
      if (document.visibilityState !== "visible") return;
      if (!forzar && Date.now() - ultimaVez.current < 10000) return;
      ultimaVez.current = Date.now();
      router.refresh();
    };
    const alVer = () => refrescar(false);
    const alVolver = (e) => e.persisted && refrescar(true);
    document.addEventListener("visibilitychange", alVer);
    window.addEventListener("focus", alVer);
    window.addEventListener("pageshow", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVer);
      window.removeEventListener("focus", alVer);
      window.removeEventListener("pageshow", alVolver);
    };
  }, [router]);

  // La pestaña queda en la dirección (#cursos), así "atrás" vuelve a ella.
  function setTab(t) {
    setTabEstado(t);
    try {
      history.replaceState(null, "", t === "inicio" ? location.pathname + location.search : `#${t}`);
    } catch {}
    window.scrollTo(0, 0);
    // V85: al cambiar de pestaña, datos frescos (si ya pasó un rato).
    if (Date.now() - ultimaVez.current > 10000) {
      ultimaVez.current = Date.now();
      router.refresh();
    }
  }

  async function cargar(p, nuevo) {
    setCargando(true);
    setError("");
    try {
      const [b, e] = await Promise.all([
        post("/api/app-gus", { ...p, instalada: enApp(), avisos: leerMarca() }),
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

  // V86: el permiso de su foto dura una hora. Si el app se quedó abierta más
  // que eso y la foto ya no carga, se pide otro (una sola vez); si tampoco
  // carga (un formato que este celular no enseña), queda el dibujo.
  async function fotoFallo() {
    if (fotoPedida.current || !persona) return setFotoMala(true);
    fotoPedida.current = true;
    try {
      const r = await post("/api/app-gus/archivo", { tipoDoc: persona.tipoDoc, doc: persona.doc, cel: persona.cel, que: "foto" });
      setYo((y) => (y ? { ...y, perfil: { ...y.perfil, fotoUrl: r.url } } : y));
    } catch {
      setFotoMala(true);
    }
  }
  // Su cédula y su firma se piden al tocar "Ver" (permiso de dos minutos).
  async function verArchivo(que, titulo) {
    if (!persona) return;
    if (que === "foto" && yo?.perfil?.fotoUrl && !fotoMala) return setVisor({ titulo, url: yo.perfil.fotoUrl });
    setVisor({ titulo, cargando: true });
    try {
      const r = await post("/api/app-gus/archivo", { tipoDoc: persona.tipoDoc, doc: persona.doc, cel: persona.cel, que });
      setVisor({ titulo, url: r.url, pdf: !!r.pdf });
    } catch (e) {
      setVisor({ titulo, error: e.message });
    }
  }

  async function pedirCodigo() {
    setCargando(true);
    setError("");
    try {
      const r = await post("/api/app-gus/codigo", porCel ? { accion: "pedir", por: "celular", cel } : { accion: "pedir", tipoDoc, doc });
      if (r.sinCorreo || r.sinTabla) {
        setAviso(r.sinCorreo ? "No tenemos tu correo guardado. Entra con tu cédula y tu celular." : "Por ahora entra con tu cédula y tu celular.");
        setPaso("dos");
      } else {
        setEnvio({ id: r.id, correo: r.correo });
        setCodigo("");
        setPaso("codigo");
      }
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  }
  async function entrarConCodigo() {
    setCargando(true);
    setError("");
    let r = null;
    try {
      r = await post("/api/app-gus/codigo", { accion: "verificar", id: envio?.id, codigo });
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
    if (r) await cargar({ tipoDoc: r.tipoDoc, doc: r.doc, cel: r.cel }, true);
  }
  function irAPaso(p) {
    setError("");
    setAviso("");
    setPaso(p);
  }

  function salir() {
    olvidarPersona();
    setPersona(null);
    setYo(null);
    setVisor(null);
    setFotoMala(false);
    fotoPedida.current = false;
    setDoc("");
    setCel("");
    setSub("cursos");
    setPaso("pedir");
    setCodigo("");
    setEnvio(null);
    setAviso("");
  }
  const docListo = tipoDoc === "cedula" ? soloDigitos(doc).length === 11 : doc.replace(/[\s-]/g, "").length >= 6;
  const nombre = yo?.primer || persona?.primer || "";
  const fotoBuena = !!yo?.perfil?.fotoUrl && !fotoMala;
  const certTexto = [yo?.perfil?.nivel, yo?.perfil?.agencia].filter(Boolean).join(" · ");
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
        {tab === "cursos" && <Cursos catalogo={catalogo} cursos={cursos} mensaje={mensaje} />}

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
            {/* V86 (maqueta V86, "1. sí... con el amarillo de SNSI"): su foto,
                su nombre y su certificación. Tocar la foto la abre en grande. */}
            <div className="ag-carnet">
              <button className="ag-carnet-foto" disabled={!fotoBuena} onClick={() => verArchivo("foto", "Tu foto")} aria-label="Ver mi foto">
                {fotoBuena ? <img src={yo.perfil.fotoUrl} alt="" onError={fotoFallo} /> : <IconUser size={40} />}
              </button>
              <div className="ag-carnet-tx">
                <b>{yo?.perfil?.nombre || nombre || "Mi cuenta"}</b>
                {certTexto && <small>{certTexto}</small>}
                {yo?.perfil?.cert && <small>No. {yo.perfil.cert}</small>}
              </div>
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
            {yo && sub === "cursos" && miCurso && yo.estudios.some((e) => e.id === miCurso) && (
              <MiCurso
                e={yo.estudios.find((e) => e.id === miCurso)}
                falta={yo.falta}
                whatsapp={whatsapp}
                alVolver={() => {
                  setMiCurso(null);
                  window.scrollTo(0, 0);
                }}
              />
            )}
            {yo && sub === "cursos" && !(miCurso && yo.estudios.some((e) => e.id === miCurso)) && (
              <>
                {yo.estudios.map((e) => (
                  <div
                    key={e.id}
                    className={`pb-card ag-curso${e.estado !== "espera" ? " ag-curso-toca" : ""}`}
                    {...(e.estado !== "espera"
                      ? {
                          role: "button",
                          tabIndex: 0,
                          onClick: () => {
                            setMiCurso(e.id);
                            window.scrollTo(0, 0);
                          },
                          onKeyDown: (ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              setMiCurso(e.id);
                            }
                          },
                        }
                      : {})}
                  >
                    <b>{e.curso}</b>
                    <div className="pb-h" style={{ margin: "2px 0 0" }}>
                      {/* V101 (maqueta V105): el Nitrox con el Open Water va en esa misma semana. */}
                      {e.con ? `Con tu ${e.con.curso}${e.con.inicio ? ` del ${DIA_LARGO[fechaObj(e.con.inicio).getDay()]} ${fechaCorta(e.con.inicio)}` : ""}` : e.fechaInicio ? `${e.fechaInicio > hoyISO() ? "Empieza" : "Empezó"} el ${DIA_LARGO[fechaObj(e.fechaInicio).getDay()]} ${fechaCorta(e.fechaInicio)}` : e.etapa}
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
                      {e.estado === "espera" && <span className="ag-chip gris">Sin fecha todavía</span>}
                    </div>
                    {/* V86 ("3. sí"): sus pagos, uno por uno. V96: ahora dentro de "Mi curso". */}
                    {e.estado !== "espera" && <div className="ag-curso-ver">Ver mi progreso ›</div>}
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
              <>
                <div className="ag-sec">Mis datos</div>
                <div className="pb-card" style={{ marginTop: 0 }}>
                  {[
                    ["Celular", yo.perfil.cel],
                    ["Correo", yo.perfil.correo || "—"],
                    ["Dirección", yo.perfil.direccion || "—"],
                    ["Emergencia", yo.perfil.emergencia || "—"],
                    // V93 (maqueta v93, aprobada): tallas y peso para reservar el equipo.
                    ["Calzado", yo.perfil.tallas?.calzado ? textoCalzado(yo.perfil.tallas.calzado) : "Sin llenar"],
                    ["Camisa", yo.perfil.tallas?.camisa || "Sin llenar"],
                    ["Peso", yo.perfil.tallas?.peso_lbs ? `${yo.perfil.tallas.peso_lbs} lbs` : "Sin llenar"],
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
                {/* V86 (maqueta V86, "2. B"): su foto, su cédula (también la
                    puede ver) y su firma. Se cambian donde siempre: Mis
                    documentos del link de cursos. */}
                <div className="ag-sec">Mis documentos</div>
                <div className="pb-card" style={{ marginTop: 0 }}>
                  <div className="ag-doc">
                    <span className="ag-doc-mini redonda">{fotoBuena ? <img src={yo.perfil.fotoUrl} alt="" onError={fotoFallo} /> : <IconUser size={24} />}</span>
                    <span className="ag-doc-tx">
                      <b>Mi foto</b>
                      <span className={`ag-chip${yo.perfil.foto ? "" : " rojo"}`}>{yo.perfil.foto ? "Subida" : "Falta"}</span>
                    </span>
                    {yo.perfil.foto && (
                      <button className="ag-doc-lk" onClick={() => verArchivo("foto", "Tu foto")}>
                        Ver
                      </button>
                    )}
                    <a className="ag-doc-lk" href="/estudiante?mis=1">
                      {yo.perfil.foto ? "Cambiar" : "Subir"}
                    </a>
                  </div>
                  <div className="ag-doc">
                    <span className="ag-doc-mini ced" />
                    <span className="ag-doc-tx">
                      <b>{persona.tipoDoc === "pasaporte" ? "Mi documento" : "Mi cédula"}</b>
                      <span className={`ag-chip${yo.perfil.cedula ? "" : " rojo"}`}>{yo.perfil.cedula ? "Subida" : "Falta"}</span>
                    </span>
                    {yo.perfil.cedula && (
                      <button className="ag-doc-lk" onClick={() => verArchivo("cedula", persona.tipoDoc === "pasaporte" ? "Tu documento" : "Tu cédula")}>
                        Ver
                      </button>
                    )}
                    <a className="ag-doc-lk" href="/estudiante?mis=1">
                      {yo.perfil.cedula ? "Cambiar" : "Subir"}
                    </a>
                  </div>
                  {yo.estudios.some((e) => e.firma?.hay) && (
                    <div className="ag-doc">
                      <span className="ag-doc-mini firma" />
                      <span className="ag-doc-tx">
                        <b>Mi firma</b>
                        <span className="ag-chip">Guardada</span>
                      </span>
                      <button className="ag-doc-lk" onClick={() => verArchivo("firma", "Tu firma")}>
                        Ver
                      </button>
                      <a className="ag-doc-lk" href="/estudiante?mis=1">
                        Cambiar
                      </a>
                    </div>
                  )}
                </div>
              </>
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
              {paso === "codigo" ? (
                <>
                  <div className="pb-h" style={{ marginTop: 0 }}>
                    Te mandamos un código de 6 números a <b>{envio?.correo}</b>. Escríbelo aquí.
                  </div>
                  <input
                    className="pb-input ag-codigo"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(soloDigitos(e.target.value).slice(0, 6))}
                    placeholder="000000"
                  />
                  {error && <div className="pb-error">{error}</div>}
                  <button className="pb-btn" disabled={cargando || codigo.length !== 6} onClick={entrarConCodigo}>
                    {cargando ? "Un momento…" : "Entrar"}
                  </button>
                  <div className="pb-h">¿No te llegó? Revisa el correo no deseado.</div>
                  <div className="ag-login-links">
                    <button disabled={cargando} onClick={pedirCodigo}>
                      Mandarme otro código
                    </button>
                    <button onClick={() => irAPaso("dos")}>Entrar con mi cédula y mi celular</button>
                  </div>
                </>
              ) : paso === "dos" ? (
                <>
                  <div className="pb-h" style={{ marginTop: 0 }}>
                    {aviso || "Entra con tu cédula y tu celular."} Lo pones una sola vez: queda guardado en este celular.
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
                    {cargando ? "Un momento…" : "Entrar"}
                  </button>
                  <div className="ag-login-links">
                    <button onClick={() => irAPaso("pedir")}>Entrar con un código a mi correo</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="pb-h" style={{ marginTop: 0 }}>
                    Entra con tu cédula o con tu celular. Te mandamos un código a tu correo para confirmar que eres tú. Queda guardado en este celular.
                  </div>
                  <div className="pb-seg">
                    <button className={!porCel && tipoDoc === "cedula" ? "sel" : ""} onClick={() => (setPorCel(false), setTipoDoc("cedula"), setDoc(""), setError(""))}>
                      Cédula
                    </button>
                    <button className={porCel ? "sel" : ""} onClick={() => (setPorCel(true), setError(""))}>
                      Celular
                    </button>
                    <button className={!porCel && tipoDoc === "pasaporte" ? "sel" : ""} onClick={() => (setPorCel(false), setTipoDoc("pasaporte"), setDoc(""), setError(""))}>
                      Otro documento
                    </button>
                  </div>
                  {porCel ? (
                    <CampoCel className="pb-input" value={cel} onChange={setCel} />
                  ) : (
                    <input
                      className="pb-input"
                      inputMode={tipoDoc === "cedula" ? "numeric" : "text"}
                      value={doc}
                      onChange={(e) => setDoc(tipoDoc === "cedula" ? formatoCedula(e.target.value) : e.target.value.toUpperCase())}
                      placeholder={tipoDoc === "cedula" ? "000-0000000-0" : "Pasaporte"}
                      autoComplete="off"
                    />
                  )}
                  {error && <div className="pb-error">{error}</div>}
                  <button className="pb-btn" disabled={cargando || (porCel ? !celValido(cel) : !docListo)} onClick={pedirCodigo}>
                    {cargando ? "Un momento…" : "Mandarme el código"}
                  </button>
                  <div className="ag-login-links">
                    <button onClick={() => irAPaso("dos")}>Entrar con mi cédula y mi celular</button>
                  </div>
                </>
              )}
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

      {/* V86: su foto, su cédula o su firma en grande. */}
      {visor && (
        <div className="ag-visor" onClick={() => setVisor(null)}>
          <b>{visor.titulo}</b>
          {visor.cargando && <span>Un momento…</span>}
          {visor.error && <span>{visor.error}</span>}
          {visor.url && !visor.pdf && !visor.mala && <img src={visor.url} alt={visor.titulo} onError={() => setVisor((v) => (v ? { ...v, mala: true } : v))} />}
          {visor.url && (visor.pdf || visor.mala) && (
            <a className="pb-btn" href={visor.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              {visor.pdf ? "Abrir el PDF" : "Abrir el archivo"}
            </a>
          )}
          <button className="ag-visor-x">Cerrar</button>
        </div>
      )}

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
