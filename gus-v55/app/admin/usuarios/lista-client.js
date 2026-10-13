"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  proximos_vencimientos: false,
  catalogo_codigo: false,
  catalogo_regulador: false,
  catalogo_tanque: false,
  compresores: false,
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
      { clave: "registrar_inspeccion", label: "Inspección visual", Icono: IconEye },
      { clave: "registrar_hidrostatica", label: "Pruebas hidrostáticas", Icono: IconGauge },
      { clave: "registrar_mantenimiento", label: "Mantenimiento de reguladores", Icono: IconRegulator },
      { clave: "compresores", label: "Compresores", Icono: IconCompressor },
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
      { clave: "historial", label: "Historial de anulaciones y ediciones", Icono: IconHistory },
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

function rolDe(p) {
  if (p.es_titular) return "titular";
  if (p.permisos?.rol_operativo) return "operativo";
  if (p.is_admin) return "admin";
  return "usuario";
}

const ROL_ETIQUETA = { titular: "Titular", admin: "Administrador", usuario: "Usuario", operativo: "Operativo" };
const GRUPOS_ROL = [
  { rol: "titular", titulo: "Titular" },
  { rol: "admin", titulo: "Administradores" },
  { rol: "usuario", titulo: "Usuarios" },
  { rol: "operativo", titulo: "Operativos" },
];

export default function ListaUsuarios({ perfiles, miId }) {
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

  // Rol: Usuario / Administrador / Operativo (V30). Operativo no es
  // Administrador; además se le activan "Llenados de tanque" (lo que la
  // base de datos exige para guardar un llenado) y la entrada a App
  // Interno. Sus otros permisos no se borran -- quedan guardados, sin
  // efecto, por si vuelve a ser Usuario.
  function cambiarRol(perfil, rol) {
    const permisos = permisosDe(perfil);
    if (rol === "operativo") {
      guardar(perfil, {
        is_admin: false,
        permisos: { ...permisos, rol_operativo: true, registrar_llenado: true, acceso_app_interno: true },
      });
    } else {
      guardar(perfil, { is_admin: rol === "admin", permisos: { ...permisos, rol_operativo: false } });
    }
  }

  function togglePermiso(perfil, clave, valor) {
    guardar(perfil, { permisos: { ...permisosDe(perfil), [clave]: valor } });
  }

  return (
    <div>
      {error && <div className="error-box" style={{ marginTop: 0, marginBottom: 12 }}>{error}</div>}
      <p className="hint-text" style={{ marginTop: 0, marginBottom: 12 }}>
        Toca a una persona para ver y cambiar su rol y sus permisos. Los cambios se guardan al momento.
      </p>

      {GRUPOS_ROL.map(({ rol, titulo }) => {
        const gente = perfiles.filter((p) => rolDe(p) === rol);
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
                          : rol === "operativo"
                          ? "Solo llenados"
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
                          <option value="usuario">Usuario</option>
                          <option value="admin">Administrador</option>
                          <option value="operativo">Operativo</option>
                        </select>

                        {rol === "operativo" ? (
                          <div className="hint-text" style={{ marginTop: 8 }}>
                            Operativo: solo registra llenados de tanque, en una sola pantalla (sin menú). Ve el
                            resumen de la semana y los llenados de hoy. Mientras tenga este rol, los demás permisos no
                            aplican.
                          </div>
                        ) : (
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
                                      disabled={loadingId === p.id}
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
      <div className="hint-text" style={{ marginTop: 12 }}>
        La entrada a cada app (App Interno, App Equipos de clientes) se da en <b>Accesos a apps</b>, desde el selector de
        apps.
      </div>
    </div>
  );
}
