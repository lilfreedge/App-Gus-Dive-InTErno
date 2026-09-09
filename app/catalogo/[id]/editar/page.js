import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import EditarCodigoForm from "./form-client";

// Editar un código del catálogo: solo Titular y Administrador (igual que
// "Ver movimientos"), gateado también aquí en el servidor.
export default async function EditarCodigoPage({ params }) {
  const supabase = createClient();
  await requireAdmin(supabase);

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
