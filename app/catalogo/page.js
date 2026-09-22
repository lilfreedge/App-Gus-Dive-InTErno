import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import Breadcrumb from "@/components/Breadcrumb";
import CatalogoTabs from "@/components/CatalogoTabs";
import ListaArticulos from "./lista-client";

export default async function CatalogoPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  // Editar/agregar: permiso granular catalogo_codigo (el Titular siempre
  // tiene acceso vía tieneAcceso). Inactivar: solo Titular (ver
  // lista-client.js, más abajo se pasa esTitular aparte).
  const puedeAdministrar = tieneAcceso(profile, "catalogo_codigo");
  const esTitular = !!profile?.es_titular;

  const { data: articulos } = await supabase.from("articulos").select("*").order("nombre");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Catálogo" }]} />
        <CatalogoTabs activo="/catalogo" />

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
