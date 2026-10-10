import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevaSolicitudForm from "./form-client";

// "Solicitar códigos a almacén" (V29) -- ver app/solicitudes/page.js.
export default async function NuevaSolicitudPage() {
  const supabase = createClient();
  await requireInterno(supabase, "solicitudes_almacen");

  const [{ data: articulos }, { data: config }] = await Promise.all([
    supabase.from("articulos").select("id, nombre, descripcion").eq("activo", true).order("nombre"),
    supabase.from("app_config").select("solicitudes_correos").maybeSingle(),
  ]);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/solicitudes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "Más", href: "/mas" },
            { label: "Solicitudes al almacén", href: "/solicitudes" },
            { label: "Solicitar códigos" },
          ]}
        />
        <h1 className="page-title">Solicitar códigos a almacén</h1>
        <p className="page-subtitle">Códigos del catálogo que la tienda necesita del almacén.</p>

        <NuevaSolicitudForm
          articulos={articulos || []}
          hayCorreosAlmacen={(config?.solicitudes_correos || []).length > 0}
        />
      </div>
    </div>
  );
}
