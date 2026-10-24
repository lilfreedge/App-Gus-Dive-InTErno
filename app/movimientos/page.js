import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import MovimientosList from "@/components/MovimientosList";
import { todasLasFilas } from "@/lib/todas-las-filas";

// "Movimientos" combina salidas, llenados de tanques, inspecciones
// visuales y mantenimientos de reguladores en una sola lista (con filtro
// por tipo), gateada por el permiso granular "movimientos" — mismo
// patrón que Reportes/Catálogo/Historial (ahora agrupados en "Más").
export default async function MovimientosPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "movimientos");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);
  // Acceso directo a Reportes desde aquí, ya que los reportes se arman
  // justamente a partir de estos mismos movimientos.
  const puedeCrearReporte = tieneAcceso(profile, "reportes");

  // V35 (buscador en los historiales): todos los registros, no solo los
  // últimos 200 de cada tipo. Si una consulta falla (por ejemplo, una vista
  // que todavía no existe), esa lista queda vacía y la pantalla sigue.
  const todos = (vista) =>
    todasLasFilas(supabase, vista, (q) => q.select("*").order("created_at", { ascending: false }).order("id")).catch(() => []);
  const [salidas, llenados, inspecciones, mantenimientos] = await Promise.all([
    todos("salidas_con_nombre"),
    todos("llenados_con_nombre"),
    todos("inspecciones_con_nombre"),
    todos("mantenimientos_con_nombre"),
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
