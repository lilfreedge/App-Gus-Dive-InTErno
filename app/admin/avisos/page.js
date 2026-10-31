import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, tieneAcceso } from "@/lib/roles";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import AvisosFijosAdmin from "@/components/AvisosFijosAdmin";
import { datosAdminAvisos } from "@/lib/avisos-fijos-admin";
import { hoyISO } from "@/lib/fechas";

// V51 -- ⚙ › Avisos fijos de App Interno (el Titular y los administradores,
// "9. yo y administradores"). Salen arriba del Inicio de App Interno.
export default async function AvisosFijosInternoPage() {
  const supabase = createClient();
  const { profile } = await requireAdmin(supabase);
  if (!tieneAcceso(profile, "acceso_app_interno")) redirect("/espacio");
  const d = await datosAdminAvisos(supabase, "interno");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "App Interno", href: "/dashboard" }, { label: "Avisos fijos" }]} />
        <h1 className="page-title">Avisos fijos</h1>
        <p className="page-subtitle">Salen arriba del Inicio de App Interno.</p>
        {d.falta ? (
          <div className="error-box">Para usar los avisos fijos falta correr migration_76.sql en Supabase.</div>
        ) : (
          <AvisosFijosAdmin app="interno" avisos={d.avisos} leidos={d.leidos} perfiles={d.perfiles} yoNombre={profile?.full_name || ""} hoy={hoyISO()} />
        )}
      </div>
    </div>
  );
}
