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
  // V100 ("40. sí"): también las pruebas hidrostáticas (envío y regreso), las
  // solicitudes al almacén (las pedidas; las recibidas ya salían) y los
  // recordatorios hechos, igual que en la Actividad reciente del Inicio.
  const puedeVerHidro = tieneAcceso(profile, "registrar_hidrostatica");
  const puedeVerSolicitudes = tieneAcceso(profile, "solicitudes_almacen");
  const puedeVerRecordatorios = tieneAcceso(profile, "compresores");

  // V35 (buscador en los historiales): todos los registros, no solo los
  // últimos 200 de cada tipo. Si una consulta falla (por ejemplo, una vista
  // que todavía no existe), esa lista queda vacía y la pantalla sigue.
  const todos = (vista) =>
    todasLasFilas(supabase, vista, (q) => q.select("*").order("created_at", { ascending: false }).order("id")).catch(() => []);
  const nada = Promise.resolve([]);
  const [salidas, llenados, inspecciones, mantenimientos, recibidos, envios, pruebas, pedidas, recHechos, compresores] = await Promise.all([
    todos("salidas_con_nombre"),
    todos("llenados_con_nombre"),
    todos("inspecciones_con_nombre"),
    todos("mantenimientos_con_nombre"),
    // V50: los códigos que llegaron por Solicitudes al almacén ("12. si").
    // Solo los ve quien puede ver Solicitudes al almacén.
    todasLasFilas(supabase, "solicitudes_almacen_items", (q) =>
      q
        .select("*, solicitud:solicitudes_almacen(folio, nombre_usuario_snapshot, nota, created_at)")
        .not("recibido_at", "is", null)
        .order("recibido_at", { ascending: false })
        .order("id")
    ).catch(() => []),
    puedeVerHidro ? todos("envios_hidrostatica") : nada,
    puedeVerHidro ? todos("pruebas_hidrostaticas_con_nombre") : nada,
    puedeVerSolicitudes
      ? todasLasFilas(supabase, "solicitudes_almacen", (q) =>
          q.select("*, items:solicitudes_almacen_items(id, codigo_snapshot, descripcion_snapshot, cantidad)").order("created_at", { ascending: false }).order("id")
        ).catch(() => [])
      : nada,
    puedeVerRecordatorios
      ? todasLasFilas(supabase, "recordatorios_hechos", (q) =>
          q.select("*, recordatorio:recordatorios_compresores(titulo), compresor:compresores(*)").order("hecho_en", { ascending: false }).order("id")
        ).catch(() => [])
      : nada,
    // V100 ("55. sí"): los mantenimientos e inspecciones de compresores (en el
    // Inicio ya salían; aquí faltaban).
    puedeVerRecordatorios ? todos("mantenimientos_compresores_con_nombre") : nada,
  ]);

  // Las pruebas que vienen de un envío son el regreso del tanque.
  const conEnvio = new Set((envios || []).map((e) => e.prueba_id).filter(Boolean));
  // Varios tanques enviados (o regresados) juntos, por la misma persona en el
  // mismo minuto, salen en una sola línea.
  const agrupar = (filas, quien) => {
    const grupos = new Map();
    for (const f of filas || []) {
      const k = `${quien(f) || ""}|${String(f.created_at).slice(0, 16)}`;
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(f);
    }
    return [...grupos.values()];
  };

  const movimientos = [
    ...(salidas || []).map((s) => ({ ...s, tipo: "salida" })),
    ...(llenados || []).map((t) => ({ ...t, tipo: "llenado" })),
    ...(inspecciones || []).map((i) => ({ ...i, tipo: "inspeccion" })),
    ...(mantenimientos || []).map((m) => ({ ...m, tipo: "mantenimiento" })),
    ...(recibidos || []).map((r) => ({ ...r, tipo: "solicitud", fecha_mov: r.recibido_at })),
    ...agrupar(envios, (e) => e.nombre_usuario_snapshot).map((g) => ({
      tipo: "envio_ph",
      id: g[0].id,
      created_at: g[0].created_at,
      full_name: g[0].nombre_usuario_snapshot,
      fecha_envio: g[0].fecha_envio,
      nota: g[0].nota,
      tanques: g.map((e) => ({ codigo: e.tanque_codigo_snapshot, id: e.tanque_id })),
    })),
    ...agrupar(pruebas, (p) => p.full_name || p.nombre_usuario_snapshot).map((g) => ({
      tipo: "regreso_ph",
      id: g[0].id,
      created_at: g[0].created_at,
      full_name: g[0].full_name || g[0].nombre_usuario_snapshot,
      regreso: conEnvio.has(g[0].id),
      folio: g.length === 1 ? g[0].folio : null,
      nota: g.length === 1 ? g[0].nota : null,
      fecha_prueba: g[0].fecha_prueba,
      tanques: g.map((p) => ({ codigo: p.tanque_codigo_snapshot, id: p.tanque_id, resultado: p.resultado })),
    })),
    ...(pedidas || []).map((x) => ({ ...x, tipo: "solicitud_pedida", full_name: x.nombre_usuario_snapshot })),
    ...(recHechos || []).map((x) => ({ ...x, tipo: "recordatorio", created_at: x.hecho_en, full_name: x.nombre_usuario })),
    ...(compresores || []).map((m) => ({ ...m, tipo: "compresor", full_name: m.full_name || m.nombre_usuario_snapshot })),
  ].sort((a, b) => new Date(b.fecha_mov || b.created_at) - new Date(a.fecha_mov || a.created_at));

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
