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
  equipos_clientes_editar_equipo: false,
};

// Tabla de permisos propia de App Clientes -- mismo patrón que
// app/admin/usuarios/lista-client.js (togglePermiso). "Equipos de
// clientes" sigue gateando poder ENTRAR a la app; las columnas de
// permiso (item 15, pedido explícito: "ponme permisos para dar a los
// demas de: registrar orden... agregar equipo, agregar cliente, acceso
// a Catalogo"; "Editar equipo" sumado 23-sep-2026, pedido explícito
// aparte) son más finas, para acciones puntuales dentro de ella -- sin
// una de ellas, el usuario igual puede VER todo, solo no puede hacer
// esa acción en concreto.
const COLUMNAS = [
  { clave: "equipos_clientes", label: "Equipos de clientes", Icono: IconUsers },
  { clave: "equipos_clientes_registrar", label: "Registrar orden", Icono: IconEdit },
  { clave: "equipos_clientes_agregar_equipo", label: "Agregar equipo", Icono: IconTank },
  { clave: "equipos_clientes_agregar_cliente", label: "Agregar cliente", Icono: IconPlus },
  { clave: "equipos_clientes_editar_equipo", label: "Editar equipo", Icono: IconEdit },
  { clave: "equipos_clientes_catalogo", label: "Base de datos", Icono: IconCatalog },
];

// Columna "Rol" (pedido de seguimiento, 23-sep-2026: "creemos algo
// similar como está en app interno. que puedo darle rol y accesos
// dependiendo del rol" -- confirmado que es la misma estructura visual
// de App Interno, no un paquete de permisos automático por rol: dropdown
// Rol + casillas de permisos, ambos independientes). Reusa el mismo
// profiles.is_admin de toda la cuenta -- no uno aparte de App Clientes
// (confirmado: "recuerda agregar en adminsitracion para yo poder acceso
// de administrador a los demas"), mismo patrón que cambiarRol en
// app/admin/usuarios/lista-client.js.
export default function PermisosClientes({ perfiles, miId }) {
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
                  <td>
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
