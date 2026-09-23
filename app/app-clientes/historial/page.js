import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialClient from "./historial-client";

// "Listado de órdenes" dejó de ser una sección fija del menú superior
// (23-sep-2026, pedido explícito: "ya se! pon listado de ordenes dentro
// de 'mas'") -- ahora se entra desde el hub "Más", mismo patrón de
// "← Volver" + breadcrumb con la miga "Más" que ya usan sus otras
// páginas (p. ej. Base de datos), en vez de las flechas de navegación
// del menú fijo.
export default async function HistorialOrdenesPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const [{ data: ordenes }, { data: clientes }] = await Promise.all([
    supabase.from("ordenes_equipos_con_nombre").select("*").limit(500),
    supabase.from("clientes_equipos").select("id, nombre").order("nombre"),
  ]);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/mas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Listado de órdenes" },
          ]}
        />
        <h1 className="page-title">Listado de órdenes</h1>

        <HistorialClient ordenes={ordenes || []} clientes={clientes || []} />
      </div>
    </div>
  );
}
