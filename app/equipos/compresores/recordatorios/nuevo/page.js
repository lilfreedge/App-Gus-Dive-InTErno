import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RecordatorioForm from "@/components/RecordatorioForm";
import { requireAdminRecordatorios, datosFormulario } from "../datos";

export default async function NuevoRecordatorioPage() {
  const supabase = createClient();
  const { profile } = await requireAdminRecordatorios(supabase);
  const { compresores, usuarios } = await datosFormulario(supabase);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/compresores/recordatorios" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Compresores", href: "/equipos/compresores" },
            { label: "Recordatorios", href: "/equipos/compresores/recordatorios" },
            { label: "Nuevo" },
          ]}
        />
        <h1 className="page-title">Nuevo recordatorio</h1>
        <RecordatorioForm compresores={compresores} usuarios={usuarios} miNombre={profile?.full_name || ""} />
      </div>
    </div>
  );
}
