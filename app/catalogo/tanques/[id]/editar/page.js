import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import EditarTanqueForm from "./form-client";

// Editar un tanque de alquiler del catálogo. Gateado por el permiso
// granular catalogo_tanque (el Titular siempre tiene acceso).
export default async function EditarTanquePage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "catalogo_tanque");

  const { data: tanque } = await supabase
    .from("tanques_alquiler")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!tanque) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/catalogo/tanques" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Catálogo", href: "/catalogo" },
            { label: "Tanques de alquiler", href: "/catalogo/tanques" },
            { label: "Editar tanque" },
          ]}
        />
        <h1 className="page-title">Editar tanque</h1>

        <EditarTanqueForm tanque={tanque} />
      </div>
    </div>
  );
}
