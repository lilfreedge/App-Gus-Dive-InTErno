import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevaInspeccionForm from "./form-client";

export default async function NuevaInspeccionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "registrar_inspeccion")) {
    redirect("/equipos/inspeccion-visual");
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
        <Link href="/equipos/inspeccion-visual" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Inspección visual", href: "/equipos/inspeccion-visual" },
            { label: "Nueva inspección" },
          ]}
        />
        <h1 className="page-title">Registrar inspección visual</h1>
        <p className="page-subtitle">Resultado de la inspección visual de un tanque.</p>

        <NuevaInspeccionForm
          userId={user.id}
          nombreUsuario={profile?.full_name || user.email}
          tanques={tanques || []}
        />
      </div>
    </div>
  );
}
