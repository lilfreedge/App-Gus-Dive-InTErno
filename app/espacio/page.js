import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import HeaderSimple from "@/components/HeaderSimple";
import { IconUsers, IconPackage } from "@/components/icons";

// Ítem 7 del backlog (22-sep-2026): pantalla que aparece justo después de
// iniciar sesión, para elegir en qué espacio entrar -- "App Clientes"
// (proyecto nuevo, todavía sin construir, placeholder "próximamente") a la
// izquierda y "App Interno" (todo lo que existe hoy: salidas, equipos,
// reportes, etc.) a la derecha, cada uno con sus notificaciones debajo.
// No reemplaza /dashboard -- solo se muestra una vez al entrar; desde
// dentro de App Interno se puede volver aquí con "Cambiar de espacio" en
// el menú de ajustes (ver components/TopbarClient.js).
export default async function EspacioPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const nombreCompleto = profile?.full_name || "";
  const nombre = nombreCompleto.split(" ")[0] || "";

  // Notificación de App Interno: reusa la misma alerta de "pendiente por
  // facturar" que ya existe en el Inicio (app/dashboard/page.js) -- no se
  // inventa un sistema de notificaciones nuevo, se adelanta la que ya
  // existía. Falta definir el resto (qué más cuenta como notificación en
  // cada espacio); se puede ampliar más adelante.
  const puedeFacturar = tieneAcceso(profile, "facturacion");
  const { count: pendientesFacturar } = puedeFacturar
    ? await supabase
        .from("llenados_tanques")
        .select("id", { count: "exact", head: true })
        .eq("facturado", false)
    : { count: 0 };

  const hayAlertaInterno = puedeFacturar && (pendientesFacturar || 0) > 0;

  return (
    <div>
      <HeaderSimple nombre={nombre} etiqueta="Selecciona tu espacio" />
      <div className="page" style={{ paddingTop: 24 }}>
        <h1 className="page-title">¿A dónde quieres entrar?</h1>

        <div className="espacio-grid">
          <Link href="/app-clientes" className="card espacio-card">
            <div className="espacio-icon">
              <IconUsers size={22} />
            </div>
            <div className="espacio-title">App Clientes</div>
            <div className="espacio-badge">Próximamente</div>
            <div className="espacio-notif">Sin novedades todavía.</div>
          </Link>

          <Link href="/dashboard" className="card espacio-card">
            <div className="espacio-icon">
              <IconPackage size={22} />
            </div>
            <div className="espacio-title">App Interno</div>
            <div className="espacio-notif">
              {hayAlertaInterno ? (
                <span className="espacio-notif-alerta">
                  {pendientesFacturar} llenado{pendientesFacturar === 1 ? "" : "s"} pendiente
                  {pendientesFacturar === 1 ? "" : "s"} por facturar
                </span>
              ) : (
                "Sin novedades."
              )}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
