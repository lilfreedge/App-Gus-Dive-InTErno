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

export default function ListaUsuarios({ perfiles, miId, plantillaAdmin }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);
  const [plantilla, setPlantilla] = useState({ ...PERMISOS_DEFAULT, ...(plantillaAdmin || {}) });
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);

  // Al pasar a alguien de Usuario a Administrador, se le PRE-MARCAN los
  // permisos activados en la plantilla de abajo -- sumados a lo que ya
  // tuviera, sin quitarle nada. Bajarlo de rol (o volver a subirlo) no
  // vuelve a aplicar la plantilla, para no pisar ajustes hechos a mano.
  async function cambiarRol(perfil, esAdmin) {
    setLoadingId(perfil.id);
    const updates = { is_admin: esAdmin };
    if (esAdmin && !perfil.is_admin) {
      const permisosActuales = { ...PERMISOS_DEFAULT, ...(perfil.permisos || {}) };
      const permisosNuevos = { ...permisosActuales };
      for (const clave of Object.keys(plantilla)) {
        if (plantilla[clave]) permisosNuevos[clave] = true;
      }
      updates.permisos = permisosNuevos;
    }
    await supabase.from("profiles").update(updates).eq("id", perfil.id);
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

  async function togglePlantilla(clave, valor) {
    const nueva = { ...plantilla, [clave]: valor };
    setPlantilla(nueva);
    setGuardandoPlantilla(true);
    await supabase.from("app_config").update({ permisos_default_admin: nueva }).eq("id", true);
    setGuardandoPlantilla(false);
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

      {/* Ítem 12 del feedback de v14 (22-sep-2026): plantilla de permisos
          que se pre-marcan automáticamente la primera vez que alguien pasa
          de Usuario a Administrador (ver cambiarRol arriba) -- no se
          aplica retroactivamente ni le quita nada a quien ya sea
          Administrador hoy. */}
      <div style={{ marginTop: 24 }}>
        <div className="section-title" style={{ marginTop: 0 }}>
          Permisos por defecto para nuevos Administradores
        </div>
        <p className="hint-text" style={{ marginTop: 0, marginBottom: 10 }}>
          Se pre-marcan solos la primera vez que pasas a alguien de Usuario a Administrador —
          no cambian los permisos de quienes ya son Administrador hoy, y cada persona los puede
          seguir ajustando individualmente arriba.
        </p>
        {GRUPOS.map((grupo) => (
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
                  <tr>
                    <td>Nuevo Administrador</td>
                    {grupo.columnas.map((c) => (
                      <td
                        key={c.clave}
                        style={
                          c.destacado && plantilla[c.clave]
                            ? { background: "var(--acento-fondo)", borderRadius: 6 }
                            : undefined
                        }
                      >
                        <input
                          type="checkbox"
                          checked={!!plantilla[c.clave]}
                          disabled={guardandoPlantilla}
                          onChange={(e) => togglePlantilla(c.clave, e.target.checked)}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
