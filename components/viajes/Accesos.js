"use client";

import { useEffect, useState } from "react";
import { PERMISOS } from "@/lib/viajes/modelo";

// V42 -- Accesos de Viajes/Buceos (solo el Titular). Cada permiso se da por
// persona, como en las otras apps. Los marcados "solo admin." (conciliación,
// números, cerrar viajes, bitácora y estadísticas) solo se le pueden dar a
// un Administrador (pedido explícito: "no todos pueden ver la conciliación,
// eso me corresponde a mí o a mi hermano, que es administrador").
export function AccesosViajes({ supabase, avisar }) {
  const [perfiles, setPerfiles] = useState(null);
  const [guardando, setGuardando] = useState(null);

  async function cargar() {
    const { data } = await supabase.from("profiles").select("id, full_name, es_titular, is_admin, permisos, eliminado_en").order("full_name");
    setPerfiles((data || []).filter((x) => !x.eliminado_en));
  }
  useEffect(() => {
    cargar();
  }, []);

  async function cambiar(perfil, clave, valor) {
    const permisos = { ...(perfil.permisos || {}), [clave]: valor };
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
      <h1 className="page-title">Accesos de Viajes</h1>
      <div className="hint-text" style={{ marginBottom: 10 }}>
        “Entrar” es el mismo acceso a Viajes/Buceos de “Accesos a apps”. Los permisos con 🔒 solo se le pueden dar a un Administrador. El Titular
        siempre tiene todo.
      </div>
      <div className="card" style={{ overflowX: "auto", padding: 0 }}>
        <table className="perm-table vj-perm">
          <thead>
            <tr>
              <th>Usuario</th>
              {PERMISOS.map((x) => (
                <th key={x.k} title={x.t}>
                  {x.soloAdmin ? "🔒 " : ""}
                  {x.k === "ver" ? "Entrar" : x.t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perfiles.map((pf) => (
              <tr key={pf.id} style={{ opacity: guardando === pf.id ? 0.6 : 1 }}>
                <td>
                  <b>{pf.full_name}</b>
                  <div className="hint-text">{pf.es_titular ? "Titular" : pf.is_admin ? "Administrador" : "Usuario"}</div>
                </td>
                {PERMISOS.map((x) => {
                  if (pf.es_titular)
                    return (
                      <td key={x.k} style={{ textAlign: "center" }}>
                        —
                      </td>
                    );
                  const deshabilitado = (x.soloAdmin && !pf.is_admin) || (x.k !== "ver" && !pf.permisos?.acceso_viajes);
                  return (
                    <td key={x.k} style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        style={{ width: "auto" }}
                        disabled={deshabilitado}
                        checked={!deshabilitado && !!pf.permisos?.[x.clave]}
                        onChange={(e) => cambiar(pf, x.clave, e.target.checked)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
