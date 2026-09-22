import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoTanqueForm from "./form-client";

// Agregar un tanque de alquiler al catálogo. Gateado por el permiso
// granular catalogo_tanque (el Titular siempre tiene acceso).
export default async function NuevoTanquePage() {
  const supabase = createClient();
  await requirePermiso(supabase, "catalogo_tanque");

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
            { label: "Nuevo tanque" },
          ]}
        />
        <h1 className="page-title">Nuevo tanque</h1>

        <NuevoTanqueForm />
      </div>
    </div>
  );
}
