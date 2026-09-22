import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import CatalogoTabs from "@/components/CatalogoTabs";
import Breadcrumb from "@/components/Breadcrumb";
import ListaReguladores from "./lista-client";

// Catálogo de reguladores de alquiler (V5). Mismo patrón que
// app/catalogo/page.js (Códigos): permiso catalogo_regulador agrega/edita,
// solo Titular inactiva/reactiva.
export default async function CatalogoReguladoresPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeAdministrar = tieneAcceso(profile, "catalogo_regulador");
  const esTitular = !!profile?.es_titular;

  const { data: reguladores } = await supabase
    .from("reguladores_alquiler")
    .select("*")
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <Breadcrumb items={[{ label: "Catálogo", href: "/catalogo" }, { label: "Reguladores de alquiler" }]} />
        <CatalogoTabs activo="/catalogo/reguladores" />

        {puedeAdministrar && (
          <Link href="/catalogo/reguladores/nuevo">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
              + Agregar
            </button>
          </Link>
        )}

        <div className="card">
          <ListaReguladores
            reguladores={reguladores || []}
            puedeAdministrar={puedeAdministrar}
            esTitular={esTitular}
          />
        </div>
      </div>
    </div>
  );
}
