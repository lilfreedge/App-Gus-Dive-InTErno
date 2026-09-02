import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import NuevoArticuloForm from "./form-client";
import ListaArticulos from "./lista-client";

export default async function CatalogoPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeAdministrar = !!(profile?.is_admin || profile?.es_titular);

  const { data: articulos } = await supabase.from("articulos").select("*").order("nombre");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Catálogo</h1>

        {puedeAdministrar && <NuevoArticuloForm />}

        <div className="card">
          <ListaArticulos articulos={articulos || []} puedeAdministrar={puedeAdministrar} />
        </div>
      </div>
    </div>
  );
}
