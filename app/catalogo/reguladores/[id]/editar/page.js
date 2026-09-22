import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import EditarReguladorForm from "./form-client";

// Editar un regulador de alquiler del catálogo. Gateado por el permiso
// granular catalogo_regulador (el Titular siempre tiene acceso).
export default async function EditarReguladorPage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "catalogo_regulador");

  const { data: regulador } = await supabase
    .from("reguladores_alquiler")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!regulador) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/catalogo/reguladores/${params.id}`} className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Catálogo", href: "/catalogo" },
            { label: "Reguladores de alquiler", href: "/catalogo/reguladores" },
            { label: "Editar regulador" },
          ]}
        />
        <h1 className="page-title">Editar regulador</h1>

        <EditarReguladorForm regulador={regulador} />
      </div>
    </div>
  );
}
