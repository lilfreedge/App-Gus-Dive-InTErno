import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import LlenadosList from "@/components/LlenadosList";

export default async function TanquesPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);
  const puedeRegistrar = tieneAcceso(profile, "registrar_llenado");
  const puedeFacturar = tieneAcceso(profile, "facturacion");

  const { data: llenados } = await supabase.from("llenados_con_nombre").select("*").limit(200);

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
