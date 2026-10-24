import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import SalidasList from "@/components/SalidasList";
import BuscadorLista from "@/components/BuscadorLista";
import { todasLasFilas } from "@/lib/todas-las-filas";

export default async function SalidasPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "registrar_salida");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  // V35 (buscador en los historiales): todas, no solo las últimas 200.
  const salidas = await todasLasFilas(supabase, "salidas_con_nombre", (q) =>
    q.select("*").order("created_at", { ascending: false }).order("id")
  );

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

        <BuscadorLista placeholder="Buscar código, artículo, persona o nota...">
          <div className="card">
            <SalidasList salidas={salidas} puedeEditar={puedeEditar} />
          </div>
        </BuscadorLista>
      </div>
    </div>
  );
}
