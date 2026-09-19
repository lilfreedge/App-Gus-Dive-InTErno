import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import EditarMantenimientoForm from "./form-client";

export default async function EditarMantenimientoPage({ params }) {
  const supabase = createClient();
  await requireAdmin(supabase);

  const { data: registro } = await supabase
    .from("mantenimientos_reguladores")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!registro) notFound();

  const { data: reguladores } = await supabase
    .from("reguladores_alquiler")
    .select("id, codigo, descripcion")
    .eq("activo", true)
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/mantenimiento-reguladores" className="back-link">
          ← Volver a Mantenimiento de reguladores
        </Link>
        <h1 className="page-title">Editar mantenimiento</h1>
        <p className="page-subtitle">El cambio queda anotado en el historial de cambios.</p>

        <EditarMantenimientoForm registro={registro} reguladores={reguladores || []} />
      </div>
    </div>
  );
}
