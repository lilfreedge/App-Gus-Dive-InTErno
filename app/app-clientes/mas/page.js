import Link from "next/link";
import { requirePermiso } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import { IconCatalog } from "@/components/icons";

// Hub "Más" de App Clientes (23-sep-2026, pedido explícito: "agregar un
// botón de 'mas' al lado de historial de ordenes... igual como que en
// app interno"). Mismo patrón que /mas de App Interno (tarjetas con
// ícono + descripción, una por sección) -- por ahora solo trae
// Catálogo (de servicios: "lista de servicios, ya luego vemos que mas
// agregar"), pero queda listo para sumar más opciones sin rediseñar.
const OPCIONES = [
  {
    href: "/app-clientes/catalogo",
    titulo: "Catálogo",
    descripcion: "Servicios que se pueden elegir en Registrar orden.",
    Icono: IconCatalog,
  },
];

export default async function MasClientesPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <h1 className="page-title">Más</h1>

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
