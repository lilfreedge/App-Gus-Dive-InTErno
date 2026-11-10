"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PERMISOS_EST, valorPermisoEst } from "@/lib/estudiantes/modelo";
import { IconUsers, IconEdit, IconPlus, IconReceipt, IconLock, IconCheck, IconPhone, IconCatalog, IconChat, IconEye, IconX, IconTrash, IconHistory, IconGauge } from "@/components/icons";

// ⚙ › Administración de Control Estudiantes (solo el Titular).
// V55: organizada como la de Buceos ("aquí administración, pónmelo más
// organizado, así como lo tenemos en los otros apps"): la gente agrupada
// (Titular, Administradores, Usuarios, Sin acceso); se toca a alguien y se
// ven sus permisos por sección, que se guardan al momento. El Titular y los
// administradores pueden todo.
// V67 ("3. sí. Pero ponme en administración esos permisos en orden y
// organizado, así como lo tenemos en otros apps"): por sección, como en
// Buceos, con los seis nuevos en su lugar.
const SECCIONES = [
  { t: "Estudiantes", ks: ["est_estudiantes", "est_documentos", "est_cancelar", "est_borrar"] },
  { t: "Interesados", ks: ["est_interesados"] },
  { t: "Pagos", ks: ["est_montos", "est_pagos", "est_conciliar"] },
  { t: "Certificación", ks: ["est_almacen", "est_entregar", "est_pago_instructor"] },
  { t: "Cursos", ks: ["est_cursos"] },
  { t: "Bitácora y estadísticas", ks: ["est_bitacora", "est_estadisticas"] },
];
const ICONOS = { est_estudiantes: IconPlus, est_documentos: IconEye, est_cancelar: IconX, est_borrar: IconTrash, est_interesados: IconChat, est_montos: IconEye, est_pagos: IconReceipt, est_conciliar: IconLock, est_almacen: IconCheck, est_entregar: IconPhone, est_pago_instructor: IconReceipt, est_cursos: IconCatalog, est_bitacora: IconHistory, est_estadisticas: IconGauge };
const PERM = Object.fromEntries(PERMISOS_EST.map((x) => [x.k, x]));

const grupoDe = (pf) => (pf.es_titular ? "titular" : pf.is_admin ? "admin" : !pf.permisos?.acceso_estudiantes ? "sin" : "usuario");
const GRUPOS = [
  { g: "titular", t: "Titular" },
  { g: "admin", t: "Administradores" },
  { g: "usuario", t: "Usuarios" },
  { g: "sin", t: "Sin acceso a Control Estudiantes" },
];

export function AdminEst({ yo, avisar, ir }) {
  const supabase = useMemo(() => createClient(), []);
  const [perfiles, setPerfiles] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [guardando, setGuardando] = useState(null);

  async function cargar() {
    const { data } = await supabase.from("profiles").select("id, full_name, es_titular, is_admin, permisos, eliminado_en").order("full_name");
    setPerfiles((data || []).filter((x) => !x.eliminado_en));
  }
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(pf, cambios) {
    const permisos = { ...(pf.permisos || {}), ...cambios };
    setGuardando(pf.id);
    setPerfiles((ps) => ps.map((x) => (x.id === pf.id ? { ...x, permisos } : x)));
    const { error } = await supabase.from("profiles").update({ permisos }).eq("id", pf.id);
    setGuardando(null);
    if (error) {
      avisar(`No se pudo guardar: ${error.message}`);
      cargar();
    }
  }

  if (!perfiles) return <div className="hint-text">Cargando…</div>;
  return (
    <>
      <a className="back-link" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">Administración</h1>
      <div className="hint-text" style={{ marginBottom: 4 }}>
        Toca a una persona para ver y cambiar lo que puede hacer en Control Estudiantes, por sección. Los cambios se guardan al momento. Todos los que entran pueden ver los estudiantes y los cursos, y todo lo que se hace queda en la Bitácora. Solo tú (el Titular) entras aquí.
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
                const admin = g === "admin";
                const entra = titular || admin || !!pf.permisos?.acceso_estudiantes;
                const cuantos = PERMISOS_EST.filter((x) => valorPermisoEst(pf.permisos, x)).length;
                const esta = abierto === pf.id;
                return (
                  <div key={pf.id} className="vj-adm-persona" style={{ opacity: guardando === pf.id ? 0.6 : 1 }}>
                    <button type="button" className="vj-adm-top" onClick={() => setAbierto(esta ? null : pf.id)} aria-expanded={esta}>
                      <span style={{ minWidth: 0 }}>
                        <b>{pf.full_name || "—"}</b>
                        {pf.id === yo?.id && <span className="tag-tu">Tú</span>}
                        <span className="hint-text" style={{ display: "block", margin: 0 }}>
                          {titular ? "Titular" : admin ? "Administrador" : "Usuario"}
                        </span>
                      </span>
                      <span className="vj-adm-resumen">
                        {titular || admin ? "Acceso a todo" : !entra ? "Sin acceso" : cuantos === PERMISOS_EST.length ? "Todo" : cuantos === 0 ? "Solo ver" : `${cuantos} de ${PERMISOS_EST.length} permisos`}
                        <span style={{ marginLeft: 6 }}>{esta ? "▴" : "▾"}</span>
                      </span>
                    </button>
                    {esta && (titular || admin) && (
                      <div className="vj-adm-cuerpo">
                        <div className="hint-text">{titular ? "El Titular" : "Un Administrador"} puede todo en Control Estudiantes.</div>
                      </div>
                    )}
                    {esta && !titular && !admin && (
                      <div className="vj-adm-cuerpo">
                        <label className="vj-adm-item fuerte">
                          <span className="vj-adm-label">
                            <IconUsers size={15} />
                            <span>
                              Entrar a Control Estudiantes
                              <span className="hint-text">Es el mismo acceso de “Accesos a apps”. Con solo esto, puede ver los estudiantes y los cursos.</span>
                            </span>
                          </span>
                          <input type="checkbox" checked={entra} disabled={guardando === pf.id} onChange={(e) => guardar(pf, { acceso_estudiantes: e.target.checked })} />
                        </label>
                        {!entra && <div className="aviso-box vj-adm-aviso">Todavía no entra a Control Estudiantes. Puedes dejarle los permisos listos desde ya.</div>}
                        <div className="vj-adm-atajos">
                          <button type="button" className="btn secondary vj-mini" disabled={guardando === pf.id} onClick={() => guardar(pf, Object.fromEntries(PERMISOS_EST.map((x) => [x.k, true])))}>
                            Darle todo
                          </button>
                          <button type="button" className="btn secondary vj-mini" disabled={guardando === pf.id} onClick={() => guardar(pf, Object.fromEntries(PERMISOS_EST.map((x) => [x.k, false])))}>
                            Quitarle todo
                          </button>
                        </div>
                        {SECCIONES.map((sec) => (
                          <div key={sec.t}>
                            <div className="vj-adm-sec">{sec.t}</div>
                            {sec.ks.map((k) => {
                              const x = PERM[k];
                              const Icono = ICONOS[k] || IconEdit;
                              return (
                                <label key={k} className="vj-adm-item">
                                  <span className="vj-adm-label">
                                    <Icono size={15} />
                                    <span>
                                      {x.t}
                                      <span className="hint-text">{x.sub}</span>
                                    </span>
                                  </span>
                                  <input type="checkbox" checked={valorPermisoEst(pf.permisos, x)} disabled={guardando === pf.id} onChange={(e) => guardar(pf, { [k]: e.target.checked })} />
                                </label>
                              );
                            })}
                          </div>
                        ))}
                        <div className="hint-text" style={{ marginTop: 10 }}>
                          Para hacerlo Administrador: Administración de App Interno (vale para todas las apps).
                        </div>
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
