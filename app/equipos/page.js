import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tieneAlguno, requireInterno, PERMISOS_EQUIPOS } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import { IconTankFill, IconEye, IconGauge, IconRegulator, IconCompressor } from "@/components/icons";

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

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Equipos</h1>

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
                <div className="hub-link-title">{o.titulo}</div>
                <div className="hub-link-desc">{o.descripcion}</div>
              </div>
            </div>
          </Link>
        ))}

        {otras.length > 0 && (
          <div className="section-title" style={{ marginTop: tanques.length > 0 ? 24 : 0 }}>
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
                <div className="hub-link-title">{o.titulo}</div>
                <div className="hub-link-desc">{o.descripcion}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
