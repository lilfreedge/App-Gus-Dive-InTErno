import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, tieneAcceso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import AvisosFijosAdmin from "@/components/AvisosFijosAdmin";
import { datosAdminAvisos } from "@/lib/avisos-fijos-admin";
import { hoyISO } from "@/lib/fechas";

// V51 -- ⚙ › Avisos fijos de App Equipos de clientes (el Titular y los
// administradores). Salen arriba del Inicio de App Equipos de clientes; al
// técnico solo los que lo escogen a él.
export default async function AvisosFijosClientesPage() {
  const supabase = createClient();
  const { profile } = await requireAdmin(supabase);
  if (!tieneAcceso(profile, "equipos_clientes")) redirect("/espacio");
  const d = await datosAdminAvisos(supabase, "clientes");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "App Equipos de clientes", href: "/app-clientes" }, { label: "Avisos fijos" }]} />
        <h1 className="page-title">Avisos fijos</h1>
        <p className="page-subtitle">Salen arriba del Inicio de App Equipos de clientes.</p>
        {d.falta ? (
          <div className="error-box">Para usar los avisos fijos falta correr migration_76.sql en Supabase.</div>
        ) : (
          <AvisosFijosAdmin app="clientes" avisos={d.avisos} leidos={d.leidos} perfiles={d.perfiles} yoNombre={profile?.full_name || ""} hoy={hoyISO()} />
        )}
      </div>
    </div>
  );
}
