import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoCodigoForm from "./form-client";

// Pantalla dedicada para agregar un código al catálogo (V4: antes era un
// formulario inline arriba de la lista). Gateada por el permiso granular
// catalogo_codigo (el Titular siempre tiene acceso).
export default async function NuevoCodigoPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "catalogo_codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/catalogo" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb items={[{ label: "Códigos", href: "/catalogo" }, { label: "Nuevo código" }]} />

        <NuevoCodigoForm />
      </div>
    </div>
  );
}
