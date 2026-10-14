"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  IconEdit,
  IconTank,
  IconPlus,
  IconCatalog,
  IconClipboard,
  IconHistory,
  IconReport,
  IconRefresh,
  IconUsers,
  IconCompressor,
  IconWrench,
} from "@/components/icons";

const PERMISOS_DEFAULT = {
  equipos_clientes: false,
  equipos_clientes_registrar: false,
  equipos_clientes_agregar_equipo: false,
  equipos_clientes_agregar_cliente: false,
  equipos_clientes_catalogo: false,
  equipos_clientes_editar_equipo: false,
  equipos_clientes_historial: false,
  equipos_clientes_reportes: false,
  equipos_clientes_actualizar_estado: false,
  equipos_clientes_editar_cliente: false,
  equipos_clientes_editar_orden: false,
  equipos_clientes_editar_mantenimiento_compresor: false,
  equipos_clientes_informe_mantenimiento: false,
  equipos_clientes_bitacora_movimientos: false,
  equipos_clientes_bitacora_orden: false,
  equipos_clientes_editar_hold: false,
  equipos_clientes_listado_clientes: false,
  equipos_clientes_listado_ordenes: false,
  equipos_clientes_agregar_codigo: false,
  equipos_clientes_editar_codigo: false,
  // V30 (migration_54.sql).
  equipos_clientes_registrar_servicio: false,
  equipos_clientes_editar_servicio: false,
  equipos_clientes_contactar: false,
};

// V30 → v56 -- Permisos agrupados por sección de la app (igual que App
// Interno), en lugar de por tipo de acción (General / Registrar / Más /
// Administradores). Los ítems con `soloAdmin: true` siguen apareciendo
// dentro de cada sección pero atenuados/bloqueados para usuarios no-admin.
// Las claves de permiso NO cambiaron, solo la agrupación visual.
export const SECCIONES = [
  {
    titulo: "Órdenes",
    items: [
      { clave: "equipos_clientes_listado_ordenes", label: "Historial de órdenes", Icono: IconHistory },
      { clave: "equipos_clientes_registrar", label: "Registrar orden", Icono: IconEdit },
      { clave: "equipos_clientes_actualizar_estado", label: "Actualizar estado de orden", Icono: IconRefresh },
      { clave: "equipos_clientes_editar_orden", label: "Editar orden", Icono: IconEdit, soloAdmin: true },
      { clave: "equipos_clientes_editar_hold", label: "Editar Hold", Icono: IconEdit, soloAdmin: true },
      { clave: "equipos_clientes_bitacora_orden", label: "Ver bitácora de la orden", Icono: IconClipboard, soloAdmin: true },
    ],
  },
  {
    titulo: "Clientes",
    items: [
      { clave: "equipos_clientes_listado_clientes", label: "Listado de clientes", Icono: IconUsers },
      { clave: "equipos_clientes_agregar_cliente", label: "Registrar cliente", Icono: IconPlus },
      { clave: "equipos_clientes_editar_cliente", label: "Editar cliente", Icono: IconEdit, soloAdmin: true },
    ],
  },
  {
    titulo: "Equipos",
    items: [
      { clave: "equipos_clientes_agregar_equipo", label: "Registrar equipo de cliente", Icono: IconTank },
      { clave: "equipos_clientes_informe_mantenimiento", label: "Informe de mantenimiento", Icono: IconWrench },
      { clave: "equipos_clientes_editar_equipo", label: "Editar equipo", Icono: IconEdit, soloAdmin: true },
      {
        clave: "equipos_clientes_editar_mantenimiento_compresor",
        label: "Editar mantenimiento de compresor",
        Icono: IconCompressor,
        soloAdmin: true,
      },
    ],
  },
  {
    titulo: "Base de datos",
    items: [
      { clave: "equipos_clientes_catalogo", label: "Base de datos", Icono: IconCatalog },
      { clave: "equipos_clientes_agregar_codigo", label: "Registrar código en base de datos", Icono: IconCatalog },
      { clave: "equipos_clientes_registrar_servicio", label: "Registrar servicio en base de datos", Icono: IconWrench },
      { clave: "equipos_clientes_editar_codigo", label: "Editar código", Icono: IconEdit, soloAdmin: true },
      { clave: "equipos_clientes_editar_servicio", label: "Editar servicio", Icono: IconWrench, soloAdmin: true },
    ],
  },
  {
    titulo: "Más",
    items: [
      { clave: "equipos_clientes_reportes", label: "Recibos e Informes", Icono: IconReport },
      { clave: "equipos_clientes_contactar", label: "Clientes por contactar", Icono: IconUsers },
      { clave: "equipos_clientes_historial", label: "Anulaciones y ediciones", Icono: IconHistory, soloAdmin: true },
      { clave: "equipos_clientes_bitacora_movimientos", label: "Bitácora de órdenes", Icono: IconClipboard, soloAdmin: true },
    ],
  },
];

const CLAVES = SECCIONES.flatMap((s) => s.items.map((i) => i.clave));

// V31: Titular / Administrador / un rol de esta app (migration_61.sql) /
// Usuario. El Operativo de App Interno ya no es un grupo aparte aquí.
function rolDe(p, roles = []) {
  if (p.es_titular) return "titular";
  if (p.is_admin) return "admin";
  if (p.rol_clientes_id && roles.some((r) => r.id === p.rol_clientes_id)) return p.rol_clientes_id;
  return "usuario";
}

export default function PermisosClientes({ perfiles, miId, roles = [] }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState("");

  async function guardar(perfil, cambios) {
    setLoadingId(perfil.id);
    setError("");
    const { error: err } = await supabase.from("profiles").update(cambios).eq("id", perfil.id);
    setLoadingId(null);
    if (err) setError(err.message || "No se pudo guardar.");
    router.refresh();
  }

  function permisosDe(perfil) {
    return { ...PERMISOS_DEFAULT, ...(perfil.permisos || {}) };
  }

  return (
    <div>
      {error && <div className="error-box" style={{ marginTop: 0, marginBottom: 12 }}>{error}</div>}
      <p className="hint-text" style={{ marginTop: 0, marginBottom: 12 }}>
        Toca a una persona para ver y cambiar su rol y sus permisos en esta app. Los cambios se guardan al momento.
      </p>

      {[
        { rol: "titular", titulo: "Titular" },
        { rol: "admin", titulo: "Administradores" },
        ...roles.map((r) => ({ rol: r.id, titulo: r.nombre, deRol: r })),
        { rol: "usuario", titulo: "Usuarios" },
      ].map(({ rol, titulo, deRol }) => {
        const gente = perfiles.filter((p) => rolDe(p, roles) === rol);
        if (gente.length === 0) return null;
        return (
          <div key={rol} style={{ marginTop: 14 }}>
            <div className="section-title" style={{ marginTop: 0, marginBottom: 8 }}>
              {titulo}
            </div>
            <div className="card" style={{ padding: "4px 16px" }}>
              {gente.map((p) => {
                const permisos = permisosDe(p);
                const esAdmin = rol === "admin";
                const cuantos = CLAVES.filter((c) => permisos[c]).length;
                const estaAbierto = abierto === p.id;
                const cerrado = rol === "titular";
                const conAcceso = rol === "titular" || !!permisos.equipos_clientes;
                return (
                  <div key={p.id} className="list-item">
                    <div
                      className="list-item-top"
                      onClick={cerrado ? undefined : () => setAbierto(estaAbierto ? null : p.id)}
                      style={{ cursor: cerrado ? "default" : "pointer" }}
                    >
                      <span className="list-item-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {p.full_name}
                        {p.id === miId && <span className="tag-tu">Tú</span>}
                      </span>
                      <span className="hint-text" style={{ margin: 0, whiteSpace: "nowrap" }}>
                        {rol === "titular"
                          ? "Acceso a todo"
                          : !conAcceso
                          ? "Sin acceso a esta app"
                          : deRol
                          ? `Rol: ${deRol.nombre}`
                          : !conAcceso
                          ? "Sin acceso a esta app"
                          : cuantos === 0
                          ? "Sin permisos"
                          : `${cuantos} permiso${cuantos === 1 ? "" : "s"}`}
                        {!cerrado && <span style={{ marginLeft: 6 }}>{estaAbierto ? "▴" : "▾"}</span>}
                      </span>
                    </div>

                    {estaAbierto && !cerrado && (
                      <div style={{ marginTop: 10 }}>
                        {!conAcceso && (
                          <div className="aviso-box" style={{ marginTop: 0, marginBottom: 10 }}>
                            Todavía no tiene acceso a esta app: se le da en <b>Accesos a apps</b> (selector de apps).
                            Puedes dejarle los permisos listos desde ya.
                          </div>
                        )}
                        <label style={{ marginTop: 0 }}>Rol</label>
                        <select
                          value={rol}
                          disabled={loadingId === p.id}
                          onChange={(e) => {
                            const v = e.target.value;
                            // Administrador cubre las dos apps: le quita el rol de las dos.
                            if (v === "admin") guardar(p, { is_admin: true, rol_interno_id: null, rol_clientes_id: null });
                            else if (v === "usuario") guardar(p, { is_admin: false, rol_clientes_id: null });
                            else guardar(p, { is_admin: false, rol_clientes_id: v });
                          }}
                        >
                          <option value="usuario">Usuario (permisos sueltos)</option>
                          <option value="admin">Administrador</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                        {deRol && (
                          <div className="hint-text" style={{ marginTop: 8 }}>
                            Sus accesos los manda el rol <b>{deRol.nombre}</b>. Para cambiarlos, edita el rol en{" "}
                            <b>Roles</b> (cambia para todos los que lo tienen) o pásalo a Usuario.
                          </div>
                        )}

                        {SECCIONES.map((sec) => (
                          <div key={sec.titulo}>
                            <div className="section-title" style={{ marginTop: 16, marginBottom: 2, fontSize: 14 }}>
                              {sec.titulo}
                            </div>
                            {sec.soloAdmin && !esAdmin && (
                              <div className="hint-text" style={{ marginTop: 0, marginBottom: 4 }}>
                                Solo se le pueden dar a un Administrador.
                              </div>
                            )}
                            {sec.items.map((it) => {
                              const bloqueado = (sec.soloAdmin || it.soloAdmin) && !esAdmin;
                              const activo = !bloqueado && !!permisos[it.clave];
                              return (
                                <label
                                  key={it.clave}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "9px 0",
                                    borderBottom: "1px solid var(--borde)",
                                    margin: 0,
                                    fontWeight: 500,
                                    fontSize: 13.5,
                                    color: bloqueado ? "var(--texto-suave)" : "var(--texto)",
                                    cursor: bloqueado ? "default" : "pointer",
                                    opacity: bloqueado ? 0.6 : 1,
                                  }}
                                >
                                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <it.Icono size={15} style={{ color: "var(--texto-suave)", flexShrink: 0 }} />
                                    <span>
                                      {it.label}
                                      {it.soloAdmin && !esAdmin && (
                                        <span className="hint-text" style={{ display: "block", marginTop: 1 }}>
                                          Solo Administradores
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={activo}
                                    disabled={bloqueado || !!deRol || loadingId === p.id}
                                    onChange={(e) =>
                                      guardar(p, { permisos: { ...permisos, [it.clave]: e.target.checked } })
                                    }
                                    style={{ width: 18, height: 18, flexShrink: 0 }}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
