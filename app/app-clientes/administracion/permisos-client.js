"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconUsers } from "@/components/icons";

const PERMISOS_DEFAULT = {
  equipos_clientes: false,
};

// Tabla de permisos propia de App Clientes -- mismo patrón que
// app/admin/usuarios/lista-client.js (togglePermiso), pero acotada a los
// permisos de esta app. Hoy solo existe "equipos_clientes"; si se agregan
// más secciones acá adentro (p. ej. facturación propia de clientes), se
// suman como columnas nuevas.
const COLUMNAS = [{ clave: "equipos_clientes", label: "Equipos de clientes", Icono: IconUsers }];

export default function PermisosClientes({ perfiles, miId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);

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
            {COLUMNAS.map((c) => (
              <th key={c.clave} title={c.label}>
                <c.Icono size={15} style={{ display: "block", margin: "0 auto 3px" }} />
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {perfiles.map((p) => {
            if (p.es_titular) {
              return (
                <tr key={p.id}>
                  <td>
                    {p.full_name}
                    {p.id === miId && <span className="tag-tu">Tú</span>}
                  </td>
                  {COLUMNAS.map((c) => (
                    <td key={c.clave}>—</td>
                  ))}
                </tr>
              );
            }

            const permisos = { ...PERMISOS_DEFAULT, ...(p.permisos || {}) };
            return (
              <tr key={p.id}>
                <td>
                  {p.full_name}
                  {p.id === miId && <span className="tag-tu">Tú</span>}
                </td>
                {COLUMNAS.map((c) => (
                  <td key={c.clave}>
                    <input
                      type="checkbox"
                      checked={!!permisos[c.clave]}
                      disabled={loadingId === p.id}
                      onChange={(e) => togglePermiso(p, c.clave, e.target.checked)}
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
