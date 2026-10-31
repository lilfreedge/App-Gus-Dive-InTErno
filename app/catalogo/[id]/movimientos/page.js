import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
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

  // V50: también lo que llegó de este código por Solicitudes al almacén (ya
  // recibido). Solo lo ve quien puede ver Solicitudes al almacén (el Titular
  // siempre); si no, la lista sale como antes.
  const [{ data: salidas }, { data: recibidos }] = await Promise.all([
    supabase.from("salidas_con_nombre").select("*").eq("articulo_id", params.id).limit(200),
    supabase
      .from("solicitudes_almacen_items")
      .select("*, solicitud:solicitudes_almacen(folio, nombre_usuario_snapshot, nota, created_at)")
      .eq("articulo_id", params.id)
      .not("recibido_at", "is", null)
      .order("recibido_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/catalogo" className="back-link">
          ← Volver al catálogo
        </Link>
        <Breadcrumb
          items={[
            { label: "Base de datos", href: "/catalogo" },
            { label: `Movimientos de ${articulo.nombre}` },
          ]}
        />
        <h1 className="page-title">Movimientos de {articulo.nombre}</h1>
        {articulo.descripcion && <p className="page-subtitle">{articulo.descripcion}</p>}

        <div className="card">
          <SalidasList salidas={salidas} puedeEditar recibidos={recibidos || []} />
        </div>
      </div>
    </div>
  );
}
