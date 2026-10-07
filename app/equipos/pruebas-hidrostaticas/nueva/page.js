import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevaPruebaHidrostaticaForm from "./form-client";

// Registrar prueba(s) hidrostática(s) -- ver app/equipos/pruebas-hidrostaticas/page.js.
export default async function NuevaPruebaHidrostaticaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "registrar_hidrostatica")) {
    redirect("/equipos/pruebas-hidrostaticas");
  }

  const { data: tanques } = await supabase
    .from("tanques_alquiler")
    .select("id, codigo, descripcion")
    .eq("activo", true)
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/pruebas-hidrostaticas" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Pruebas hidrostáticas", href: "/equipos/pruebas-hidrostaticas" },
            { label: "Nueva prueba" },
          ]}
        />
        <h1 className="page-title">Registrar prueba hidrostática</h1>
        <p className="page-subtitle">
          Resultado de la prueba hidrostática de un tanque. La próxima prueba (cada 5 años) se calcula sola desde la
          fecha de la prueba.
        </p>

        <NuevaPruebaHidrostaticaForm
          userId={user.id}
          nombreUsuario={profile?.full_name || user.email}
          tanques={tanques || []}
        />
      </div>
    </div>
  );
}
