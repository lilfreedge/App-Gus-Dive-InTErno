import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialClient from "./historial-client";

// "Listado de órdenes" dejó de ser una sección fija del menú superior
// (23-sep-2026, pedido explícito: "ya se! pon listado de ordenes dentro
// de 'mas'") -- ahora se entra desde el hub "Más", mismo patrón de
// "← Volver" + breadcrumb con la miga "Más" que ya usan sus otras
// páginas (p. ej. Base de datos), en vez de las flechas de navegación
// del menú fijo.
//
// Permiso granular propio (28-sep-2026, pedido explícito: mismo pedido
// que "Listado de clientes", ver Permisos > General) -- antes cualquiera
// con acceso base a la app la veía; ahora hace falta también
// equipos_clientes_listado_ordenes (Titular siempre la ve). La tarjeta
// en Más también se oculta sola sin el permiso (mas/page.js).
export default async function HistorialOrdenesPage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_listado_ordenes", "/app-clientes/mas");

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
            { label: "Historial de órdenes" },
          ]}
        />
        {/* V30: "Listado de órdenes" -> "Historial de órdenes" (pedido explícito). */}
        <h1 className="page-title">Historial de órdenes</h1>

        <HistorialClient ordenes={ordenes || []} clientes={clientes || []} />
      </div>
    </div>
  );
}
