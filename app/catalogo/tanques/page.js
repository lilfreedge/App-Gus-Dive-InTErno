import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import CatalogoTabs from "@/components/CatalogoTabs";
import Breadcrumb from "@/components/Breadcrumb";
import ListaTanques from "./lista-client";

// Catálogo de tanques de alquiler (V5) — el registro de tanques
// rentables (código/descripción/activo). No confundir con la sección
// "Tanques" en /tanques, que es la bitácora de llenados de tanque.
export default async function CatalogoTanquesPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeAdministrar = tieneAcceso(profile, "catalogo_tanque");
  const esTitular = !!profile?.es_titular;

  const { data: tanques } = await supabase
    .from("tanques_alquiler")
    .select("*")
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <Breadcrumb items={[{ label: "Códigos", href: "/catalogo" }, { label: "Tanques de alquiler" }]} />
        <CatalogoTabs activo="/catalogo/tanques" />

        {puedeAdministrar && (
          <Link href="/catalogo/tanques/nuevo">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
              + Agregar
            </button>
          </Link>
        )}

        <div className="card">
          <ListaTanques
            tanques={tanques || []}
            puedeAdministrar={puedeAdministrar}
            esTitular={esTitular}
          />
        </div>
      </div>
    </div>
  );
}
