import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
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
        <NavArrowsServer />
        <h1 className="page-title">Tanques</h1>

        {puedeRegistrar && (
          <Link href="/tanques/nuevo">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
              + Registrar llenados
            </button>
          </Link>
        )}

        <LlenadosList llenados={llenados} puedeEditar={puedeEditar} puedeFacturar={puedeFacturar} />
      </div>
    </div>
  );
}
