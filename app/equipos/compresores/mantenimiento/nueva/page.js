import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoMantenimientoCompresorForm from "./form-client";

export default async function NuevoMantenimientoCompresorPage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "compresores")) {
    redirect("/equipos/compresores");
  }

  const { data: compresores } = await supabase
    .from("compresores")
    .select("id, codigo, descripcion")
    .eq("activo", true)
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/compresores" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Compresores", href: "/equipos/compresores" },
            { label: "Nuevo mantenimiento" },
          ]}
        />
        <h1 className="page-title">Registrar mantenimiento</h1>
        <p className="page-subtitle">Mantenimiento hecho a un compresor.</p>

        <NuevoMantenimientoCompresorForm
          userId={user.id}
          nombreUsuario={profile?.full_name || user.email}
          compresores={compresores || []}
          compresorPreseleccionado={searchParams?.compresor || ""}
        />
      </div>
    </div>
  );
}
