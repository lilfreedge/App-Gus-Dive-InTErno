import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoMantenimientoCompresorForm from "./form-client";
import { ultimosHorometros } from "@/lib/compresores";

export default async function NuevoMantenimientoCompresorPage({ searchParams }) {
  const supabase = createClient();
  await requireInterno(supabase, "compresores");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await getProfileYUser(supabase);

  // V34: registrar mantenimientos tiene su propio permiso.
  if (!user || !tieneAcceso(profile, "compresor_mantenimiento_registrar")) {
    redirect("/equipos/compresores");
  }

  const { data: compresores } = await supabase
    .from("compresores")
    .select("id, codigo, descripcion")
    .eq("activo", true)
    .order("codigo");

  // V37: sin la llave ANTHROPIC_API_KEY en Vercel no se lee la foto (el
  // número se escribe a mano). Y el último horómetro de cada compresor ("+N h desde el último" y no
  // dejar uno menor).
  const { data: horometros } = await supabase
    .from("mantenimientos_compresores")
    .select("compresor_id, horometro, fecha")
    .order("horometro", { ascending: false })
    .limit(5000);

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
          ultimos={ultimosHorometros(horometros || [])}
          esTitular={!!profile?.es_titular}
          lecturaDisponible={!!process.env.ANTHROPIC_API_KEY}
        />
      </div>
    </div>
  );
}
