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

// Igual que obtenerPendientesInterno, pero para la tarjeta "App Equipos
// de clientes" de /espacio (23-sep-2026, primera versión real de App
// Equipos Clientes). Solo consulta si el usuario tiene el permiso
// `equipos_clientes` (o es Titular) -- si no, no tiene sentido mostrarle
// el número.
//
// Ampliado 23-sep-2026 (pedido explícito, en vivo: "no veo las ordenes
// que estan en espera ni ordenes que estan en pruebas hidrostaticas" --
// "pon que en esta seccion aparezcan todas las notifcaciones posibles").
// Antes solo traía por-trabajar/por-despachar; el hub de Inicio
// (app/app-clientes/page.js) ya tenía 3 secciones más (en espera, en
// prueba hidrostática, en reparación) que nunca se reflejaban acá --
// mismas 3 consultas que usa Inicio, para que digan siempre lo mismo.
export async function obtenerPendientesClientes(supabase, profile) {
  const puedeVer = tieneAcceso(profile, "equipos_clientes");
  if (!puedeVer) {
    return {
      ordenesPorTrabajar: 0,
      ordenesPorDespachar: 0,
      ordenesEnEspera: 0,
      ordenesEnHidrostatica: 0,
      ordenesEnReparacion: 0,
    };
  }

  const [porTrabajarRes, porDespacharRes, enEsperaRes, enHidrostaticaRes, enReparacionRes] = await Promise.all([
    supabase
      .from("ordenes_equipos")
      .select("id", { count: "exact", head: true })
      .in("estado", ["Pendiente por trabajar", "En proceso"]),
    supabase
      .from("ordenes_equipos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "Pendiente por despachar"),
    supabase
      .from("ordenes_equipos")
      .select("id", { count: "exact", head: true })
      .eq("en_espera", true)
      .neq("estado", "Entregado"),
    // Prueba hidrostática ya no depende de envio_a (23-sep-2026) -- ver
    // app/app-clientes/page.js.
    supabase
      .from("ordenes_equipos")
      .select("id", { count: "exact", head: true })
      .not("fecha_envio_hidrostatica", "is", null)
      .is("fecha_retorno_tienda", null),
    supabase
      .from("ordenes_equipos")
      .select("id", { count: "exact", head: true })
      .eq("envio_a", "Reparación")
      .is("fecha_retorno_tienda", null),
  ]);

  return {
    ordenesPorTrabajar: porTrabajarRes.count || 0,
    ordenesPorDespachar: porDespacharRes.count || 0,
    ordenesEnEspera: enEsperaRes.count || 0,
    ordenesEnHidrostatica: enHidrostaticaRes.count || 0,
    ordenesEnReparacion: enReparacionRes.count || 0,
  };
}
