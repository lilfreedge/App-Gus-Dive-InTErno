import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import EditarInspeccionForm from "./form-client";

export default async function EditarInspeccionPage({ params }) {
  const supabase = createClient();
  await requireAdmin(supabase);

  const { data: registro } = await supabase
    .from("inspecciones_visuales")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!registro) notFound();

  const { data: tanques } = await supabase
    .from("tanques_alquiler")
    .select("id, codigo, descripcion")
    .eq("activo", true)
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/inspeccion-visual" className="back-link">
          ← Volver a Inspección visual
        </Link>
        <h1 className="page-title">Editar inspección</h1>
        <p className="page-subtitle">El cambio queda anotado en el historial de cambios.</p>

        <EditarInspeccionForm registro={registro} tanques={tanques || []} />
      </div>
    </div>
  );
}
