"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconEdit, IconTank, IconPlus, IconCatalog, IconBook, IconHistory, IconReport, IconRefresh, IconUsers, IconCompressor, IconWrench } from "@/components/icons";

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
  // Item 6 de la ronda de feedback sobre v40 (27-sep-2026, pedido
  // explícito: "permite que el hold se pueda editar, por si algún día es
  // necesario. pon el permiso en administración") -- exclusivo de
  // Administradores, mismo patrón que editar orden/cliente/equipo.
  equipos_clientes_editar_hold: false,
  // "Listado de clientes" y "Listado de órdenes" (28-sep-2026, pedido
  // explícito: "AGREGAR AQUI: Listado de clientes, listado de ordenes")
  // -- antes se veían con solo tener acceso base a la app.
  equipos_clientes_listado_clientes: false,
  equipos_clientes_listado_ordenes: false,
};

// Reorganizado en tablas apiladas por grupo (feedback sobre v40, pedido
// explícito: "pon los accesos más como están en app interno, que se ven
// mejor distribuido" -- fotos de referencia: app/admin/usuarios/
// lista-client.js) -- antes era una sola tabla ancha de 9 columnas que se
// cortaba en pantallas angostas. Mismo patrón que GRUPOS de esa pantalla:
// "General" para accesos de solo consulta/gestión, "Registrar" para
// acciones de creación/actualización. Los íconos se alinearon con los
// que usa App Interno para el mismo concepto (Historial, Reportes,
// Catálogo/Base de datos).
// Reorganizado de nuevo (28-sep-2026, feedback en vivo, item 17: "mover
// Historial de anulaciones y ediciones y Bitácora movimientos en órdenes a
// la seccion de 'administradores'") -- las dos se mudaron de "General" a
// la tabla exclusiva de Administradores (ver COLUMNAS_ADMIN más abajo):
// ambas dejan ver el detalle de ediciones/movimientos de TODAS las
// órdenes y equipos, más sensible que el resto de "General".
const GRUPOS = [
  {
    titulo: "General",
    columnas: [
      { clave: "equipos_clientes_listado_clientes", label: "Listado de clientes", Icono: IconUsers },
      { clave: "equipos_clientes_listado_ordenes", label: "Listado de órdenes", Icono: IconReport },
      { clave: "equipos_clientes_catalogo", label: "Base de datos", Icono: IconCatalog },
      // Etiqueta separada de "Informe de mantenimiento" (feedback en vivo,
      // 29-sep-2026, pedido explícito: "separa los accesos reporte e
      // informe, que esten por separado") -- ya eran 2 permisos distintos
      // (equipos_clientes_reportes / equipos_clientes_informe_mantenimiento,
      // cada uno con su propio checkbox), pero la etiqueta de este primero
      // decía "Reportes e Informes", como si diera acceso a los informes
      // también -- confuso al lado del checkbox de "Informe de
      // mantenimiento", que es el que de verdad controla eso. Ahora dice
      // solo "Reportes".
      { clave: "equipos_clientes_reportes", label: "Reportes", Icono: IconReport },
      { clave: "equipos_clientes_informe_mantenimiento", label: "Informe de mantenimiento", Icono: IconWrench },
    ],
  },
  {
    titulo: "Registrar",
    columnas: [
      { clave: "equipos_clientes_registrar", label: "Registrar orden", Icono: IconEdit },
      { clave: "equipos_clientes_agregar_equipo", label: "Agregar equipo", Icono: IconTank },
      { clave: "equipos_clientes_agregar_cliente", label: "Agregar cliente", Icono: IconPlus },
      { clave: "equipos_clientes_actualizar_estado", label: "Actualizar estado de orden", Icono: IconRefresh },
    ],
  },
];

// Tabla "Administradores" (solo para quienes ya tienen ese rol) --
// acciones más sensibles, que además de venir con el permiso puntual
// requieren que el usuario sea Administrador. "Editar hold" se sumó antes
// (feedback sobre v40); "Historial de anulaciones y ediciones" y
// "Bitácora movimientos en órdenes" se sumaron acá el 28-sep-2026 (item 17,
// ver nota arriba).
const COLUMNAS_ADMIN = [
  { clave: "equipos_clientes_editar_equipo", label: "Editar equipo", Icono: IconEdit },
  { clave: "equipos_clientes_editar_cliente", label: "Editar cliente", Icono: IconUsers },
  { clave: "equipos_clientes_editar_orden", label: "Editar orden", Icono: IconEdit },
  { clave: "equipos_clientes_editar_mantenimiento_compresor", label: "Editar mantenimiento de compresor", Icono: IconCompressor },
  { clave: "equipos_clientes_editar_hold", label: "Editar Hold", Icono: IconBook },
  { clave: "equipos_clientes_historial", label: "Historial de anulaciones y ediciones", Icono: IconHistory },
  { clave: "equipos_clientes_bitacora_movimientos", label: "Bitácora movimientos en órdenes", Icono: IconBook },
];

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
                  if (p.es_titular) {
                    return (
                      <tr key={p.id}>
                        <td>
                          {p.full_name}
                          <span className="role-tag role-tag-titular">Titular</span>
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

                  const permisos = { ...PERMISOS_DEFAULT, ...(p.permisos || {}) };
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

      <div style={{ marginTop: 24 }}>
        <div className="section-title" style={{ marginTop: 0 }}>
          Administradores
        </div>
        {administradores.length === 0 ? (
          <div className="empty">Todavía no hay nadie con el rol Administrador.</div>
        ) : (
          <>
            {/* Las tablas General/Registrar de arriba ya incluyen a los
                Administradores (perfiles.map trae a todos, no solo a
                Usuarios) -- repetirlas acá abajo era mostrar dos veces lo
                mismo (28-sep-2026, pedido explícito: "en administradores,
                quitar lo que ya se repite anteriormente"). Esta sección
                se queda solo con la tabla exclusiva de Administradores
                (Editar equipo/cliente/orden/mantenimiento de compresor/
                Hold) -- acciones que de verdad no existen arriba, porque
                solo un Administrador las puede tener. */}
            <div style={{ marginTop: 10 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="perm-table">
                  <thead>
                    <tr>
                      <th>Administradores</th>
                      {COLUMNAS_ADMIN.map((c) => (
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
                            {p.full_name}
                            {p.id === miId && <span className="tag-tu">Tú</span>}
                          </td>
                          {COLUMNAS_ADMIN.map((c) => (
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
          </>
        )}
      </div>
    </div>
  );
}
