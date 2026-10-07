import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import Breadcrumb from "@/components/Breadcrumb";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO, sumarMeses } from "@/lib/fechas";

// "Próximos vencimientos" (V29, maqueta aprobada): en un solo lugar, lo
// vencido y lo que vence en los próximos 2 meses ("1. si") de las tres
// cosas que tienen fecha de vencimiento en App Interno -- mantenimiento de
// reguladores, inspección visual y prueba hidrostática de los tanques. Solo
// lectura: cada sección tiene un enlace a su pantalla para registrar.
// Permiso propio, igual que los demás botones de Más ("quien tenga el
// permiso, mismo sistema que ya tienen los otros botones"), con atajo
// opcional en Mi Perfil.
const HORIZONTE_MESES = 2;

function diasEntre(desdeISO, hastaISO) {
  return Math.round((new Date(hastaISO) - new Date(desdeISO)) / 86400000);
}

function textoFaltan(dias) {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  return `en ${dias} días`;
}

// Separa en vencidos (con fecha, el más viejo primero; después los que
// nunca tuvieron un registro) y próximos (el más cercano primero).
function clasificar(items, campo, hoy, limite) {
  const vencidosConFecha = items
    .filter((i) => i[campo] && i[campo] < hoy)
    .sort((a, b) => (a[campo] < b[campo] ? -1 : 1));
  const nunca = items.filter((i) => !i[campo]).sort((a, b) => (a.codigo < b.codigo ? -1 : 1));
  const proximos = items
    .filter((i) => i[campo] && i[campo] >= hoy && i[campo] <= limite)
    .sort((a, b) => (a[campo] < b[campo] ? -1 : 1));
  return { vencidos: [...vencidosConFecha, ...nunca], proximos };
}

function Seccion({ titulo, href, irA, campo, datos, femenino, textoNunca, hoy }) {
  const { vencidos, proximos } = datos;
  return (
    <>
      <div
        className="section-title"
        style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}
      >
        <span>{titulo}</span>
        <Link
          href={href}
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--azul-claro)",
            textDecoration: "none",
            textTransform: "none",
            letterSpacing: 0,
            whiteSpace: "nowrap",
          }}
        >
          Ir a {irA} →
        </Link>
      </div>
      <div className="card">
        {vencidos.length === 0 && proximos.length === 0 ? (
          <div className="empty" style={{ padding: "6px 0" }}>
            Todo al día ✓ — nada vencido ni por vencer.
          </div>
        ) : (
          <>
            {vencidos.map((i) => (
              <div className="list-item" key={i.id}>
                <div className="list-item-top">
                  <span className="list-item-title">{i.codigo}</span>
                  <span className="badge badge-rojo">
                    {i[campo]
                      ? `${femenino ? "Vencida" : "Vencido"} desde ${formatFechaDDMMAAAADeDate(i[campo])}`
                      : textoNunca}
                  </span>
                </div>
              </div>
            ))}
            {proximos.map((i) => (
              <div className="list-item" key={i.id}>
                <div className="list-item-top">
                  <span className="list-item-title">{i.codigo}</span>
                  <span className="badge badge-amarillo">
                    {formatFechaDDMMAAAADeDate(i[campo])} · {textoFaltan(diasEntre(hoy, i[campo]))}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}

export default async function ProximosVencimientosPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "proximos_vencimientos");

  const [{ data: reguladores }, { data: tanques }, hidroRes] = await Promise.all([
    supabase.from("reguladores_alquiler").select("id, codigo, proximo_mantenimiento").eq("activo", true),
    supabase.from("tanques_alquiler").select("id, codigo, proxima_inspeccion").eq("activo", true),
    // Aparte: si migration_53.sql todavía no se corrió, la columna no
    // existe -- esa sección sale vacía en vez de romper toda la pantalla.
    supabase.from("tanques_alquiler").select("id, codigo, proxima_hidrostatica").eq("activo", true),
  ]);

  const hoy = hoyISO();
  const limite = sumarMeses(hoy, HORIZONTE_MESES);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Próximos vencimientos" }]} />
        <p className="page-subtitle">
          Primero lo vencido (rojo), después lo que vence en los próximos 2 meses (ámbar), lo más urgente arriba.
        </p>

        <Seccion
          titulo="Mantenimiento de reguladores"
          href="/equipos/mantenimiento-reguladores"
          irA="Mantenimiento"
          campo="proximo_mantenimiento"
          datos={clasificar(reguladores || [], "proximo_mantenimiento", hoy, limite)}
          textoNunca="Nunca se le hizo mantenimiento"
          hoy={hoy}
        />
        <Seccion
          titulo="Inspección visual"
          href="/equipos/inspeccion-visual"
          irA="Inspección visual"
          campo="proxima_inspeccion"
          datos={clasificar(tanques || [], "proxima_inspeccion", hoy, limite)}
          femenino
          textoNunca="Nunca inspeccionado"
          hoy={hoy}
        />
        <Seccion
          titulo="Prueba hidrostática"
          href="/equipos/pruebas-hidrostaticas"
          irA="Pruebas hidrostáticas"
          campo="proxima_hidrostatica"
          datos={clasificar(hidroRes.error ? [] : hidroRes.data || [], "proxima_hidrostatica", hoy, limite)}
          femenino
          textoNunca="Sin prueba registrada"
          hoy={hoy}
        />
      </div>
    </div>
  );
}
