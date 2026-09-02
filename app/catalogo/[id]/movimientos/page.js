import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import SalidasList from "@/components/SalidasList";

// Solo administradores y Titular: hiding the button in the catalog list is
// not enough, this route is gated server-side too.
export default async function MovimientosArticuloPage({ params }) {
  const supabase = createClient();
  await requireAdmin(supabase);

  const { data: articulo } = await supabase
    .from("articulos")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!articulo) notFound();

  const { data: salidas } = await supabase
    .from("salidas_con_nombre")
    .select("*")
    .eq("articulo_id", params.id)
    .limit(200);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/catalogo" className="back-link">
          ← Volver al catálogo
        </Link>
        <h1 className="page-title">Movimientos de {articulo.nombre}</h1>
        {articulo.descripcion && <p className="page-subtitle">{articulo.descripcion}</p>}

        <div className="card">
          <SalidasList salidas={salidas} puedeEditar />
        </div>
      </div>
    </div>
  );
}
