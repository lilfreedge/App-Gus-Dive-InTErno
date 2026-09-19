"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PERMISOS_DEFAULT = {
  reportes: false,
  catalogo: true,
  historial: false,
  changelog: false,
  manual: false,
  movimientos: false,
  facturacion: false,
  registrar_inspeccion: false,
  registrar_llenado: false,
  registrar_mantenimiento: false,
  catalogo_codigo: false,
  catalogo_regulador: false,
  catalogo_tanque: false,
};

// Tres tablas apiladas (en vez de una sola tabla ancha con scroll
// horizontal) — más fácil de leer con tantos permisos:
// "General": las secciones que ya existían.
// "Registrar": quién puede crear/editar/anular cada tipo de movimiento
// (Inspecciones, Llenados, Mantenimientos), independiente del rol
// Admin/Usuario — sin esto, solo ve la lista, no puede registrar.
// "Catálogo — Registrar": lo mismo pero para agregar/editar cada
// sub-catálogo (Código, Regulador, Tanque).
const GRUPOS = [
  {
    titulo: "General",
    columnas: [
      { clave: "reportes", label: "Reportes" },
      { clave: "catalogo", label: "Catálogo" },
      { clave: "historial", label: "Historial" },
      { clave: "changelog", label: "Changelog" },
      { clave: "manual", label: "Manual" },
      { clave: "movimientos", label: "Movimientos" },
    ],
  },
  {
    titulo: "Registrar",
    columnas: [
      { clave: "registrar_inspeccion", label: "Inspecciones" },
      { clave: "registrar_llenado", label: "Llenados" },
      { clave: "registrar_mantenimiento", label: "Mantenimiento" },
      { clave: "facturacion", label: "Facturación de llenado" },
    ],
  },
  {
    titulo: "Catálogo — Registrar",
    columnas: [
      { clave: "catalogo_codigo", label: "Código" },
      { clave: "catalogo_regulador", label: "Regulador" },
      { clave: "catalogo_tanque", label: "Tanque" },
    ],
  },
];

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
    <div>
      {GRUPOS.map((grupo, i) => (
        <div key={grupo.titulo} style={{ marginTop: i === 0 ? 0 : 24 }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            {grupo.titulo}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="perm-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  {i === 0 && <th>Rol</th>}
                  {grupo.columnas.map((c) => (
                    <th key={c.clave}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfiles.map((p) => {
                  const permisos = { ...PERMISOS_DEFAULT, ...(p.permisos || {}) };

                  if (p.es_titular) {
                    return (
                      <tr key={p.id}>
                        <td>{p.full_name}</td>
                        {i === 0 && (
                          <td>
                            <span className="role-tag role-tag-titular">Titular</span>
                          </td>
                        )}
                        {grupo.columnas.map((c) => (
                          <td key={c.clave}>—</td>
                        ))}
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.id}>
                      <td>
                        {p.full_name}
                        {p.id === miId && <span className="tag-tu">Tú</span>}
                      </td>
                      {i === 0 && (
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
                      )}
                      {grupo.columnas.map((c) => (
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
        </div>
      ))}
    </div>
  );
}
