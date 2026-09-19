import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NuevoMantenimientoForm from "./form-client";

export default async function NuevoMantenimientoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "registrar_mantenimiento")) {
    redirect("/equipos/mantenimiento-reguladores");
  }

  const { data: reguladores } = await supabase
    .from("reguladores_alquiler")
    .select("id, codigo, descripcion")
    .eq("activo", true)
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/mantenimiento-reguladores" className="back-link">
          ← Regresar
        </Link>
        <h1 className="page-title">Registrar mantenimiento</h1>
        <p className="page-subtitle">Mantenimiento hecho a un regulador.</p>

        <NuevoMantenimientoForm
          userId={user.id}
          nombreUsuario={profile?.full_name || user.email}
          reguladores={reguladores || []}
        />
      </div>
    </div>
  );
}
