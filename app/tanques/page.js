import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import LlenadosList from "@/components/LlenadosList";
import { todasLasFilas } from "@/lib/todas-las-filas";

export default async function TanquesPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, ["registrar_llenado", "facturacion"]);
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);
  const puedeRegistrar = tieneAcceso(profile, "registrar_llenado");
  const puedeFacturar = tieneAcceso(profile, "facturacion");

  // V35 (buscador en los historiales): todos, no solo los últimos 200.
  const llenados = await todasLasFilas(supabase, "llenados_con_nombre", (q) =>
    q.select("*").order("created_at", { ascending: false }).order("id")
  );

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Llenados de tanque" }]} />

        <LlenadosList
          llenados={llenados}
          puedeEditar={puedeEditar}
          puedeFacturar={puedeFacturar}
          puedeRegistrar={puedeRegistrar}
        />
      </div>
    </div>
  );
}
