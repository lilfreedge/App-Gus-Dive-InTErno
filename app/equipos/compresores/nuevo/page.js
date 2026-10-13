import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoCompresorForm from "./form-client";

// Agregar un compresor al catálogo. Gateado por el permiso granular
// "registrar_compresor" (separado de "compresores" que da acceso a la
// sección -- igual que registrar_inspeccion, registrar_llenado, etc.).
export default async function NuevoCompresorPage() {
  const supabase = createClient();
  await requireInterno(supabase, "registrar_compresor");

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
