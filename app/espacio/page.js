import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { obtenerPendientesInterno, obtenerPendientesClientes } from "@/lib/notificaciones";
import HeaderSimple from "@/components/HeaderSimple";
import { IconUsers, IconWrench, IconDivingMask } from "@/components/icons";

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

  // Accesos a apps (26-sep-2026, pedido explícito: "quien no tenga el
  // acceso pues que no le salga el boton del app") -- cada tarjeta solo
  // se muestra si el perfil tiene ese acceso (el Titular siempre tiene
  // los dos, vía tieneAcceso). Se controla desde /espacio/accesos.
  const tieneClientes = tieneAcceso(profile, "equipos_clientes");
  const tieneInterno = tieneAcceso(profile, "acceso_app_interno");

  // Conteo de cuentas esperando aprobación (item 10, 1-oct-2026) -- solo
  // le hace falta al Titular, para el badge del menú de ajustes.
  let pendientesAprobacion = 0;
  if (profile?.es_titular) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("aprobado", false);
    pendientesAprobacion = count || 0;
  }

  // Notificación de App Interno (ítem 6 del feedback de v14, 22-sep-2026):
  // reune TODOS los pendientes que ya existen en Inicio -- facturar,
  // inspecciones y mantenimientos vencidos -- con la misma consulta que
  // usa app/dashboard/page.js (lib/notificaciones.js), para que ambas
  // pantallas siempre digan lo mismo.
  const { pendientesFacturar, tanquesVencidos, reguladoresVencidos } =
    await obtenerPendientesInterno(supabase, profile);
  const { ordenesPorTrabajar, ordenesPorDespachar, ordenesEnEspera, ordenesEnHidrostatica, ordenesEnReparacion } =
    await obtenerPendientesClientes(supabase, profile);

  // Pedido explícito, 23-sep-2026: "pon que en esta seccion aparezcan
  // todas las notifcaciones posibles" -- antes solo se veían por
  // trabajar/por despachar; ahora se agregan las 3 secciones que ya
  // existían en el hub de Inicio (en espera, prueba hidrostática,
  // reparación) pero nunca se reflejaban acá.
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
  if (ordenesEnEspera > 0) {
    // "en Hold" (pedido explícito, ronda grande de feedback, 27-sep-2026:
    // renombrar "En espera" a "En Hold" en toda la app).
    lineasClientes.push(
      `${ordenesEnEspera} orden${ordenesEnEspera === 1 ? "" : "es"} en Hold`
    );
  }
  if (ordenesEnHidrostatica > 0) {
    lineasClientes.push(
      `${ordenesEnHidrostatica} orden${ordenesEnHidrostatica === 1 ? "" : "es"} en prueba hidrostática`
    );
  }
  if (ordenesEnReparacion > 0) {
    lineasClientes.push(
      `${ordenesEnReparacion} orden${ordenesEnReparacion === 1 ? "" : "es"} enviada${
        ordenesEnReparacion === 1 ? "" : "s"
      } a reparación`
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

  // Cuántas tarjetas se van a mostrar en total -- determina si el grid de
  // 2 columnas se centra como una sola tarjeta chica (pedido explícito,
  // 26-sep-2026: "se ve como una mitad vacía del grid de 2"). "Viajes/
  // Buceos" (ver más abajo) cuenta siempre, porque es visible para
  // cualquiera, sin permiso (feedback en vivo, 6-oct-2026, pedido
  // explícito: "todos con acceso al selector") -- por eso ya no hace
  // falta el caso aparte de "sin acceso a ninguna app": ahora siempre hay
  // al menos esa tarjeta para mostrar.
  const totalTarjetas = (tieneClientes ? 1 : 0) + (tieneInterno ? 1 : 0) + 1;
  const soloUna = totalTarjetas === 1;

  return (
    <div>
      <HeaderSimple
        nombre={nombre}
        etiqueta="Selecciona tu espacio"
        esTitular={!!profile?.es_titular}
        pendientesAprobacion={pendientesAprobacion}
      />
      <div className="page" style={{ paddingTop: 24 }}>
        <h1 className="page-title">¿A dónde quieres entrar?</h1>

        {/* Mensaje de "sin acceso a las apps principales" (26-sep-2026,
            pedido explícito) -- ya no reemplaza toda la pantalla, porque
            siempre hay al menos la tarjeta de Viajes/Buceos para mostrar
            debajo; se deja como aviso aparte arriba del grid. */}
        {!tieneClientes && !tieneInterno && (
          <div className="card" style={{ marginTop: 18 }}>
            <div className="empty">Todavía no tienes acceso a las apps principales. Habla con el Titular.</div>
          </div>
        )}

        <div
          className="espacio-grid"
          style={soloUna ? { gridTemplateColumns: "1fr", maxWidth: 280, margin: "18px auto 0" } : undefined}
        >
          {tieneClientes && (
            <Link href="/app-clientes" className="card espacio-card">
              <div className="espacio-icon">
                <IconUsers size={22} />
              </div>
              <div className="espacio-title">App Equipos de clientes</div>
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
          )}

          {tieneInterno && (
            <Link href="/dashboard" className="card espacio-card">
              <div className="espacio-icon">
                <IconWrench size={22} />
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
          )}

          {/* "Viajes/Buceos" (6-oct-2026, pedido explícito: "quiero agregar
              un boton para hacer un app nuevo mas adelante... junto con
              los botones de los app") -- placeholder visible para
              cualquiera que llegue a /espacio, sin permiso propio todavía
              (mismo patrón que tuvo "App Equipos de clientes" cuando era
              solo una idea, ver comentario al inicio de este archivo).
              Lleva a /viajes-buceos, una pantalla de "Próximamente". */}
          <Link href="/viajes-buceos" className="card espacio-card">
            <div className="espacio-icon">
              <IconDivingMask size={22} />
            </div>
            <div className="espacio-title">Viajes/Buceos</div>
            <div className="espacio-badge">Próximamente</div>
            <div className="espacio-notif">Aún en construcción.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
