import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import EditarSalidaForm from "./form-client";

export default async function EditarSalidaPage({ params }) {
  const supabase = createClient();
  await requireAdmin(supabase);

  const [{ data: registro }, { data: articulos }] = await Promise.all([
    supabase.from("salidas").select("*").eq("id", params.id).single(),
    supabase.from("articulos").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  if (!registro) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/salidas" className="back-link">
          ← Volver a Salidas
        </Link>
        <Breadcrumb items={[{ label: "Salidas", href: "/salidas" }, { label: "Editar salida" }]} />
        <p className="page-subtitle">El cambio queda anotado en el historial de cambios.</p>

        <EditarSalidaForm registro={registro} articulos={articulos || []} />
      </div>
    </div>
  );
}
