import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";

// Catálogo de piezas/repuestos de App Clientes (23-sep-2026, pedido
// explícito, dentro de "Base de datos"). Mismo patrón que el catálogo
// de servicios: por ahora simple (nombre + activo), se le da más forma
// después. Sin borrado -- una pieza que ya no se usa se desactiva, no
// se elimina.
export default async function CatalogoPiezasPage() {
  const supabase = createClient();
  // Ver "Base de datos" pasó a requerir el permiso granular
  // equipos_clientes_catalogo (pedido explícito, 23-sep-2026: "ponme en
  // administracion para dar acceso a 'base de dato' quien no lo tenga el
  // acceso pues que no le salga") -- antes estaba abierto a cualquiera
  // con acceso a la app, solo el botón de agregar estaba gateado.
  const { profile } = await requirePermisoClientes(supabase, "equipos_clientes_catalogo");
  const puedeEditarCatalogo = !!profile?.es_titular || !!profile?.permisos?.equipos_clientes_catalogo;

  const { data: piezas } = await supabase
    .from("piezas_catalogo")
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
            { label: "Piezas" },
          ]}
        />
        <h1 className="page-title">Catálogo de piezas y repuestos</h1>
        <p className="page-subtitle">Piezas y repuestos usados al dar servicio a un equipo.</p>

        {puedeEditarCatalogo && (
          <div style={{ marginBottom: 16 }}>
            <Link href="/app-clientes/catalogo/piezas/nuevo">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Agregar pieza
              </button>
            </Link>
          </div>
        )}

        <div className="card">
          {!piezas || piezas.length === 0 ? (
            <div className="empty">Todavía no hay piezas en el catálogo.</div>
          ) : (
            piezas.map((p) => {
              const fila = (
                <div className="list-item-top">
                  <span className="list-item-title">{p.nombre}</span>
                  {!p.activo && <span className="badge">Inactivo</span>}
                </div>
              );
              return puedeEditarCatalogo ? (
                <Link
                  key={p.id}
                  href={`/app-clientes/catalogo/piezas/${p.id}/editar`}
                  className="list-item"
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                >
                  {fila}
                </Link>
              ) : (
                <div key={p.id} className="list-item">
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
