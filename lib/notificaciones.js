import { tieneAcceso } from "@/lib/roles";
import { hoyISO } from "@/lib/fechas";

// Junta todos los "pendientes" de App Interno en un solo lugar (ítem 3 +
// ítem 6 del feedback de v14, 22-sep-2026), para que Inicio (alerta
// arriba) y /espacio (tarjeta "App Interno") siempre muestren los mismos
// números sin duplicar las consultas ni la lógica de a quién se le
// muestra cada una.
//
// - Llenados pendientes por facturar: ya existía (permiso "facturacion").
// - Tanques con inspección visual vencida / reguladores con mantenimiento
//   vencido: nuevos -- se muestran a quien puede registrar inspecciones o
//   mantenimientos (permiso "registrar_inspeccion"/"registrar_mantenimiento"),
//   que es quien realmente puede hacer algo al respecto. El Titular
//   siempre los ve (tieneAcceso le da acceso total).
export async function obtenerPendientesInterno(supabase, profile) {
  const puedeFacturar = tieneAcceso(profile, "facturacion");
  const puedeEquipos =
    tieneAcceso(profile, "registrar_inspeccion") || tieneAcceso(profile, "registrar_mantenimiento");
  const hoy = hoyISO();

  const [facturarRes, tanquesRes, reguladoresRes] = await Promise.all([
    puedeFacturar
      ? supabase
          .from("llenados_tanques")
          .select("id", { count: "exact", head: true })
          .eq("facturado", false)
      : Promise.resolve({ count: 0 }),
    puedeEquipos
      ? supabase
          .from("tanques_alquiler")
          .select("id", { count: "exact", head: true })
          .eq("activo", true)
          .lt("proxima_inspeccion", hoy)
      : Promise.resolve({ count: 0 }),
    puedeEquipos
      ? supabase
          .from("reguladores_alquiler")
          .select("id", { count: "exact", head: true })
          .eq("activo", true)
          .lt("proximo_mantenimiento", hoy)
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    pendientesFacturar: facturarRes.count || 0,
    tanquesVencidos: tanquesRes.count || 0,
    reguladoresVencidos: reguladoresRes.count || 0,
  };
}
