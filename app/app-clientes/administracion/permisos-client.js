"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconUsers, IconEdit, IconTank, IconPlus, IconCatalog } from "@/components/icons";

const PERMISOS_DEFAULT = {
  equipos_clientes: false,
  equipos_clientes_registrar: false,
  equipos_clientes_agregar_equipo: false,
  equipos_clientes_agregar_cliente: false,
  equipos_clientes_catalogo: false,
};

// Tabla de permisos propia de App Clientes -- mismo patrón que
// app/admin/usuarios/lista-client.js (togglePermiso). "Equipos de
// clientes" sigue gateando poder ENTRAR a la app; las 4 columnas nuevas
// (item 15, pedido explícito: "ponme permisos para dar a los demas de:
// registrar orden... agregar equipo, agregar cliente, acceso a
// Catalogo") son más finas, para acciones puntuales dentro de ella --
// sin una de ellas, el usuario igual puede VER todo, solo no puede
// hacer esa acción en concreto.
const COLUMNAS = [
  { clave: "equipos_clientes", label: "Equipos de clientes", Icono: IconUsers },
  { clave: "equipos_clientes_registrar", label: "Registrar orden", Icono: IconEdit },
  { clave: "equipos_clientes_agregar_equipo", label: "Agregar equipo", Icono: IconTank },
  { clave: "equipos_clientes_agregar_cliente", label: "Agregar cliente", Icono: IconPlus },
  { clave: "equipos_clientes_catalogo", label: "Base de datos", Icono: IconCatalog },
];

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
                    <span className="role-tag role-tag-titular">Titular</span>
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
