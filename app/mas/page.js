import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import { IconCatalog, IconReport, IconHistory } from "@/components/icons";

// Hub "Más": une Catálogo, Historial y Reportes en un solo botón del menú
// superior para no sobrecargarlo (antes eran 3 botones fijos aparte).
// Cada tarjeta se muestra solo si el usuario tiene el permiso granular
// correspondiente (el Titular siempre tiene acceso vía tieneAcceso).
// Ver lib/nav.js -> NAV_SECTIONS ("Más" usa key: [array de permisos]).
const OPCIONES = [
  {
    href: "/catalogo",
    titulo: "Catálogo",
    descripcion: "Códigos, reguladores y tanques de alquiler.",
    permiso: "catalogo",
    Icono: IconCatalog,
  },
  {
    href: "/reportes",
    titulo: "Reportes",
    descripcion: "Genera y descarga reportes de movimientos.",
    permiso: "reportes",
    Icono: IconReport,
  },
  {
    href: "/admin/historial",
    titulo: "Historial",
    descripcion: "Registro de ediciones y movimientos anulados.",
    permiso: "historial",
    Icono: IconHistory,
  },
];

export default async function MasPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  const opciones = OPCIONES.filter((o) => tieneAcceso(profile, o.permiso));

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Más</h1>

        {opciones.length === 0 && (
          <div className="empty">No tienes acceso a ninguna sección aquí todavía.</div>
        )}
        {opciones.map((o) => (
          <Link key={o.href} href={o.href} className="card hub-link-card">
            <div className="hub-link-card-inner">
              <div className="hub-link-icon">
                <o.Icono size={20} />
              </div>
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
