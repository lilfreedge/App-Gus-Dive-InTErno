import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";

const OPCIONES = [
  {
    href: "/tanques",
    titulo: "Llenados de tanque",
    descripcion: "Registro de llenados internos de tanques.",
  },
  {
    href: "/equipos/inspeccion-visual",
    titulo: "Inspección visual",
    descripcion: "Aprobación o rechazo de tanques en inspección visual.",
  },
  {
    href: "/equipos/mantenimiento-reguladores",
    titulo: "Mantenimiento de reguladores",
    descripcion: "Historial de mantenimientos hechos a los reguladores.",
  },
  {
    href: "/equipos/compresores",
    titulo: "Compresores",
    descripcion: "Control de horas de uso y mantenimiento (próximamente).",
  },
];

export default async function EquiposPage() {
  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Equipos</h1>

        {OPCIONES.map((o) => (
          <Link key={o.href} href={o.href} className="card hub-link-card">
            <div className="hub-link-title">{o.titulo}</div>
            <div className="hub-link-desc">{o.descripcion}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
