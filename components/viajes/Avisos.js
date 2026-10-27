"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EVENTOS_AVISO, VIAS_AVISO } from "@/lib/viajes/modelo";
import { IconBell, IconCheck, IconX, IconPhone } from "@/components/icons";

// V44 -- Avisos de Viajes (migration_72.sql). Pedido de Pipe: "que aparezca
// una notificación cuando se inscriba una persona en un viaje y así ya uno
// sabe" ... "que puedan ser las diferentes vías, y que yo pueda controlarlo".
//   - La campanita arriba (con cuántos hay sin leer) y la lista.
//   - Si el app está abierto, el aviso sale al momento (Realtime) y la
//     lista de inscritos se refresca sola.
//   - ⚙ › Notificaciones: lo que le llega a cada quien y activar el
//     celular (lo tiene que hacer la persona en su teléfono).

const hace = (iso) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
};
// "/viajes-buceos/viaje/<id>" -> ruta del app ("viaje:<id>")
const rutaDe = (url) => {
  const m = /\/viaje\/([^/?#]+)/.exec(url || "");
  return m ? `viaje:${m[1]}` : "inicio";
};

export function useAvisos(supabase, yo, recargar) {
  const [avisos, setAvisos] = useState([]);
  const [nuevo, setNuevo] = useState(null);
  const [hay, setHay] = useState(true); // false si falta migration_72.sql
  const recargarRef = useRef(recargar);
  recargarRef.current = recargar;

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from("viajes_notificaciones").select("*").eq("user_id", yo.id).order("creado_en", { ascending: false }).limit(30);
    if (error) return setHay(false);
    setHay(true);
    setAvisos(data || []);
  }, [supabase, yo.id]);

  useEffect(() => {
    cargar();
    if (!supabase.channel) return;
    const canal = supabase
      .channel(`avisos-viajes-${yo.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "viajes_notificaciones", filter: `user_id=eq.${yo.id}` }, (pl) => {
        const a = pl.new;
        setAvisos((xs) => (xs.some((x) => x.id === a.id) ? xs : [a, ...xs].slice(0, 30)));
        setNuevo(a);
        recargarRef.current?.();
      })
      .subscribe();
    // Al volver a la pestaña, por si llegó algo mientras estaba cerrada.
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      supabase.removeChannel?.(canal);
    };
  }, [supabase, yo.id, cargar]);

  useEffect(() => {
    if (!nuevo) return;
    const t = setTimeout(() => setNuevo(null), 9000);
    return () => clearTimeout(t);
  }, [nuevo]);

  const marcarLeidos = useCallback(async () => {
    const ids = avisos.filter((a) => !a.leida).map((a) => a.id);
    if (!ids.length) return;
    setAvisos((xs) => xs.map((a) => ({ ...a, leida: true })));
    await supabase.from("viajes_notificaciones").update({ leida: true }).in("id", ids);
  }, [avisos, supabase]);

  const leer = useCallback(
    async (a) => {
      if (a.leida) return;
      setAvisos((xs) => xs.map((x) => (x.id === a.id ? { ...x, leida: true } : x)));
      await supabase.from("viajes_notificaciones").update({ leida: true }).eq("id", a.id);
    },
    [supabase]
  );

  return { hay, avisos, noLeidos: avisos.filter((a) => !a.leida).length, nuevo, cerrarNuevo: () => setNuevo(null), marcarLeidos, leer, cargar };
}

export function ListaAvisos({ avisos, leer, ir, alIr, vacio = "No tienes avisos todavía." }) {
  if (!avisos.length) return <div className="vj-av-vacio">{vacio}</div>;
  return avisos.map((a) => (
    <button
      key={a.id}
      type="button"
      className={`vj-av-item${a.leida ? "" : " nuevo"}`}
      onClick={() => {
        leer(a);
        alIr?.();
        ir(rutaDe(a.url));
      }}
    >
      <span className="vj-av-punto" />
      <span style={{ minWidth: 0 }}>
        <b>{a.titulo}</b>
        {a.texto && <span className="vj-av-texto">{a.texto}</span>}
        <span className="vj-av-hace">{hace(a.creado_en)}</span>
      </span>
    </button>
  ));
}

// La campanita de arriba, al lado del ⚙.
export function CampanaAvisos({ av, ir }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const f = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
  if (!av.hay) return null;
  return (
    <div className="gear-wrap" ref={ref}>
      <button className="gear-btn vj-campana" onClick={() => setOpen((o) => !o)} aria-label={`Avisos${av.noLeidos ? ` (${av.noLeidos} sin leer)` : ""}`}>
        <IconBell size={18} />
        {av.noLeidos > 0 && <span className="vj-campana-n">{av.noLeidos > 9 ? "9+" : av.noLeidos}</span>}
      </button>
      {open && (
        <div className="settings-menu vj-av-menu">
          <div className="vj-av-head">
            <b>Avisos</b>
            {av.noLeidos > 0 && (
              <button type="button" className="vj-av-link" onClick={av.marcarLeidos}>
                Marcar todo leído
              </button>
            )}
          </div>
          <div className="vj-av-lista">
            <ListaAvisos avisos={av.avisos.slice(0, 12)} leer={av.leer} ir={ir} alIr={() => setOpen(false)} />
          </div>
          <button type="button" className="vj-av-pie" onClick={() => (setOpen(false), ir("notificaciones"))}>
            Ver todo y configurar
          </button>
        </div>
      )}
    </div>
  );
}

// El aviso que sale al momento si el app está abierto.
export function ToastAviso({ aviso, cerrar, ir, leer }) {
  if (!aviso) return null;
  return (
    <div className="vj-av-toast" role="status">
      <IconBell size={18} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <b>{aviso.titulo}</b>
        {aviso.texto && <div>{aviso.texto}</div>}
      </div>
      <button
        type="button"
        className="vj-av-ver"
        onClick={() => {
          leer(aviso);
          cerrar();
          ir(rutaDe(aviso.url));
        }}
      >
        Ver
      </button>
      <button type="button" className="vj-av-x" onClick={cerrar} aria-label="Cerrar">
        <IconX size={15} />
      </button>
    </div>
  );
}

// ------------------------------------------------------------ celular
const b64 = (s) => {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};
function dispositivo() {
  const ua = navigator.userAgent || "";
  const que = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Otro";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) && !/Edg\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [que, nav].filter(Boolean).join(" · ");
}
function estadoCelular() {
  if (typeof window === "undefined") return { soporta: false };
  const ios = /iPhone|iPad/.test(navigator.userAgent || "");
  const instalada = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  const soporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return { ios, instalada, soporta, permiso: soporta ? Notification.permission : "default" };
}

export function CelularAvisos({ avisar }) {
  const [est, setEst] = useState(() => estadoCelular());
  const [activo, setActivo] = useState(null); // null = viendo
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const e = estadoCelular();
    setEst(e);
    if (!e.soporta) return setActivo(false);
    navigator.serviceWorker
      .getRegistration("/")
      .then((r) => (r ? r.pushManager.getSubscription() : null))
      .then((s) => setActivo(!!s))
      .catch(() => setActivo(false));
  }, []);

  async function activar() {
    setOcupado(true);
    try {
      // Primero el permiso (en iPhone tiene que ser al tocar el botón).
      const permiso = await Notification.requestPermission();
      setEst(estadoCelular());
      if (permiso !== "granted") throw new Error("No diste permiso para las notificaciones.");
      const reg = await navigator.serviceWorker.register("/sw-viajes.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const r = await fetch("/api/viajes/push");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo activar.");
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(j.publica) }));
      const g = await fetch("/api/viajes/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suscripcion: sub.toJSON(), dispositivo: dispositivo() }) });
      if (!g.ok) throw new Error((await g.json().catch(() => ({}))).error || "No se pudo guardar.");
      setActivo(true);
      avisar("Listo: las notificaciones quedaron activadas en este celular");
    } catch (e) {
      avisar(e.message || "No se pudo activar.");
    }
    setOcupado(false);
  }
  async function desactivar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg && (await reg.pushManager.getSubscription());
      if (sub) {
        await fetch("/api/viajes/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setActivo(false);
      avisar("Notificaciones apagadas en este celular");
    } catch (e) {
      avisar(e.message || "No se pudo.");
    }
    setOcupado(false);
  }
  async function probar() {
    setOcupado(true);
    const r = await fetch("/api/viajes/push/probar", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    avisar(r.ok ? "Te mandamos una de prueba: debe salirte ahora" : j.error || "No se pudo mandar.");
    setOcupado(false);
  }

  return (
    <div className="card vj-av-cel">
      <div className="vj-av-cel-t">
        <IconPhone size={18} /> Notificaciones en este celular
      </div>
      {!est.soporta && est.ios && !est.instalada ? (
        <div className="hint-text vj-av-pasos">
          En iPhone primero hay que agregar el app a la pantalla de inicio:
          <ol>
            <li>Abre el app en <b>Safari</b>.</li>
            <li>
              Toca <b>Compartir</b> (el cuadrito con la flecha) › <b>Agregar a pantalla de inicio</b>.
            </li>
            <li>Entra desde ese ícono nuevo (te pide el correo y la clave una vez) y vuelve aquí: ⚙ › Notificaciones.</li>
          </ol>
        </div>
      ) : !est.soporta ? (
        <div className="hint-text">Este navegador no acepta notificaciones. Prueba con Chrome o Safari actualizado.</div>
      ) : est.permiso === "denied" ? (
        <div className="hint-text">
          Este navegador tiene las notificaciones <b>bloqueadas</b> para el app. Actívalas en los ajustes del navegador (o del celular) y vuelve a intentar.
        </div>
      ) : activo ? (
        <>
          <div className="vj-av-ok">
            <IconCheck size={16} /> Activadas en este celular ({dispositivo()}).
          </div>
          <div className="vj-av-btns">
            <button className="btn secondary vj-btn" disabled={ocupado} onClick={probar}>
              Mandarme una de prueba
            </button>
            <button className="btn secondary vj-btn" disabled={ocupado} onClick={desactivar}>
              Apagar en este celular
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="hint-text" style={{ marginBottom: 8 }}>
            Para que te suene en el teléfono aunque no tengas el app abierto. Hazlo en cada celular o computadora donde quieras recibirlas.
          </div>
          <button className="btn btn-primary vj-btn" disabled={ocupado || activo === null} onClick={activar}>
            {ocupado ? "Activando…" : "Activar en este celular"}
          </button>
        </>
      )}
    </div>
  );
}

// ⚙ › Notificaciones (para todos).
export function MisNotificaciones({ supabase, yo, ir, avisar, av }) {
  const [mio, setMio] = useState(undefined);
  useEffect(() => {
    supabase
      .from("viajes_avisos_config")
      .select("avisos")
      .eq("user_id", yo.id)
      .maybeSingle()
      .then(({ data }) => setMio(data?.avisos || {}));
  }, [supabase, yo.id]);
  const algo = mio && EVENTOS_AVISO.some((e) => VIAS_AVISO.some((v) => mio[e.k]?.[v.k]));
  return (
    <>
      <h1 className="page-title">Notificaciones</h1>
      <div className="card">
        <div className="vj-av-cel-t">Lo que te llega</div>
        {mio === undefined ? (
          <div className="hint-text">Cargando…</div>
        ) : !algo ? (
          <div className="hint-text">Todavía no tienes avisos activados. {yo.esTitular ? "Actívalos en ⚙ › Administración." : "Te los activa el Titular."}</div>
        ) : (
          <table className="vj-tabla vj-av-tabla">
            <thead>
              <tr>
                <th>Aviso</th>
                {VIAS_AVISO.map((v) => (
                  <th key={v.k}>{v.t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENTOS_AVISO.map((e) => (
                <tr key={e.k}>
                  <td>{e.t}</td>
                  {VIAS_AVISO.map((v) => (
                    <td key={v.k} className={mio[e.k]?.[v.k] ? "si" : "propio"}>
                      {mio[e.k]?.[v.k] ? <IconCheck size={15} /> : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {yo.esTitular && (
          <button type="button" className="vj-av-link" style={{ marginTop: 8 }} onClick={() => ir("administracion")}>
            Cambiar quién recibe qué (Administración)
          </button>
        )}
      </div>
      <CelularAvisos avisar={avisar} />
      <div className="card">
        <div className="vj-av-head" style={{ padding: 0, marginBottom: 6 }}>
          <b>Avisos recientes</b>
          {av.noLeidos > 0 && (
            <button type="button" className="vj-av-link" onClick={av.marcarLeidos}>
              Marcar todo leído
            </button>
          )}
        </div>
        <div className="vj-av-lista grande">
          <ListaAvisos avisos={av.avisos} leer={av.leer} ir={ir} />
        </div>
      </div>
    </>
  );
}
