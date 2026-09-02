"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PERMISOS_DEFAULT = { reportes: false, catalogo: true, historial: false, changelog: false };

export default function ListaUsuarios({ perfiles, miId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);

  async function cambiarRol(perfil, esAdmin) {
    setLoadingId(perfil.id);
    await supabase.from("profiles").update({ is_admin: esAdmin }).eq("id", perfil.id);
    setLoadingId(null);
    router.refresh();
  }

  async function togglePermiso(perfil, clave, valor) {
    const permisos = { ...PERMISOS_DEFAULT, ...(perfil.permisos || {}), [clave]: valor };
    setLoadingId(perfil.id);
    await supabase.from("profiles").update({ permisos }).eq("id", perfil.id);
    setLoadingId(null);
    router.refresh();
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="perm-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Reportes</th>
            <th>Catálogo</th>
            <th>Historial</th>
            <th>Changelog</th>
          </tr>
        </thead>
        <tbody>
          {perfiles.map((p) => {
            const permisos = { ...PERMISOS_DEFAULT, ...(p.permisos || {}) };

            if (p.es_titular) {
              return (
                <tr key={p.id}>
                  <td>{p.full_name}</td>
                  <td>
                    <span className="role-tag role-tag-titular">Titular</span>
                  </td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              );
            }

            return (
              <tr key={p.id}>
                <td>
                  {p.full_name}
                  {p.id === miId && <span className="tag-tu">Tú</span>}
                </td>
                <td>
                  <select
                    value={p.is_admin ? "admin" : "usuario"}
                    disabled={loadingId === p.id}
                    onChange={(e) => cambiarRol(p, e.target.value === "admin")}
                  >
                    <option value="admin">Administrador</option>
                    <option value="usuario">Usuario</option>
                  </select>
                </td>
                {["reportes", "catalogo", "historial", "changelog"].map((clave) => (
                  <td key={clave}>
                    <input
                      type="checkbox"
                      checked={!!permisos[clave]}
                      disabled={loadingId === p.id}
                      onChange={(e) => togglePermiso(p, clave, e.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
