import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RecordatorioForm from "@/components/RecordatorioForm";
import { requireAdminRecordatorios, datosFormulario } from "../../datos";

export default async function EditarRecordatorioPage({ params }) {
  const supabase = createClient();
  const { profile } = await requireAdminRecordatorios(supabase);
  const { data: recordatorio } = await supabase
    .from("recordatorios_compresores")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!recordatorio) notFound();
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
            { label: "Editar" },
          ]}
        />
        <h1 className="page-title">Editar recordatorio</h1>
        <RecordatorioForm
          recordatorio={recordatorio}
          compresores={compresores}
          usuarios={usuarios}
          miNombre={profile?.full_name || ""}
        />
      </div>
    </div>
  );
}
