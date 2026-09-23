import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import NavArrowsClientesServer from "@/components/NavArrowsClientesServer";
import RegistroClient from "./registro-client";

// "Registro" (23-sep-2026, feedback en vivo tras probar v24): dejó de ser
// directo al formulario "Registrar orden" -- ahora es la cola de trabajo,
// un listado de TODAS las órdenes abiertas (nunca las Entregado, esas
// solo viven en Historial de órdenes) con pestañas para filtrar entre
// Abiertas / Pendientes por trabajar / Pendientes por entregar, más un
// buscador de cliente. Pedido explícito del usuario.
export default async function RegistroPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  const puedeRegistrar = !!profile?.es_titular || !!profile?.permisos?.equipos_clientes_registrar;

  const { data: ordenes } = await supabase
    .from("ordenes_equipos")
    .select("id, folio, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, fecha, estado")
    .neq("estado", "Entregado")
    .order("fecha");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsClientesServer />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>Registro</h1>
          {puedeRegistrar && (
            <Link href="/app-clientes/ordenes/nueva">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Registrar orden
              </button>
            </Link>
          )}
        </div>

        <RegistroClient ordenes={ordenes || []} />
      </div>
    </div>
  );
}
