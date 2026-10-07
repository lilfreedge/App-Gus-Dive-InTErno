import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import EditarPruebaHidrostaticaForm from "./form-client";

// Editar una prueba hidrostática -- Titular/Administrador, igual que
// Inspección visual. Si se corrige la fecha o el tanque, la base de datos
// recalcula sola la próxima prueba del tanque (migration_53.sql).
export default async function EditarPruebaHidrostaticaPage({ params }) {
  const supabase = createClient();
  await requireAdmin(supabase);

  const { data: registro } = await supabase
    .from("pruebas_hidrostaticas")
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
        <Link href="/equipos/pruebas-hidrostaticas" className="back-link">
          ← Volver a Pruebas hidrostáticas
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Pruebas hidrostáticas", href: "/equipos/pruebas-hidrostaticas" },
            { label: "Editar prueba" },
          ]}
        />
        <h1 className="page-title">Editar prueba hidrostática</h1>
        <p className="page-subtitle">El cambio queda anotado en el historial de cambios.</p>

        <EditarPruebaHidrostaticaForm registro={registro} tanques={tanques || []} />
      </div>
    </div>
  );
}
