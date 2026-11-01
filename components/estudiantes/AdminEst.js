"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PERMISOS_EST } from "@/lib/estudiantes/modelo";

// ⚙ › Administración de Control Estudiantes ("47. si": como en Buceos).
// Solo el Titular. Quién entra al app se escoge en "Accesos a apps"; aquí,
// qué puede hacer cada uno. El Titular y los administradores pueden todo.
export function AdminEst({ ir, avisar }) {
  const supabase = useMemo(() => createClient(), []);
  const [perfiles, setPerfiles] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [guardando, setGuardando] = useState(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, es_titular, is_admin, permisos, eliminado_en")
      .order("full_name")
      .then(({ data }) => setPerfiles((data || []).filter((x) => !x.eliminado_en)));
  }, [supabase]);

  async function guardar(pf, cambios) {
    const permisos = { ...(pf.permisos || {}), ...cambios };
    setGuardando(pf.id);
    setPerfiles((ps) => ps.map((x) => (x.id === pf.id ? { ...x, permisos } : x)));
    const { error } = await supabase.from("profiles").update({ permisos }).eq("id", pf.id);
    setGuardando(null);
    if (error) avisar(`No se pudo guardar: ${error.message}`);
  }

  if (!perfiles) return <div className="hint-text">Cargando…</div>;
  const con = perfiles.filter((x) => x.es_titular || x.permisos?.acceso_estudiantes);
  const sin = perfiles.filter((x) => !x.es_titular && !x.permisos?.acceso_estudiantes);

  const Persona = ({ pf }) => {
    const todo = pf.es_titular || pf.is_admin;
    const cuantos = PERMISOS_EST.filter((x) => pf.permisos?.[x.k]).length;
    const ab = abierto === pf.id;
    return (
      <div className="ce-etapa" style={{ marginTop: 8 }}>
        <button className="ce-adm-fila" onClick={() => setAbierto(ab ? null : pf.id)}>
          <b>{pf.full_name || "—"}</b>
          <span className="hint-text" style={{ margin: 0 }}>
            {pf.es_titular ? "Titular · todo" : pf.is_admin ? "Administrador · todo" : !pf.permisos?.acceso_estudiantes ? "No entra al app" : cuantos === 0 ? "Solo ver" : `${cuantos} de ${PERMISOS_EST.length}`}
          </span>
        </button>
        {ab && (
          <div style={{ marginTop: 6 }}>
            {!pf.permisos?.acceso_estudiantes && !pf.es_titular && <div className="aviso-box">Todavía no entra a Control Estudiantes (se le da en Accesos a apps). Puedes dejarle los permisos listos desde ya.</div>}
            {PERMISOS_EST.map((x) => (
              <label key={x.k} className="ce-ck" style={{ cursor: todo ? "default" : "pointer" }}>
                <span>
                  {x.t}
                  <div className="hint-text" style={{ margin: 0 }}>
                    {x.sub}
                  </div>
                </span>
                <input type="checkbox" checked={todo || !!pf.permisos?.[x.k]} disabled={todo || guardando === pf.id} onChange={(e) => guardar(pf, { [x.k]: e.target.checked })} />
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <a className="back-link" onClick={() => ir("mas")} style={{ cursor: "pointer" }}>
        ← Más
      </a>
      <h1 className="page-title">Administración</h1>
      <div className="hint-text">Toca a una persona para ver qué puede hacer. Todos los que entran pueden ver los estudiantes; cada cosa que se hace queda en la Bitácora.</div>
      <div className="section-title">Entran a Control Estudiantes</div>
      {con.map((pf) => (
        <Persona key={pf.id} pf={pf} />
      ))}
      {sin.length > 0 && (
        <>
          <div className="section-title">No entran todavía</div>
          {sin.map((pf) => (
            <Persona key={pf.id} pf={pf} />
          ))}
        </>
      )}
    </>
  );
}
