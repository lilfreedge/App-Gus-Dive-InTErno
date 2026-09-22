import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoReguladorForm from "./form-client";

// Agregar un regulador de alquiler al catálogo. Gateado por el permiso
// granular catalogo_regulador (el Titular siempre tiene acceso).
export default async function NuevoReguladorPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "catalogo_regulador");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/catalogo/reguladores" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Catálogo", href: "/catalogo" },
            { label: "Reguladores de alquiler", href: "/catalogo/reguladores" },
            { label: "Nuevo regulador" },
          ]}
        />
        <h1 className="page-title">Nuevo regulador</h1>

        <NuevoReguladorForm />
      </div>
    </div>
  );
}
