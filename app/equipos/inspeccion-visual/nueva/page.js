import Link from "next/link";
import { codigosAlquilados, sinAlquilados } from "@/lib/alquilados";
import AvisoAlquilados from "@/components/AvisoAlquilados";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevaInspeccionForm from "./form-client";

export default async function NuevaInspeccionPage({ searchParams }) {
  const supabase = createClient();
  await requireInterno(supabase, "registrar_inspeccion");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "inspeccion_registrar")) {
    redirect("/equipos/inspeccion-visual");
  }

  const { data: tanques } = await supabase
    .from("tanques_alquiler")
    .select("id, codigo, descripcion")
    .eq("activo", true)
    .order("codigo");
  const alq = sinAlquilados(tanques, await codigosAlquilados(supabase));

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

        <AvisoAlquilados codigos={alq.fuera} />
        <NuevaInspeccionForm
          userId={user.id}
          nombreUsuario={profile?.full_name || user.email}
          tanques={alq.libres}
          inicial={alq.libres.some((t) => t.id === searchParams?.tanque) ? searchParams.tanque : ""}
        />
      </div>
    </div>
  );
}
