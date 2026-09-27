import Link from "next/link";
import { requirePermiso } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import NavArrowsClientesServer from "@/components/NavArrowsClientesServer";
import { IconCatalog, IconReport, IconHistory, IconBook } from "@/components/icons";

// Hub "Más" de App Clientes (23-sep-2026, pedido explícito: "agregar un
// botón de 'mas' al lado de historial de ordenes... igual como que en
// app interno"). Mismo patrón que /mas de App Interno (tarjetas con
// ícono + descripción, una por sección) -- por ahora solo trae
// Catálogo (de servicios: "lista de servicios, ya luego vemos que mas
// agregar"), pero queda listo para sumar más opciones sin rediseñar.
//
// "Base de datos" requiere el permiso granular equipos_clientes_catalogo
// para aparecer acá (pedido explícito, 23-sep-2026: "ponme en
// administracion para dar acceso a 'base de dato' quien no lo tenga el
// acceso pues que no le salga") -- antes se veía con solo tener acceso a
// la app; ahora, sin el permiso, la tarjeta ni se muestra (y la página
// de Base de datos también quedó gateada, por si alguien intenta entrar
// directo por la URL).
//
// "Listado de órdenes" se mudó para acá el mismo día (pedido explícito:
// "unimos 'registro' y 'listado de ordenes'?... ya se! pon listado de
// ordenes dentro de 'mas'") -- ya no vive en el menú superior, y pidió
// ícono explícito ("agregale un icono a ese boton dentro de mas"). Sin
// permiso propio: sigue abierto a cualquiera con acceso base a la app,
// igual que cuando estaba arriba.
const OPCIONES = [
  {
    href: "/app-clientes/historial",
    titulo: "Listado de órdenes",
    descripcion: "Todas las órdenes registradas, incluidas las ya entregadas.",
    Icono: IconReport,
  },
  {
    href: "/app-clientes/catalogo",
    titulo: "Base de datos",
    descripcion: "Servicios y piezas que se usan al registrar y dar seguimiento a órdenes.",
    Icono: IconCatalog,
    permiso: "equipos_clientes_catalogo",
  },
  // Reportes (23-sep-2026, pedido explícito: "una idea que tengo en
  // mente... el app pueda emitir un reporte de su orden... la idea es
  // que sea un reporte que se vaya alimentando en base al seguimiento" --
  // se alimenta solo de los datos ya guardados en Seguimiento, no pide
  // nada nuevo). El de tanques (prueba hidrostática) queda para más
  // adelante -- "me interesa para mucho mas par alante, no trabajes en
  // eso" -- por ahora solo cubre órdenes de Reguladores.
  {
    href: "/app-clientes/reportes",
    titulo: "Reportes",
    descripcion: "Reporte de seguimiento por orden -- por ahora, solo para Reguladores.",
    // Mismo ícono que usa "Reportes" en App Interno (item 15, pedido
    // explícito, 27-sep-2026: "ponle a reportes el mismo icono que tiene
    // el de app interno") -- antes usaba IconReceipt. Permiso granular
    // nuevo (ronda grande de feedback, 27-sep-2026) -- antes se veía con
    // solo tener acceso a la app.
    Icono: IconReport,
    permiso: "equipos_clientes_reportes",
  },
  // "Historial" (item 31, pedido explícito, 27-sep-2026: "en mas, crea un
  // boton de historial y ahi dentro pone los historiales que te dije
  // anteriormente. tambien pon movimientos anulados") -- reemplaza los dos
  // botones que antes vivían sueltos dentro de Administración. Pasó de
  // Titular-only a permiso granular (ronda grande de feedback, 27-sep-2026,
  // pedido explícito) -- se filtra acá para que la tarjeta ni se muestre
  // sin el permiso, aunque la página también se protege sola del lado del
  // servidor (y su política RLS, ver migration_35.sql).
  {
    href: "/app-clientes/administracion/historial",
    titulo: "Historial",
    descripcion: "Ediciones y movimientos anulados de órdenes y equipos.",
    Icono: IconHistory,
    permiso: "equipos_clientes_historial",
  },
  // "Bitácora movimientos en órdenes" (item nuevo, pedido explícito,
  // 27-sep-2026: "un registro de todas las veces que cualquier orden es
  // editada. para enterarme quien cambio que en cada orden") -- solo
  // ediciones de órdenes (sin anulados, sin equipos), en su propio botón
  // para no tener que entrar a "Historial" a buscarlas. Arrancó Titular-only
  // como "Historial", pero el mismo día el Titular pidió poder dársela a
  // alguien más sin hacerlo Titular/Administrador -- ahora es un permiso
  // granular (equipos_clientes_bitacora_movimientos, editable en Permisos),
  // el Titular la sigue viendo siempre.
  {
    href: "/app-clientes/administracion/bitacora-movimientos",
    titulo: "Bitácora movimientos en órdenes",
    descripcion: "Quién editó qué, en cualquier orden.",
    Icono: IconBook,
    permiso: "equipos_clientes_bitacora_movimientos",
  },
];

export default async function MasClientesPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  const esTitular = !!profile?.es_titular;
  const puedeVer = (o) => {
    if (o.soloTitular) return esTitular;
    return !o.permiso || esTitular || !!profile?.permisos?.[o.permiso];
  };
  const opcionesVisibles = OPCIONES.filter(puedeVer);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsClientesServer />
        <h1 className="page-title">Más</h1>

        {opcionesVisibles.length === 0 && (
          <div className="empty">Todavía no tienes acceso a ninguna opción aquí.</div>
        )}

        {opcionesVisibles.map((o) => (
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
