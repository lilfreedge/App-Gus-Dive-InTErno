"use client";

import { useEffect, useState } from "react";
import { PERMISOS, EVENTOS_AVISO, VIAS_AVISO } from "@/lib/viajes/modelo";
import { IconEdit, IconLink, IconPlus, IconCheck, IconBuzos, IconReceipt, IconLock, IconReport, IconHistory, IconGauge, IconUsers, IconBell } from "@/components/icons";

// V43 -- ⚙ › Administración de Viajes/Buceos (solo el Titular). Pedido de
// Pipe: "ponme en settings sección de administración para controlar los
// accesos de los demás". Igual que la Administración de App Equipos de
// clientes: la gente agrupada (Titular, Administradores, Usuarios, Sin
// acceso); se toca a alguien y se ven sus permisos por sección, que se
// guardan al momento. Los marcados "solo admin." (conciliación, números,
// cerrar viajes, bitácora y estadísticas) solo se le pueden dar a un
// Administrador ("eso me corresponde a mí o a mi hermano").
const SECCIONES = [
  { t: "Viajes", ks: ["editarViaje", "web"] },
  { t: "Buzos e inscritos", ks: ["inscribir", "grupo", "buzos"] },
  { t: "Pagos", ks: ["pagos", "conciliar"] },
  { t: "Números y control", ks: ["numeros", "cerrar", "bitacora", "estadisticas"] },
];
const ICONOS = { editarViaje: IconEdit, web: IconLink, inscribir: IconPlus, grupo: IconCheck, buzos: IconBuzos, pagos: IconReceipt, conciliar: IconLock, numeros: IconReport, cerrar: IconLock, bitacora: IconHistory, estadisticas: IconGauge };
const PERM = Object.fromEntries(PERMISOS.map((x) => [x.k, x]));
const SUELTOS = PERMISOS.filter((x) => x.k !== "ver");

const grupoDe = (pf) => (pf.es_titular ? "titular" : !pf.permisos?.acceso_viajes ? "sin" : pf.is_admin ? "admin" : "usuario");
const GRUPOS = [
  { g: "titular", t: "Titular" },
  { g: "admin", t: "Administradores" },
  { g: "usuario", t: "Usuarios" },
  { g: "sin", t: "Sin acceso a Viajes/Buceos" },
];

// V44 -- Qué avisos le llegan a esta persona y por dónde (migration_72.sql).
// Pedido: "que yo pueda controlarlo, a quién le llega notificaciones y
// cuáles, para cuando se lo vaya a asignar a la tienda".
function AvisosPersona({ pf, conf, info, cambiar, ocupado }) {
  const a = conf || {};
  const n = EVENTOS_AVISO.reduce((t, e) => t + VIAS_AVISO.filter((v) => a[e.k]?.[v.k]).length, 0);
  return (
    <div>
      <div className="vj-adm-sec vj-adm-sec-av">
        <IconBell size={13} /> Avisos {n ? `(${n})` : ""}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="vj-tabla vj-av-tabla vj-adm-av">
          <thead>
            <tr>
              <th>Qué pasa</th>
              {VIAS_AVISO.map((v) => (
                <th key={v.k}>{v.t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENTOS_AVISO.map((e) => (
              <tr key={e.k}>
                <td>
                  {e.t}
                  {e.sub && <span className="hint-text">{e.sub}</span>}
                </td>
                {VIAS_AVISO.map((v) => (
                  <td key={v.k}>
                    <input
                      type="checkbox"
                      aria-label={`${e.t}: ${v.t}`}
                      checked={!!a[e.k]?.[v.k]}
                      disabled={ocupado}
                      onChange={(ev) => cambiar(pf.id, { ...a, [e.k]: { ...(a[e.k] || {}), [v.k]: ev.target.checked } })}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hint-text vj-adm-av-info">
        Correo: <b>{info?.correo || "el que usa para entrar"}</b>
        <br />
        Celular:{" "}
        {info?.celulares ? (
          <b>activado en {info.celulares === 1 ? "1 celular" : `${info.celulares} celulares`}</b>
        ) : (
          <>todavía no lo ha activado (lo hace la persona en su teléfono: ⚙ › Notificaciones)</>
        )}
      </div>
    </div>
  );
}

export function AccesosViajes({ supabase, avisar, yo }) {
  const [perfiles, setPerfiles] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [confs, setConfs] = useState(null); // null = falta migration_72.sql
  const [info, setInfo] = useState({});

  async function cargar() {
    const { data } = await supabase.from("profiles").select("id, full_name, es_titular, is_admin, permisos, eliminado_en").order("full_name");
    setPerfiles((data || []).filter((x) => !x.eliminado_en));
    const { data: c, error } = await supabase.from("viajes_avisos_config").select("user_id, avisos");
    setConfs(error ? null : Object.fromEntries((c || []).map((x) => [x.user_id, x.avisos || {}])));
    fetch("/api/viajes/avisos")
      .then((r) => (r.ok ? r.json() : { personas: {} }))
      .then((j) => setInfo(j.personas || {}))
      .catch(() => {});
  }
  useEffect(() => {
    cargar();
  }, []);

  async function cambiarAvisos(userId, avisos) {
    setGuardando(userId);
    setConfs((c) => ({ ...c, [userId]: avisos }));
    const { error } = await supabase.from("viajes_avisos_config").upsert({ user_id: userId, avisos, actualizado_en: new Date().toISOString() });
    if (error) {
      avisar(`No se pudo guardar: ${error.message}`);
      cargar();
    }
    setGuardando(null);
  }

  async function guardar(perfil, cambios) {
    const permisos = { ...(perfil.permisos || {}), ...cambios };
    setGuardando(perfil.id);
    setPerfiles((ps) => ps.map((x) => (x.id === perfil.id ? { ...x, permisos } : x)));
    const { error } = await supabase.from("profiles").update({ permisos }).eq("id", perfil.id);
    if (error) {
      avisar(`No se pudo guardar: ${error.message}`);
      cargar();
    }
    setGuardando(null);
  }

  if (!perfiles) return <div className="hint-text">Cargando…</div>;
  return (
    <>
      <h1 className="page-title">Administración</h1>
      <div className="hint-text" style={{ marginBottom: 4 }}>
        Toca a una persona para ver y cambiar lo que puede hacer en Viajes/Buceos y qué avisos le llegan (en el app, por correo o en el celular). Los cambios se guardan al momento. Solo tú (el Titular) entras aquí.
      </div>
      {GRUPOS.map(({ g, t }) => {
        const gente = perfiles.filter((pf) => grupoDe(pf) === g);
        if (!gente.length) return null;
        return (
          <div key={g}>
            <div className="section-title">{t}</div>
            <div className="card vj-adm">
              {gente.map((pf) => {
                const titular = g === "titular";
                const admin = !!pf.is_admin;
                const entra = !!pf.permisos?.acceso_viajes;
                const puede = (x) => !x.soloAdmin || admin;
                const cuantos = SUELTOS.filter((x) => puede(x) && pf.permisos?.[x.clave]).length;
                const posibles = SUELTOS.filter(puede).length;
                const esta = abierto === pf.id;
                return (
                  <div key={pf.id} className="vj-adm-persona" style={{ opacity: guardando === pf.id ? 0.6 : 1 }}>
                    <button type="button" className="vj-adm-top" onClick={() => setAbierto(esta ? null : pf.id)} aria-expanded={esta}>
                      <span style={{ minWidth: 0 }}>
                        <b>{pf.full_name}</b>
                        {pf.id === yo?.id && <span className="tag-tu">Tú</span>}
                        <span className="hint-text" style={{ display: "block", margin: 0 }}>
                          {titular ? "Titular" : admin ? "Administrador" : "Usuario"}
                        </span>
                      </span>
                      <span className="vj-adm-resumen">
                        {titular ? "Acceso a todo" : !entra ? "Sin acceso" : cuantos === posibles ? "Todo" : cuantos === 0 ? "Solo ver" : `${cuantos} de ${posibles} permisos`}
                        <span style={{ marginLeft: 6 }}>{esta ? "▴" : "▾"}</span>
                      </span>
                    </button>

                    {esta && titular && (
                      <div className="vj-adm-cuerpo">
                        <div className="hint-text" style={{ marginBottom: 4 }}>
                          El Titular puede todo en Viajes/Buceos. Aquí solo escoges qué avisos te llegan.
                        </div>
                        {confs ? (
                          <AvisosPersona pf={pf} conf={confs[pf.id]} info={info[pf.id]} cambiar={cambiarAvisos} ocupado={guardando === pf.id} />
                        ) : (
                          <div className="aviso-box vj-adm-aviso">Para los avisos falta correr migration_72.sql en Supabase.</div>
                        )}
                      </div>
                    )}
                    {esta && !titular && (
                      <div className="vj-adm-cuerpo">
                        <label className="vj-adm-item fuerte">
                          <span className="vj-adm-label">
                            <IconUsers size={15} />
                            <span>
                              Entrar a Viajes/Buceos
                              <span className="hint-text">Es el mismo acceso de “Accesos a apps”. Con solo esto, puede ver los viajes, los inscritos y el calendario.</span>
                            </span>
                          </span>
                          <input type="checkbox" checked={entra} disabled={guardando === pf.id} onChange={(e) => guardar(pf, { acceso_viajes: e.target.checked })} />
                        </label>
                        {!entra && <div className="aviso-box vj-adm-aviso">Todavía no entra a Viajes/Buceos. Puedes dejarle los permisos listos desde ya.</div>}
                        <div className="vj-adm-atajos">
                          <button type="button" className="btn secondary vj-mini" disabled={guardando === pf.id} onClick={() => guardar(pf, Object.fromEntries(SUELTOS.filter(puede).map((x) => [x.clave, true])))}>
                            Darle todo
                          </button>
                          <button type="button" className="btn secondary vj-mini" disabled={guardando === pf.id} onClick={() => guardar(pf, Object.fromEntries(SUELTOS.map((x) => [x.clave, false])))}>
                            Quitarle todo
                          </button>
                        </div>
                        {SECCIONES.map((s) => (
                          <div key={s.t}>
                            <div className="vj-adm-sec">{s.t}</div>
                            {s.ks.map((k) => {
                              const x = PERM[k];
                              const Icono = ICONOS[k];
                              const bloqueado = !puede(x);
                              return (
                                <label key={k} className={`vj-adm-item${bloqueado ? " bloqueado" : ""}`}>
                                  <span className="vj-adm-label">
                                    <Icono size={15} />
                                    <span>
                                      {x.t}
                                      {bloqueado && (
                                        <span className="hint-text vj-adm-candado">
                                          <IconLock size={12} /> Solo se le puede dar a un Administrador
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                  <input type="checkbox" checked={!bloqueado && !!pf.permisos?.[x.clave]} disabled={bloqueado || guardando === pf.id} onChange={(e) => guardar(pf, { [x.clave]: e.target.checked })} />
                                </label>
                              );
                            })}
                          </div>
                        ))}
                        {!admin && (
                          <div className="hint-text" style={{ marginTop: 10 }}>
                            Para hacerlo Administrador: Administración de App Interno (vale para todas las apps).
                          </div>
                        )}
                        {confs ? (
                          <AvisosPersona pf={pf} conf={confs[pf.id]} info={info[pf.id]} cambiar={cambiarAvisos} ocupado={guardando === pf.id} />
                        ) : (
                          <div className="aviso-box vj-adm-aviso">Para los avisos falta correr migration_72.sql en Supabase.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
