import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import MovimientosList from "@/components/MovimientosList";

// "Movimientos" combina salidas y llenados de tanques en una sola lista
// (con filtro Salidas/Llenados/Todos), gateada por el permiso granular
// "movimientos" — mismo patrón que Reportes/Catálogo/Historial.
export default async function MovimientosPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "movimientos");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  const [{ data: salidas }, { data: llenados }] = await Promise.all([
    supabase.from("salidas_con_nombre").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("llenados_con_nombre").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  const movimientos = [
    ...(salidas || []).map((s) => ({ ...s, tipo: "salida" })),
    ...(llenados || []).map((t) => ({ ...t, tipo: "llenado" })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Movimientos</h1>

        <MovimientosList movimientos={movimientos} puedeEditar={puedeEditar} />
      </div>
    </div>
  );
}
