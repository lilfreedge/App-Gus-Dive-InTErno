import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import { obtenerPendientesInterno, obtenerPendientesClientes } from "@/lib/notificaciones";
import HeaderSimple from "@/components/HeaderSimple";
import { IconUsers, IconPackage } from "@/components/icons";

// Ítem 7 del backlog (22-sep-2026): pantalla que aparece justo después de
// iniciar sesión, para elegir en qué espacio entrar -- "App Clientes"
// (proyecto nuevo, todavía sin construir, placeholder "próximamente") a la
// izquierda y "App Interno" (todo lo que existe hoy: salidas, equipos,
// reportes, etc.) a la derecha, cada uno con sus notificaciones debajo.
// No reemplaza /dashboard -- solo se muestra una vez al entrar; desde
// dentro de App Interno se puede volver aquí con "Cambiar de app" en el
// menú de ajustes (ver components/TopbarClient.js).
export default async function EspacioPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const nombreCompleto = profile?.full_name || "";
  const nombre = nombreCompleto.split(" ")[0] || "";

  // Notificación de App Interno (ítem 6 del feedback de v14, 22-sep-2026):
  // reune TODOS los pendientes que ya existen en Inicio -- facturar,
  // inspecciones y mantenimientos vencidos -- con la misma consulta que
  // usa app/dashboard/page.js (lib/notificaciones.js), para que ambas
  // pantallas siempre digan lo mismo.
  const { pendientesFacturar, tanquesVencidos, reguladoresVencidos } =
    await obtenerPendientesInterno(supabase, profile);
  const { ordenesPorTrabajar, ordenesPorDespachar } = await obtenerPendientesClientes(supabase, profile);

  const lineasClientes = [];
  if (ordenesPorTrabajar > 0) {
    lineasClientes.push(
      `${ordenesPorTrabajar} orden${ordenesPorTrabajar === 1 ? "" : "es"} pendiente${
        ordenesPorTrabajar === 1 ? "" : "s"
      } por trabajar`
    );
  }
  if (ordenesPorDespachar > 0) {
    lineasClientes.push(
      `${ordenesPorDespachar} orden${ordenesPorDespachar === 1 ? "" : "es"} pendiente${
        ordenesPorDespachar === 1 ? "" : "s"
      } por despachar`
    );
  }

  const lineasInterno = [];
  if (pendientesFacturar > 0) {
    lineasInterno.push(
      `${pendientesFacturar} llenado${pendientesFacturar === 1 ? "" : "s"} pendiente${
        pendientesFacturar === 1 ? "" : "s"
      } por facturar`
    );
  }
  if (tanquesVencidos > 0) {
    lineasInterno.push(`${tanquesVencidos} tanque${tanquesVencidos === 1 ? "" : "s"} con inspección vencida`);
  }
  if (reguladoresVencidos > 0) {
    lineasInterno.push(
      `${reguladoresVencidos} regulador${reguladoresVencidos === 1 ? "" : "es"} con mantenimiento vencido`
    );
  }

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
            <div className="espacio-notif">
              {lineasClientes.length > 0 ? (
                lineasClientes.map((linea) => (
                  <div className="espacio-notif-alerta" key={linea}>
                    {linea}
                  </div>
                ))
              ) : (
                "Sin novedades."
              )}
            </div>
          </Link>

          <Link href="/dashboard" className="card espacio-card">
            <div className="espacio-icon">
              <IconPackage size={22} />
            </div>
            <div className="espacio-title">App Interno</div>
            <div className="espacio-notif">
              {lineasInterno.length > 0 ? (
                lineasInterno.map((linea) => (
                  <div className="espacio-notif-alerta" key={linea}>
                    {linea}
                  </div>
                ))
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
