import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";

// Catálogo de servicios de App Clientes (23-sep-2026, pedido explícito,
// dentro del nuevo botón "Más"). Reemplaza la lista fija que antes
// estaba en el código de "Registrar orden" -- ahora se puede
// agregar/editar un servicio, o desactivarlo, desde aquí. Un servicio
// desactivado deja de aparecer en el desplegable de "Registrar orden",
// pero las órdenes que ya lo usaron no cambian (que_se_hara guarda el
// texto, no una referencia).
export default async function CatalogoServiciosPage() {
  const supabase = createClient();
  // Ver "Base de datos" pasó a requerir el permiso granular
  // equipos_clientes_catalogo (pedido explícito, 23-sep-2026: "ponme en
  // administracion para dar acceso a 'base de dato' quien no lo tenga el
  // acceso pues que no le salga") -- antes estaba abierto a cualquiera
  // con acceso a la app, solo el botón de agregar estaba gateado.
  const { profile } = await requirePermisoClientes(supabase, "equipos_clientes_catalogo");
  const puedeEditarCatalogo = !!profile?.es_titular || !!profile?.permisos?.equipos_clientes_catalogo;

  const { data: servicios } = await supabase
    .from("servicios_catalogo")
    .select("id, nombre, activo")
    .order("nombre");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/catalogo" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Base de datos", href: "/app-clientes/catalogo" },
            { label: "Servicios" },
          ]}
        />
        <h1 className="page-title">Catálogo de servicios</h1>
        <p className="page-subtitle">Estos son los servicios que aparecen para elegir en &quot;Registrar orden&quot;.</p>

        {puedeEditarCatalogo && (
          <div style={{ marginBottom: 16 }}>
            <Link href="/app-clientes/catalogo/servicios/nuevo">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Agregar servicio
              </button>
            </Link>
          </div>
        )}

        <div className="card">
          {!servicios || servicios.length === 0 ? (
            <div className="empty">Todavía no hay servicios en el catálogo.</div>
          ) : (
            servicios.map((s) => {
              const fila = (
                <div className="list-item-top">
                  <span className="list-item-title">{s.nombre}</span>
                  {!s.activo && <span className="badge">Inactivo</span>}
                </div>
              );
              return puedeEditarCatalogo ? (
                <Link
                  key={s.id}
                  href={`/app-clientes/catalogo/servicios/${s.id}/editar`}
                  className="list-item"
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                >
                  {fila}
                </Link>
              ) : (
                <div key={s.id} className="list-item">
                  {fila}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
