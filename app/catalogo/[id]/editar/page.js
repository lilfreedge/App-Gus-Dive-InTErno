import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import EditarCodigoForm from "./form-client";

// Editar un código del catálogo: gateado por el permiso granular
// catalogo_codigo (el Titular siempre tiene acceso), también aquí en
// el servidor.
export default async function EditarCodigoPage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "catalogo_codigo");

  const { data: articulo } = await supabase
    .from("articulos")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!articulo) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/catalogo" className="back-link">
          ← Regresar
        </Link>
        <h1 className="page-title">Editar código</h1>

        <EditarCodigoForm articulo={articulo} />
      </div>
    </div>
  );
}
