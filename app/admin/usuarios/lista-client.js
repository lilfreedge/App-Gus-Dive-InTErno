"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  IconReport,
  IconCatalog,
  IconHistory,
  IconBook,
  IconShuffle,
  IconCompressor,
  IconEye,
  IconTankFill,
  IconWrench,
  IconReceipt,
  IconMail,
  IconEdit,
  IconTank,
} from "@/components/icons";

export const PERMISOS_DEFAULT = {
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
  compresores: false,
  correos_semanales: false,
};

// Tres tablas apiladas (en vez de una sola tabla ancha con scroll
// horizontal) — más fácil de leer con tantos permisos:
// "General": las secciones que ya existían.
// "Registrar": quién puede crear/editar/anular cada tipo de movimiento
// (Inspecciones, Llenados, Mantenimientos), independiente del rol
// Admin/Usuario — sin esto, solo ve la lista, no puede registrar.
// "Catálogo — Registrar": lo mismo pero para agregar/editar cada
// sub-catálogo (Código, Regulador, Tanque).
export const GRUPOS = [
  {
    titulo: "General",
    columnas: [
      { clave: "reportes", label: "Reportes", Icono: IconReport },
      { clave: "catalogo", label: "Catálogo", Icono: IconCatalog },
      { clave: "historial", label: "Historial", Icono: IconHistory },
      { clave: "changelog", label: "Changelog", Icono: IconHistory },
      { clave: "manual", label: "Manual", Icono: IconBook },
      { clave: "movimientos", label: "Movimientos", Icono: IconShuffle },
      { clave: "compresores", label: "Compresores", Icono: IconCompressor },
    ],
  },
  {
    titulo: "Registrar",
    columnas: [
      { clave: "registrar_inspeccion", label: "Inspecciones", Icono: IconEye },
      { clave: "registrar_llenado", label: "Llenados", Icono: IconTankFill },
      { clave: "registrar_mantenimiento", label: "Mantenimiento", Icono: IconWrench },
      { clave: "facturacion", label: "Facturación de llenado", Icono: IconReceipt },
      {
        clave: "correos_semanales",
        label: "Correos semanales",
        Icono: IconMail,
        destacado: true,
      },
    ],
  },
  {
    titulo: "Catálogo — Registrar",
    columnas: [
      { clave: "catalogo_codigo", label: "Código", Icono: IconEdit },
      { clave: "catalogo_regulador", label: "Regulador", Icono: IconWrench },
      { clave: "catalogo_tanque", label: "Tanque", Icono: IconTank },
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

  // Ítem 12 del feedback de v14/v16 (22-sep-2026): primero se probó una
  // fila-plantilla ("Nuevo Administrador") que pre-marcaba permisos para
  // futuros ascensos -- el usuario la rechazó explícitamente ("que me
  // aparezcan los administradores actuales, no eso dique nuevo
  // administrador, no hace sentido"). Ahora, en su lugar, esta sección
  // filtra y muestra a quienes YA tienen el rol Administrador hoy, con
  // las mismas casillas de las 3 tablas de arriba -- son sus permisos
  // reales (togglePermiso), el cambio es inmediato, no una plantilla.
  const administradores = perfiles.filter((p) => p.is_admin && !p.es_titular);

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
                    <th key={c.clave} title={c.label}>
                      <c.Icono size={15} style={{ display: "block", margin: "0 auto 3px" }} />
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfiles.map((p) => {
                  const permisos = { ...PERMISOS_DEFAULT, ...(p.permisos || {}) };

                  if (p.es_titular) {
                    return (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/admin/usuarios/${p.id}`} className="breadcrumb-crumb">
                            {p.full_name}
                          </Link>
                        </td>
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
                        <Link href={`/admin/usuarios/${p.id}`} className="breadcrumb-crumb">
                          {p.full_name}
                        </Link>
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
                        <td
                          key={c.clave}
                          style={
                            c.destacado && permisos[c.clave]
                              ? { background: "var(--acento-fondo)", borderRadius: 6 }
                              : undefined
                          }
                        >
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

      {/* Ítem 12 del feedback de v14/v16 (22-sep-2026): vista filtrada de
          quienes ya tienen el rol Administrador, con las mismas casillas
          de las 3 tablas de arriba, para revisar/ajustar sus permisos sin
          tener que buscarlos entre el resto de usuarios. Son sus permisos
          reales (togglePermiso) -- el cambio aplica al toque, igual que
          arriba. */}
      <div style={{ marginTop: 24 }}>
        <div className="section-title" style={{ marginTop: 0 }}>
          Administradores
        </div>
        {administradores.length === 0 ? (
          <div className="empty">Todavía no hay nadie con el rol Administrador.</div>
        ) : (
          GRUPOS.map((grupo) => (
            <div key={grupo.titulo} style={{ marginTop: 10 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="perm-table">
                  <thead>
                    <tr>
                      <th>{grupo.titulo}</th>
                      {grupo.columnas.map((c) => (
                        <th key={c.clave} title={c.label}>
                          <c.Icono size={15} style={{ display: "block", margin: "0 auto 3px" }} />
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {administradores.map((p) => {
                      const permisos = { ...PERMISOS_DEFAULT, ...(p.permisos || {}) };
                      return (
                        <tr key={p.id}>
                          <td>
                            <Link href={`/admin/usuarios/${p.id}`} className="breadcrumb-crumb">
                              {p.full_name}
                            </Link>
                            {p.id === miId && <span className="tag-tu">Tú</span>}
                          </td>
                          {grupo.columnas.map((c) => (
                            <td
                              key={c.clave}
                              style={
                                c.destacado && permisos[c.clave]
                                  ? { background: "var(--acento-fondo)", borderRadius: 6 }
                                  : undefined
                              }
                            >
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
          ))
        )}
      </div>
    </div>
  );
}
