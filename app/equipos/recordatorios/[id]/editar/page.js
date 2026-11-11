import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RecordatorioForm from "@/components/RecordatorioForm";
import { requireAdminRecordatorios, datosFormulario } from "@/app/equipos/compresores/recordatorios/datos";

// V63 ("230"): editar un recordatorio (de compresores, tanques, reguladores u otra cosa).
export default async function EditarRecordatorioPage({ params }) {
  const supabase = createClient();
  const { profile } = await requireAdminRecordatorios(supabase);
  const [{ data: r }, { compresores, usuarios }] = await Promise.all([supabase.from("recordatorios_compresores").select("*").eq("id", params.id).maybeSingle(), datosFormulario(supabase)]);
  if (!r) notFound();
  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/recordatorios" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Recordatorios", href: "/equipos/recordatorios" }, { label: r.titulo }]} />
        <h1 className="page-title">Editar recordatorio</h1>
        <RecordatorioForm recordatorio={r} compresores={compresores} usuarios={usuarios} miNombre={profile?.full_name || ""} sinColumnas={!("que" in r)} />
      </div>
    </div>
  );
}
