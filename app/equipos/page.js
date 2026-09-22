import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import { IconTankFill, IconEye, IconWrench, IconCompressor } from "@/components/icons";

// Grupo "Tanques": llenados e inspección visual, todo lo relacionado
// a los tanques de alquiler, agrupado bajo un mismo encabezado.
const GRUPO_TANQUES = [
  {
    href: "/tanques",
    titulo: "Llenados de tanque",
    descripcion: "Registro de llenados internos de tanques.",
    Icono: IconTankFill,
  },
  {
    href: "/equipos/inspeccion-visual",
    titulo: "Inspección visual",
    descripcion: "Aprobación o rechazo de tanques en inspección visual.",
    Icono: IconEye,
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
    Icono: IconWrench,
  },
  {
    href: "/equipos/compresores",
    titulo: "Compresores",
    descripcion: "Control de horas de uso y mantenimiento (próximamente).",
    permiso: "compresores",
    Icono: IconCompressor,
  },
];

export default async function EquiposPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  const otras = OTRAS_OPCIONES.filter((o) => !o.permiso || tieneAcceso(profile, o.permiso));

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Equipos</h1>

        <div className="section-title" style={{ marginTop: 0 }}>
          Tanques
        </div>
        {GRUPO_TANQUES.map((o) => (
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

        <div className="section-title" style={{ marginTop: 24 }}>
          Otros
        </div>
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
