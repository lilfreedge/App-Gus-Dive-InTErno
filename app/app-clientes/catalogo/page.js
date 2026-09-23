import Link from "next/link";
import { requirePermiso } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { IconCatalog, IconPackage } from "@/components/icons";

// Hub "Base de datos" de App Clientes (23-sep-2026, renombrado de
// "Catálogo" -- pedido explícito -- y convertido en hub con dos
// secciones: Servicios (lo que ya existía) y Piezas y repuestos
// (nuevo, "me parece bien que agregues lo de las piezas. luego vamos
// viendo como se le da forma"). Mismo patrón de tarjetas que /mas.
const OPCIONES = [
  {
    href: "/app-clientes/catalogo/servicios",
    titulo: "Servicios",
    descripcion: "Servicios que se pueden elegir en Registrar orden.",
    Icono: IconCatalog,
  },
  {
    href: "/app-clientes/catalogo/piezas",
    titulo: "Piezas y repuestos",
    descripcion: "Piezas y repuestos usados al dar servicio a un equipo.",
    Icono: IconPackage,
  },
];

export default async function BaseDeDatosPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

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
            { label: "Base de datos" },
          ]}
        />
        <h1 className="page-title">Base de datos</h1>

        {OPCIONES.map((o) => (
          <Link key={o.href} href={o.href} className="card hub-link-card">
            <div className="hub-link-card-inner">
              <div className="hub-link-icon">
                <o.Icono size={20} />
              </div>
              <div>
                <div className="hub-link-title">{o.titulo}</div>
                <div className="hub-link-desc">{o.descripcion}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
