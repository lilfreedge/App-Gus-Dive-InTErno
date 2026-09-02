import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import EditarSalidaForm from "./form-client";

export default async function EditarSalidaPage({ params }) {
  const supabase = createClient();
  await requireAdmin(supabase);

  const [{ data: registro }, { data: articulos }, { data: admins }] = await Promise.all([
    supabase.from("salidas").select("*").eq("id", params.id).single(),
    supabase.from("articulos").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("profiles").select("id, full_name").eq("is_admin", true).order("full_name"),
  ]);

  if (!registro) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/salidas" className="back-link">
          ← Volver al historial
        </Link>
        <h1 className="page-title">Editar salida</h1>
        <p className="page-subtitle">El cambio queda anotado en el historial de cambios.</p>

        <EditarSalidaForm registro={registro} articulos={articulos || []} admins={admins || []} />
      </div>
    </div>
  );
}
