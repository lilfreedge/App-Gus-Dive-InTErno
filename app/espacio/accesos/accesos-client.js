"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconUsers, IconWrench } from "@/components/icons";

const PERMISOS_DEFAULT_LOCAL = {
  equipos_clientes: false,
  acceso_app_interno: false,
};

// Tabla de accesos por app (26-sep-2026) -- mismo patrón de togglePermiso
// que ya usan permisos-client.js (App Clientes) y lista-client.js (App
// Interno), pero acotada a las 2 columnas que deciden qué tarjetas se ven
// en /espacio. El Titular no se lista con checkboxes -- siempre tiene
// acceso a las dos, sin importar este valor (lib/roles.js -> tieneAcceso).
export default function AccesosClient({ perfiles, miId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);

  async function togglePermiso(perfil, clave, valor) {
    const permisos = { ...PERMISOS_DEFAULT_LOCAL, ...(perfil.permisos || {}), [clave]: valor };
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
            <th title="App Equipos de clientes">
              <IconUsers size={15} style={{ display: "block", margin: "0 auto 3px" }} />
              Equipos de clientes
            </th>
            <th title="App Interno">
              <IconWrench size={15} style={{ display: "block", margin: "0 auto 3px" }} />
              App Interno
            </th>
          </tr>
        </thead>
        <tbody>
          {perfiles.map((p) => {
            if (p.es_titular) {
              return (
                <tr key={p.id}>
                  <td>
                    {p.full_name}
                    <span className="role-tag role-tag-titular">Titular</span>
                  </td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              );
            }

            const permisos = { ...PERMISOS_DEFAULT_LOCAL, ...(p.permisos || {}) };
            return (
              <tr key={p.id}>
                <td>
                  {p.full_name}
                  {p.id === miId && <span className="tag-tu">Tú</span>}
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!permisos.equipos_clientes}
                    disabled={loadingId === p.id}
                    onChange={(e) => togglePermiso(p, "equipos_clientes", e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!permisos.acceso_app_interno}
                    disabled={loadingId === p.id}
                    onChange={(e) => togglePermiso(p, "acceso_app_interno", e.target.checked)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
