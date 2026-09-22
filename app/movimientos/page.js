import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import MovimientosList from "@/components/MovimientosList";

// "Movimientos" combina salidas, llenados de tanques, inspecciones
// visuales y mantenimientos de reguladores en una sola lista (con filtro
// por tipo), gateada por el permiso granular "movimientos" — mismo
// patrón que Reportes/Catálogo/Historial (ahora agrupados en "Más").
export default async function MovimientosPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "movimientos");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);
  // Acceso directo a Reportes desde aquí, ya que los reportes se arman
  // justamente a partir de estos mismos movimientos.
  const puedeCrearReporte = tieneAcceso(profile, "reportes");

  const [
    { data: salidas },
    { data: llenados },
    { data: inspecciones },
    { data: mantenimientos },
  ] = await Promise.all([
    supabase.from("salidas_con_nombre").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("llenados_con_nombre").select("*").order("created_at", { ascending: false }).limit(200),
    // inspecciones_con_nombre/mantenimientos_con_nombre pueden no existir
    // todavía si migration_06.sql no se ha corrido — no se deja tumbar la
    // pantalla completa por eso.
    supabase.from("inspecciones_con_nombre").select("*").order("created_at", { ascending: false }).limit(200)
      .then((r) => (r.error ? { data: [] } : r))
      .catch(() => ({ data: [] })),
    supabase.from("mantenimientos_con_nombre").select("*").order("created_at", { ascending: false }).limit(200)
      .then((r) => (r.error ? { data: [] } : r))
      .catch(() => ({ data: [] })),
  ]);

  const movimientos = [
    ...(salidas || []).map((s) => ({ ...s, tipo: "salida" })),
    ...(llenados || []).map((t) => ({ ...t, tipo: "llenado" })),
    ...(inspecciones || []).map((i) => ({ ...i, tipo: "inspeccion" })),
    ...(mantenimientos || []).map((m) => ({ ...m, tipo: "mantenimiento" })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Movimientos</h1>

        {puedeCrearReporte && (
          <Link href="/reportes">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
              Crear reporte
            </button>
          </Link>
        )}

        <MovimientosList movimientos={movimientos} puedeEditar={puedeEditar} />
      </div>
    </div>
  );
}
