import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoCompresorForm from "./form-client";

// Agregar un compresor al catálogo. Gateado por el permiso "compresores"
// (el mismo que gatea toda la sección -- no hay un permiso separado para
// el catálogo, a diferencia de reguladores/tanques).
export default async function NuevoCompresorPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "compresores");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/compresores" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Compresores", href: "/equipos/compresores" },
            { label: "Nuevo compresor" },
          ]}
        />
        <h1 className="page-title">Nuevo compresor</h1>

        <NuevoCompresorForm />
      </div>
    </div>
  );
}
