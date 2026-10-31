import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoMantenimientoForm from "./form-client";

export default async function NuevoMantenimientoPage({ searchParams }) {
  const supabase = createClient();
  await requireInterno(supabase, "registrar_mantenimiento");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "mantenimiento_registrar")) {
    redirect("/equipos/mantenimiento-reguladores");
  }

  const { data: reguladores } = await supabase
    .from("reguladores_alquiler")
    // V50: con sus componentes (1ra etapa, 2da etapa, etc.) para el mantenimiento.
    .select("*")
    .eq("activo", true)
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/mantenimiento-reguladores" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Mantenimiento de reguladores", href: "/equipos/mantenimiento-reguladores" },
            { label: "Nuevo mantenimiento" },
          ]}
        />
        <h1 className="page-title">Registrar mantenimiento</h1>
        <p className="page-subtitle">Mantenimiento hecho a un regulador.</p>

        <NuevoMantenimientoForm
          userId={user.id}
          nombreUsuario={profile?.full_name || user.email}
          reguladores={reguladores || []}
          inicial={(reguladores || []).some((r) => r.id === searchParams?.regulador) ? searchParams.regulador : ""}
        />
      </div>
    </div>
  );
}
