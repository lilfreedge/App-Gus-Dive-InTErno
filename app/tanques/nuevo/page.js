import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoLlenadoForm from "./form-client";

export default async function NuevoLlenadoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "registrar_llenado")) {
    redirect("/tanques");
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/tanques" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Llenados de tanque", href: "/tanques" },
            { label: "Nuevo llenado" },
          ]}
        />
        <h1 className="page-title">Registrar llenados de tanque</h1>
        <p className="page-subtitle">Para llevar el conteo de llenados internos.</p>

        <NuevoLlenadoForm userId={user.id} nombreUsuario={perfil?.full_name || user.email} />
      </div>
    </div>
  );
}
