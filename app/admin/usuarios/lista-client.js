"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConInfo from "@/components/ConInfo";
import {
  IconPackage,
  IconTankFill,
  IconReceipt,
  IconEye,
  IconGauge,
  IconRegulator,
  IconCompressor,
  IconShuffle,
  IconCatalog,
  IconEdit,
  IconTank,
  IconCalendar,
  IconReport,
  IconMail,
  IconHistory,
  IconBook,
} from "@/components/icons";

export const PERMISOS_DEFAULT = {
  registrar_salida: false,
  rol_operativo: false,
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
  registrar_hidrostatica: false,
  // V32: registrar (antes el de arriba daba ver y registrar). Apagados
  // para todos ("no, quítalo y yo se lo pongo").
  inspeccion_registrar: false,
  hidrostatica_registrar: false,
  mantenimiento_registrar: false,
  proximos_vencimientos: false,
  catalogo_codigo: false,
  catalogo_regulador: false,
  catalogo_tanque: false,
  compresores: false,
  compresor_mantenimiento_registrar: false,
  registrar_compresor: false,
  correos_semanales: false,
  equipos_clientes: false,
  solicitudes_almacen: false,
};

// V30 -- "Usuarios y permisos" por usuario (opción B de la maqueta, pedido
// explícito, notas del 8-oct-2026: "Separa los permisos, que aparezcan
// tipo equipos: y dentro de equipos que figure llenados de tanques,
// inspección visual etc. Quiero que haga sentido... Pon todos en orden de
// como figuran en el app" -> "1. Me gusta mas opcion B"). Antes eran 3
// tablas anchas mezcladas (General / Registrar / Base de datos —
// Registrar) más una 4ta repetida con los Administradores. Ahora: una
// lista de personas agrupada por rol; al tocar una, se abren sus permisos
// por sección, en el mismo orden del menú de App Interno. Cada casilla
// guarda al toque, igual que antes.
//
// "Equipos de clientes" ya no sale aquí ("5. perfecto"): es la entrada a
// la otra app y se da en Accesos a apps (selector de apps), igual que la
// entrada a App Interno. El permiso no cambió, solo dónde se marca.
export const SECCIONES = [
  {
    titulo: "Salidas",
    items: [{ clave: "registrar_salida", label: "Salidas", sub: "Ver y registrar salidas de piezas", Icono: IconPackage }],
  },
  {
    titulo: "Equipos",
    items: [
      { clave: "registrar_llenado", label: "Llenados de tanque", sub: "Ver y registrar llenados", Icono: IconTankFill },
      { clave: "facturacion", label: "Facturación de llenado", sub: "Marcar llenados como facturados", Icono: IconReceipt, sub_de: true },
      // V32 (pedido explícito: "agregame permisos para yo dar de registrar
      // inspección visual, prueba hidrostáticas y mantenimiento de
      // reguladores"): el de arriba es VER; el de abajo, REGISTRAR.
      { clave: "registrar_inspeccion", label: "Inspección visual", sub: "Ver las inspecciones", Icono: IconEye },
      { clave: "inspeccion_registrar", label: "Registrar inspección visual", Icono: IconEdit, sub_de: true },
      { clave: "registrar_hidrostatica", label: "Pruebas hidrostáticas", sub: "Ver las pruebas y los tanques afuera", Icono: IconGauge },
      {
        clave: "hidrostatica_registrar",
        label: "Registrar prueba hidrostática",
        sub: "Enviar tanques a PH, registrar regreso y anotar pruebas",
        Icono: IconEdit,
        sub_de: true,
      },
      { clave: "registrar_mantenimiento", label: "Mantenimiento de reguladores", sub: "Ver los mantenimientos", Icono: IconRegulator },
      { clave: "mantenimiento_registrar", label: "Registrar mantenimiento de regulador", Icono: IconEdit, sub_de: true },
      // V34 (pedido explícito: "ok sí, créame ese acceso separado"): igual
      // que reguladores, arriba VER y abajo REGISTRAR. "Registrar compresor"
      // ahora también deja cambiar los datos del compresor.
      { clave: "compresores", label: "Compresores", sub: "Ver los compresores y sus mantenimientos", Icono: IconCompressor },
      { clave: "compresor_mantenimiento_registrar", label: "Registrar mantenimiento de compresor", Icono: IconEdit, sub_de: true },
      {
        clave: "registrar_compresor",
        label: "Registrar y editar compresor",
        sub: "Agregar compresores nuevos y cambiar sus datos",
        Icono: IconCompressor,
        sub_de: true,
      },
    ],
  },
  {
    titulo: "Movimientos",
    items: [{ clave: "movimientos", label: "Movimientos", Icono: IconShuffle }],
  },
  {
    titulo: "Más",
    items: [
      { clave: "catalogo", label: "Base de datos", sub: "Ver códigos, reguladores y tanques", Icono: IconCatalog },
      { clave: "catalogo_codigo", label: "Registrar código", Icono: IconEdit, sub_de: true },
      { clave: "catalogo_regulador", label: "Registrar regulador", Icono: IconRegulator, sub_de: true },
      { clave: "catalogo_tanque", label: "Registrar tanque", Icono: IconTank, sub_de: true },
      { clave: "proximos_vencimientos", label: "Próximos vencimientos", Icono: IconCalendar },
      { clave: "reportes", label: "Reportes", Icono: IconReport },
      {
        clave: "correos_semanales",
        label: "Correos semanales",
        sub: "Administrar los reportes automáticos por correo",
        Icono: IconMail,
        sub_de: true,
        destacado: true,
      },
      { clave: "solicitudes_almacen", label: "Solicitudes al almacén", Icono: IconPackage },
      { clave: "historial", label: "Anulaciones y ediciones", Icono: IconHistory },
    ],
  },
  {
    titulo: "Menú ⚙ (ajustes)",
    items: [
      { clave: "changelog", label: "Changelog", Icono: IconHistory },
      { clave: "manual", label: "Manual", Icono: IconBook },
    ],
  },
];

const CLAVES = SECCIONES.flatMap((s) => s.items.map((i) => i.clave));

// V31: además de Titular / Administrador / Usuario, los roles creados en
// Administración › Roles (migration_61.sql). El valor del <select> es
// "usuario", "admin" o el id del rol. "Operativo" ahora es uno de esos.
function rolDe(p, roles = []) {
  if (p.es_titular) return "titular";
  if (p.is_admin) return "admin";
  if (p.rol_interno_id && roles.some((r) => r.id === p.rol_interno_id)) return p.rol_interno_id;
  return "usuario";
}
export default function ListaUsuarios({ perfiles, miId, roles = [] }) {
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

  // Rol: Usuario / Administrador / un rol creado (V31). Al elegir un rol,
  // la base de datos le copia sus accesos (trigger de migration_61.sql).
  // Al volver a Usuario conserva esos accesos como permisos sueltos.
  // Administrador cubre las dos apps, así que le quita el rol de las dos.
  function cambiarRol(perfil, valor) {
    if (valor === "admin") {
      guardar(perfil, { is_admin: true, rol_interno_id: null, rol_clientes_id: null });
    } else if (valor === "usuario") {
      guardar(perfil, { is_admin: false, rol_interno_id: null });
    } else {
      guardar(perfil, { is_admin: false, rol_interno_id: valor });
    }
  }

  function togglePermiso(perfil, clave, valor) {
    guardar(perfil, { permisos: { ...permisosDe(perfil), [clave]: valor } });
  }

  return (
    <div>
      {error && <div className="error-box" style={{ marginTop: 0, marginBottom: 12 }}>{error}</div>}
      {/* V32: los textos de explicación pasan al botón ⓘ. */}
      <ConInfo
        style={{ marginBottom: 12 }}
        texto={
          <>
            Toca a una persona para ver y cambiar su rol y sus permisos. Los cambios se guardan al momento.
            <div style={{ marginTop: 6 }}>
              La entrada a cada app (App Interno, App Equipos de clientes) se da en <b>Accesos a apps</b>, desde el
              selector de apps.
            </div>
          </>
        }
      >
        <div style={{ fontWeight: 700, color: "var(--azul-texto)", fontSize: 14.5 }}>Usuarios y permisos</div>
      </ConInfo>

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
                const cuantos = CLAVES.filter((c) => permisos[c]).length;
                const estaAbierto = abierto === p.id;
                const esTitular = rol === "titular";
                return (
                  <div key={p.id} className="list-item">
                    <div
                      className="list-item-top"
                      onClick={esTitular ? undefined : () => setAbierto(estaAbierto ? null : p.id)}
                      style={{ cursor: esTitular ? "default" : "pointer" }}
                    >
                      <span className="list-item-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Link
                          href={`/admin/usuarios/${p.id}`}
                          className="breadcrumb-crumb"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.full_name}
                        </Link>
                        {p.id === miId && <span className="tag-tu">Tú</span>}
                      </span>
                      <span className="hint-text" style={{ margin: 0, whiteSpace: "nowrap" }}>
                        {esTitular
                          ? "Acceso a todo"
                          : deRol
                          ? `Rol: ${deRol.nombre}`
                          : cuantos === 0
                          ? "Sin permisos"
                          : `${cuantos} permiso${cuantos === 1 ? "" : "s"}`}
                        {!esTitular && <span style={{ marginLeft: 6 }}>{estaAbierto ? "▴" : "▾"}</span>}
                      </span>
                    </div>

                    {estaAbierto && !esTitular && (
                      <div style={{ marginTop: 10 }}>
                        <label style={{ marginTop: 0 }}>Rol</label>
                        <select
                          value={rol}
                          disabled={loadingId === p.id}
                          onChange={(e) => cambiarRol(p, e.target.value)}
                        >
                          <option value="usuario">Usuario (permisos sueltos)</option>
                          <option value="admin">Administrador</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>

                        {deRol ? (
                          <div className="hint-text" style={{ marginTop: 8 }}>
                            Sus accesos los manda el rol <b>{deRol.nombre}</b>
                            {deRol.inicio === "llenados" ? " (Inicio: solo llenados)" : ""}
                            {deRol.inicio === "equipos" ? " (Inicio: Equipos, para rol técnico)" : ""}. Para cambiarlos, edita el
                            rol en <b>Roles</b> (cambia para todos los que lo tienen) o pásalo a Usuario.
                            {/* V34: roles vinculados (maqueta-v34-4.html). */}
                            {deRol.vinculado_id ? " Rol vinculado: también tiene su rol de App Equipos de clientes." : ""}
                          </div>
                        ) : null}
                        {(
                          SECCIONES.map((sec) => (
                            <div key={sec.titulo}>
                              <div className="section-title" style={{ marginTop: 16, marginBottom: 2, fontSize: 14 }}>
                                {sec.titulo}
                              </div>
                              {sec.items.map((it) => {
                                const activo = !!permisos[it.clave];
                                return (
                                  <label
                                    key={it.clave}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      gap: 10,
                                      padding: "9px 0",
                                      paddingLeft: it.sub_de ? 22 : 0,
                                      borderBottom: "1px solid var(--borde)",
                                      margin: 0,
                                      fontWeight: 500,
                                      fontSize: 13.5,
                                      color: "var(--texto)",
                                      cursor: "pointer",
                                      background: it.destacado && activo ? "var(--acento-fondo)" : undefined,
                                    }}
                                  >
                                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <it.Icono size={15} style={{ color: "var(--texto-suave)", flexShrink: 0 }} />
                                      <span>
                                        {it.label}
                                        {it.sub && (
                                          <span className="hint-text" style={{ display: "block", marginTop: 1 }}>
                                            {it.sub}
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={activo}
                                      disabled={!!deRol || loadingId === p.id}
                                      onChange={(e) => togglePermiso(p, it.clave, e.target.checked)}
                                      style={{ width: 18, height: 18, flexShrink: 0 }}
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          ))
                        )}
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
