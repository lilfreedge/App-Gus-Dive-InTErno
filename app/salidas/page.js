import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import SalidasList from "@/components/SalidasList";

export default async function SalidasPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  const { data: salidas } = await supabase
    .from("salidas_con_nombre")
    .select("*")
    .limit(200);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Salidas</h1>

        <Link href="/salidas/nueva">
          <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
            + Registrar salida
          </button>
        </Link>

        <div className="card">
          <SalidasList salidas={salidas} puedeEditar={puedeEditar} />
        </div>
      </div>
    </div>
  );
}
