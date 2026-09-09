import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import ListaArticulos from "./lista-client";

export default async function CatalogoPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  // Editar/agregar: Titular y Administrador. Inactivar: solo Titular
  // (ver lista-client.js, más abajo se pasa esTitular aparte).
  const puedeAdministrar = !!(profile?.is_admin || profile?.es_titular);
  const esTitular = !!profile?.es_titular;

  const { data: articulos } = await supabase.from("articulos").select("*").order("nombre");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Catálogo</h1>

        {puedeAdministrar && (
          <Link href="/catalogo/nuevo">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
              + Agregar
            </button>
          </Link>
        )}

        <div className="card">
          <ListaArticulos
            articulos={articulos || []}
            puedeAdministrar={puedeAdministrar}
            esTitular={esTitular}
          />
        </div>
      </div>
    </div>
  );
}
