import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireInterno, tieneAlguno, esOperativo, getProfileYUser } from "@/lib/roles";
import { MAS_PERMISOS } from "@/lib/nav";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import { IconCatalog, IconReport, IconHistory, IconShuffle, IconCalendar, IconBook } from "@/components/icons";

// Hub "Más": une Catálogo, Historial y Reportes en un solo botón del menú
// superior para no sobrecargarlo (antes eran 3 botones fijos aparte).
// Renombrado en App Interno (V29, pedido explícito: "renombra 'catalogo' a
// 'base de datos' asi igual como esta en app equipos de clientes" y "a
// historial de app interno, renombralo igual como esta en app equipos de
// clientes") -- solo cambian los nombres que se ven; las rutas (/catalogo,
// /admin/historial) y los permisos (catalogo, historial) siguen igual.
//
// Cada tarjeta se muestra solo si el usuario tiene el permiso granular
// correspondiente (el Titular siempre tiene acceso vía tieneAcceso).
// Ver lib/nav.js -> NAV_SECTIONS ("Más" usa key: [array de permisos]).
const OPCIONES = [
  // V29, pedido explícito: "dejalo en mas" -- ver app/solicitudes.
  {
    href: "/solicitudes",
    titulo: "Solicitudes al almacén",
    descripcion: "Pide códigos al almacén y marca cuándo llegan a la tienda.",
    permiso: "solicitudes_almacen",
    Icono: IconShuffle,
  },
  // V29 (maqueta aprobada: segundo, debajo de Base de datos).
  {
    href: "/vencimientos",
    titulo: "Próximos vencimientos",
    descripcion: "Mantenimientos, inspecciones y pruebas hidrostáticas vencidas o por vencer.",
    permiso: "proximos_vencimientos",
    Icono: IconCalendar,
  },
  {
    href: "/reportes",
    titulo: "Reportes",
    descripcion: "Genera y descarga reportes de movimientos.",
    permiso: ["reportes", "correos_semanales"],
    Icono: IconReport,
  },
  {
    href: "/catalogo",
    titulo: "Base de datos",
    descripcion: "Códigos, reguladores y tanques de alquiler.",
    permiso: "catalogo",
    Icono: IconCatalog,
  },
  {
    href: "/admin/historial",
    // Renombrado a "Anulaciones y ediciones" (13-oct-2026, pedido explícito:
    // "cambiemos el nombre a 'anulaciones y ediciones'") -- antes era
    // "Historial de anulaciones y ediciones".
    titulo: "Anulaciones y ediciones",
    descripcion: "Registro de ediciones y movimientos anulados.",
    permiso: "historial",
    Icono: IconHistory,
  },
  // V51: los manuales los ven todos (los mismos que en App Equipos de clientes).
  {
    href: "/manuales",
    titulo: "Manuales",
    descripcion: "Manuales de reguladores y compresores.",
    permiso: null,
    Icono: IconBook,
  },
];

export default async function MasPage() {
  const supabase = createClient();
  // V51: "Más" lo ve todo el que entra a App Interno (por los Manuales); el
  // Operativo, solo si su rol le da alguna opción, como antes.
  const { profile: yo } = await getProfileYUser(supabase);
  const { profile } = await requireInterno(supabase, esOperativo(yo) ? MAS_PERMISOS : []);

  const opciones = OPCIONES.filter((o) => !o.permiso || tieneAlguno(profile, Array.isArray(o.permiso) ? o.permiso : [o.permiso]));

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
                {/* V38: sin la descripción debajo ("vamos a quitar las letricas"). */}
                <div className="hub-link-title">{o.titulo}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
