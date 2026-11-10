import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RecordatorioForm from "@/components/RecordatorioForm";
import { requireAdminRecordatorios, datosFormulario } from "@/app/equipos/compresores/recordatorios/datos";

// V63 ("230"): nuevo recordatorio en la sección de Equipos.
export default async function NuevoRecordatorioPage() {
  const supabase = createClient();
  const { profile } = await requireAdminRecordatorios(supabase);
  const { compresores, usuarios } = await datosFormulario(supabase);
  const { error } = await supabase.from("recordatorios_compresores").select("que").limit(1);
  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/recordatorios" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Recordatorios", href: "/equipos/recordatorios" }, { label: "Nuevo" }]} />
        <h1 className="page-title">Nuevo recordatorio</h1>
        <RecordatorioForm compresores={compresores} usuarios={usuarios} miNombre={profile?.full_name || ""} sinColumnas={!!error} />
      </div>
    </div>
  );
}
