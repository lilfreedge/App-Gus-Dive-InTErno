import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
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
  await requirePermiso(supabase, "equipos_clientes");

  const { data: servicios } = await supabase
    .from("servicios_catalogo")
    .select("id, nombre, activo")
    .order("nombre");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/mas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Catálogo" },
          ]}
        />
        <h1 className="page-title">Catálogo de servicios</h1>
        <p className="page-subtitle">Estos son los servicios que aparecen para elegir en &quot;Registrar orden&quot;.</p>

        <div style={{ marginBottom: 16 }}>
          <Link href="/app-clientes/catalogo/nuevo">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
              + Agregar servicio
            </button>
          </Link>
        </div>

        <div className="card">
          {!servicios || servicios.length === 0 ? (
            <div className="empty">Todavía no hay servicios en el catálogo.</div>
          ) : (
            servicios.map((s) => (
              <Link
                key={s.id}
                href={`/app-clientes/catalogo/${s.id}/editar`}
                className="list-item"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <div className="list-item-top">
                  <span className="list-item-title">{s.nombre}</span>
                  {!s.activo && <span className="badge">Inactivo</span>}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
