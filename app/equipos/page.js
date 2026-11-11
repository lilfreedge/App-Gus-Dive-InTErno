import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tieneAlguno, requireInterno, PERMISOS_EQUIPOS, esRolEquipos } from "@/lib/roles";
import { obtenerPendientesInterno } from "@/lib/notificaciones";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import { IconTankFill, IconEye, IconGauge, IconRegulator, IconCompressor, IconAlert } from "@/components/icons";
import { cargarRecordatorios } from "@/lib/recordatorios";
import { hoyISO } from "@/lib/fechas";

// Grupo "Tanques": llenados, inspección visual y pruebas hidrostáticas, todo lo relacionado
// a los tanques de alquiler, agrupado bajo un mismo encabezado.
const GRUPO_TANQUES = [
  {
    href: "/tanques",
    titulo: "Llenados de tanque",
    descripcion: "Registro de llenados internos de tanques.",
    Icono: IconTankFill,
    permisos: ["registrar_llenado", "facturacion"],
  },
  {
    href: "/equipos/inspeccion-visual",
    titulo: "Inspección visual",
    descripcion: "Aprobación o rechazo de tanques en inspección visual.",
    Icono: IconEye,
    permisos: ["registrar_inspeccion"],
  },
  // V29 (pedido explícito: "pon el boton de pruebas hidrostaticas debajo
  // de inspeccion visual, en vez de encima").
  {
    href: "/equipos/pruebas-hidrostaticas",
    titulo: "Pruebas hidrostáticas",
    descripcion: "Prueba hidrostática de los tanques, cada 5 años.",
    Icono: IconGauge,
    permisos: ["registrar_hidrostatica"],
  },
];

// El resto va bajo el encabezado "Otros" (mismo patrón que "Tanques"),
// pero sin unificarlos en una sola página -- cada uno sigue siendo su
// propia tarjeta/link.
const OTRAS_OPCIONES = [
  {
    href: "/equipos/mantenimiento-reguladores",
    titulo: "Mantenimiento de reguladores",
    descripcion: "Historial de mantenimientos hechos a los reguladores.",
    Icono: IconRegulator,
    permisos: ["registrar_mantenimiento"],
  },
  {
    href: "/equipos/compresores",
    titulo: "Compresores",
    descripcion: "Catálogo de compresores y su historial de mantenimiento.",
    permisos: ["compresores"],
    Icono: IconCompressor,
  },
];

export default async function EquiposPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, PERMISOS_EQUIPOS);

  // V30 ("corrige todos los accesos"): cada tarjeta solo sale con su
  // permiso -- antes Llenados, Inspección visual, Hidrostáticas y
  // Mantenimiento salían para cualquiera (solo "registrar" pedía permiso).
  const tanques = GRUPO_TANQUES.filter((o) => tieneAlguno(profile, o.permisos));
  const otras = OTRAS_OPCIONES.filter((o) => tieneAlguno(profile, o.permisos));

  // V34: para el rol con Pantalla de inicio "Equipos (para rol técnico)"
  // esta es su Inicio, así que aquí le salen los avisos que en el Inicio
  // normal salen arriba (solo los de lo que puede ver).
  // V63 ("230"): "Para hacer": los recordatorios que le tocan a esta persona
  // y ya vencieron o están por vencer.
  const { items: misRec } = await cargarRecordatorios(supabase, { usuarioId: profile.id, hoy: hoyISO(), todos: true });
  const paraHacer = misRec.filter((it) => it.estado === "vencido" || it.estado === "pronto");
  const conAvisos = esRolEquipos(profile);
  const avisos = [];
  if (conAvisos) {
    const p = await obtenerPendientesInterno(supabase, profile);
    if (p.tanquesVencidos > 0)
      avisos.push({ href: "/equipos/inspeccion-visual", texto: `${p.tanquesVencidos} tanque${p.tanquesVencidos === 1 ? "" : "s"} con inspección vencida`, clase: "error-box" });
    if (p.recordatoriosVencidos > 0)
      avisos.push({ href: "/equipos/compresores", texto: `${p.recordatoriosVencidos} recordatorio${p.recordatoriosVencidos === 1 ? "" : "s"} de compresores vencido${p.recordatoriosVencidos === 1 ? "" : "s"}`, clase: "error-box" });
    if (p.recordatoriosPronto > 0)
      avisos.push({ href: "/equipos/compresores", texto: `${p.recordatoriosPronto} recordatorio${p.recordatoriosPronto === 1 ? "" : "s"} de compresores por vencer`, clase: "aviso-box" });
    if (p.reguladoresVencidos > 0)
      avisos.push({ href: "/equipos/mantenimiento-reguladores", texto: `${p.reguladoresVencidos} regulador${p.reguladoresVencidos === 1 ? "" : "es"} con mantenimiento vencido`, clase: "error-box" });
    if (p.hidroVencidas > 0)
      avisos.push({ href: "/equipos/pruebas-hidrostaticas", texto: `${p.hidroVencidas} tanque${p.hidroVencidas === 1 ? "" : "s"} con prueba hidrostática vencida`, clase: "error-box" });
    if (p.hidroPorVencer > 0)
      avisos.push({ href: "/equipos/pruebas-hidrostaticas", texto: `${p.hidroPorVencer} tanque${p.hidroPorVencer === 1 ? "" : "s"} con prueba hidrostática por vencer (2 meses o menos)`, clase: "aviso-box" });
  }

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Equipos</h1>

        {avisos.map((a) => (
          <Link
            key={a.texto}
            href={a.href}
            className={a.clase}
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 12 }}
          >
            <IconAlert size={18} />
            {a.texto}
          </Link>
        ))}

        {paraHacer.length > 0 && (
          <Link href="/equipos/recordatorios" className="card rec-mios" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div className="section-title" style={{ marginTop: 0 }}>
              Para hacer ({paraHacer.length})
            </div>
            {paraHacer.slice(0, 4).map((it) => (
              <div key={`${it.recordatorio.id}-${it.compresor?.id || "x"}`} className="list-item-meta" style={{ color: it.estado === "vencido" ? "var(--rojo)" : "#b5691f", fontWeight: 600 }}>
                {it.recordatorio.titulo}
                {it.compresor ? ` · ${it.compresor.codigo}` : ""} — {it.estado === "vencido" ? "vencido" : it.faltanDias === 0 ? "hoy" : it.faltanDias != null ? `en ${it.faltanDias} día${it.faltanDias === 1 ? "" : "s"}` : it.texto}
              </div>
            ))}
            <div style={{ marginTop: 6, color: "var(--azul-claro)", fontWeight: 700, fontSize: 13 }}>Ver y hacerlo ›</div>
          </Link>
        )}

        {tanques.length > 0 && (
          <div className="section-title" style={{ marginTop: 0 }}>
            Tanques
          </div>
        )}
        {tanques.map((o) => (
          <Link key={o.href} href={o.href} className="card hub-link-card">
            <div className="hub-link-card-inner">
              <span className="hub-link-icon">
                <o.Icono size={22} />
              </span>
              <div>
                {/* V38: sin la descripción debajo ("vamos a quitar las letricas"). */}
                <div className="hub-link-title">{o.titulo}</div>
              </div>
            </div>
          </Link>
        ))}

        {/* "Otros" solo si arriba está "Tanques" (V34: el técnico que solo
            tiene reguladores y compresores no necesita el título). */}
        {otras.length > 0 && tanques.length > 0 && (
          <div className="section-title" style={{ marginTop: 24 }}>
            Otros
          </div>
        )}
        {otras.map((o) => (
          <Link key={o.href} href={o.href} className="card hub-link-card">
            <div className="hub-link-card-inner">
              <span className="hub-link-icon">
                <o.Icono size={22} />
              </span>
              <div>
                {/* V38: sin la descripción debajo ("vamos a quitar las letricas"). */}
                <div className="hub-link-title">{o.titulo}</div>
              </div>
            </div>
          </Link>
        ))}

        {/* V68 ("72. pienso que hace más sentido en más"): Recordatorios pasó a Más. "Para hacer" sigue arriba. */}
      </div>
    </div>
  );
}
