import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfileYUser, tieneAcceso, esOperativo, esTecnico } from "@/lib/roles";
import { obtenerPendientesInterno, obtenerPendientesClientes } from "@/lib/notificaciones";
import HeaderSimple from "@/components/HeaderSimple";
import { IconUsers, IconTiendaTanque, IconBuzos, IconAlquiler } from "@/components/icons";

// Ítem 7 del backlog (22-sep-2026): pantalla que aparece justo después de
// iniciar sesión, para elegir en qué espacio entrar -- "App Clientes"
// (proyecto nuevo, todavía sin construir, placeholder "próximamente") a la
// izquierda y "App Interno" (todo lo que existe hoy: salidas, equipos,
// reportes, etc.) a la derecha, cada uno con sus notificaciones debajo.
// No reemplaza /dashboard -- solo se muestra una vez al entrar; desde
// dentro de App Interno se puede volver aquí con "Cambiar de app" en el
// menú de ajustes (ver components/TopbarClient.js).
// V37: íconos de las tarjetas más grandes (antes 22), todos iguales.
const TAM_ICONO = 30;

export default async function EspacioPage({ searchParams }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  // Operativo (V30): no elige app -- entra directo a su única pantalla.
  // V33 (pedido explícito: "que el operario entre directo a su área"): ahora
  // SIEMPRE, aunque también tenga acceso a App Equipos de clientes (en V31 a
  // ese le salía primero este selector). Si tiene las dos apps, cambia con
  // ⚙ › "Cambiar de app", que llega aquí con ?elegir=1.
  if (esOperativo(profile) && searchParams?.elegir !== "1") redirect("/dashboard");
  // V34: el técnico también entra directo a "Mis órdenes asignadas",
  // mientras solo tenga App Equipos de clientes (el día que tenga App
  // Interno, le sale este selector para escoger).
  // V38 (pedido explícito: "que su menú principal sea diferente y contenga
  // todo lo que le corresponde"): el técnico entra directo a su menú, tenga
  // o no App Interno. Desde ahí, "Entrar al app completo" lo trae aquí.
  if (esTecnico(profile) && searchParams?.elegir !== "1") {
    redirect("/tecnico");
  }
  const tecnico = esTecnico(profile);
  const nombreCompleto = profile?.full_name || "";
  const nombre = nombreCompleto.split(" ")[0] || "";

  // Accesos a apps (26-sep-2026, pedido explícito: "quien no tenga el
  // acceso pues que no le salga el boton del app") -- cada tarjeta solo
  // se muestra si el perfil tiene ese acceso (el Titular siempre tiene
  // los dos, vía tieneAcceso). Se controla desde /espacio/accesos.
  const tieneClientes = tieneAcceso(profile, "equipos_clientes");
  const tieneInterno = tieneAcceso(profile, "acceso_app_interno");
  // V35 (migration_69.sql): Viajes/Buceos ya no le sale a todo el mundo,
  // solo a quien tenga el acceso (el Titular siempre).
  const tieneViajes = tieneAcceso(profile, "acceso_viajes");
  // V37: Alquiler, mismo patrón (migration_70.sql).
  const tieneAlquiler = tieneAcceso(profile, "acceso_alquiler");

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
  const {
    pendientesFacturar,
    tanquesVencidos,
    reguladoresVencidos,
    hidroVencidas,
    hidroPorVencer,
    recordatoriosVencidos,
    recordatoriosPronto,
  } = await obtenerPendientesInterno(supabase, profile);
  const { ordenesPorTrabajar, ordenesPorDespachar, ordenesEnEspera, ordenesEnHidrostatica, ordenesEnReparacion } =
    await obtenerPendientesClientes(supabase, profile);

  // Pedido explícito, 23-sep-2026: "pon que en esta seccion aparezcan
  // todas las notifcaciones posibles" -- antes solo se veían por
  // trabajar/por despachar; ahora se agregan las 3 secciones que ya
  // existían en el hub de Inicio (en espera, prueba hidrostática,
  // reparación) pero nunca se reflejaban acá.
  // V34 -- "N órdenes asignadas a ti" (maqueta-v34.html, parte D). Al
  // técnico solo le sale esta línea; a los demás, además de las de siempre.
  let asignadasAMi = 0;
  if (tieneClientes && profile?.id) {
    const { count } = await supabase
      .from("ordenes_equipos")
      .select("id", { count: "exact", head: true })
      .eq("tecnico_asignado_id", profile.id)
      .neq("estado", "Entregado");
    asignadasAMi = count || 0;
  }
  const soloAsignadas = esTecnico(profile);

  // V44 -- Viajes/Buceos ya está en uso (V42): la tarjeta decía todavía
  // "Próximamente". Ahora: los avisos sin leer (migration_72.sql) y el
  // próximo viaje. Si falta la migración, simplemente no sale esa línea.
  const lineasViajes = [];
  let proximoViaje = "";
  if (tieneViajes && profile?.id) {
    const { count: avisosViajes, error: eAv } = await supabase
      .from("viajes_notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("leida", false);
    if (!eAv && avisosViajes > 0) lineasViajes.push(`${avisosViajes} aviso${avisosViajes === 1 ? "" : "s"} nuevo${avisosViajes === 1 ? "" : "s"}`);
    const hoy = new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
    const { data: prox } = await supabase
      .from("viajes")
      .select("nombre, fecha, estado")
      .gte("fecha", hoy)
      .in("estado", ["abierto", "cerrado_insc"])
      .order("fecha")
      .limit(1);
    if (prox?.[0]) {
      const [a, m, d] = prox[0].fecha.split("-").map(Number);
      const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      proximoViaje = `Próximo: ${prox[0].nombre.split(/[,(]/)[0].trim()} · ${d} ${MES[m - 1]}`;
    }
  }

  const lineasClientes = [];
  if (asignadasAMi > 0) {
    lineasClientes.push(`${asignadasAMi} orden${asignadasAMi === 1 ? "" : "es"} asignada${asignadasAMi === 1 ? "" : "s"} a ti`);
  }
  if (!soloAsignadas && ordenesPorTrabajar > 0) {
    lineasClientes.push(
      `${ordenesPorTrabajar} orden${ordenesPorTrabajar === 1 ? "" : "es"} pendiente${
        ordenesPorTrabajar === 1 ? "" : "s"
      } por trabajar`
    );
  }
  if (!soloAsignadas && ordenesPorDespachar > 0) {
    lineasClientes.push(
      `${ordenesPorDespachar} orden${ordenesPorDespachar === 1 ? "" : "es"} pendiente${
        ordenesPorDespachar === 1 ? "" : "s"
      } por despachar`
    );
  }
  if (!soloAsignadas && ordenesEnEspera > 0) {
    // "en Hold" (pedido explícito, ronda grande de feedback, 27-sep-2026:
    // renombrar "En espera" a "En Hold" en toda la app).
    lineasClientes.push(
      `${ordenesEnEspera} orden${ordenesEnEspera === 1 ? "" : "es"} en Hold`
    );
  }
  if (!soloAsignadas && ordenesEnHidrostatica > 0) {
    lineasClientes.push(
      `${ordenesEnHidrostatica} orden${ordenesEnHidrostatica === 1 ? "" : "es"} en prueba hidrostática`
    );
  }
  if (!soloAsignadas && ordenesEnReparacion > 0) {
    lineasClientes.push(
      `${ordenesEnReparacion} orden${ordenesEnReparacion === 1 ? "" : "es"} enviada${
        ordenesEnReparacion === 1 ? "" : "s"
      } a reparación`
    );
  }

  const lineasInterno = [];
  // V37: recordatorios de compresores ("2 recordatorios de compresores").
  const recordatoriosTotal = (recordatoriosVencidos || 0) + (recordatoriosPronto || 0);
  if (recordatoriosTotal > 0) {
    lineasInterno.push(`${recordatoriosTotal} recordatorio${recordatoriosTotal === 1 ? "" : "s"} de compresores`);
  }
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
  if (hidroVencidas > 0) {
    lineasInterno.push(
      `${hidroVencidas} tanque${hidroVencidas === 1 ? "" : "s"} con prueba hidrostática vencida`
    );
  }
  if (hidroPorVencer > 0) {
    lineasInterno.push(
      `${hidroPorVencer} tanque${hidroPorVencer === 1 ? "" : "s"} con prueba hidrostática por vencer`
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
  // V35: Viajes/Buceos ahora también depende de su acceso.
  const totalTarjetas = (tieneClientes ? 1 : 0) + (tieneInterno ? 1 : 0) + (tieneViajes ? 1 : 0) + (tieneAlquiler ? 1 : 0);
  const soloUna = totalTarjetas === 1;

  return (
    <div>
      <HeaderSimple
        nombre={nombre}
        etiqueta="Selecciona tu espacio"
        sinBarra
        esTitular={!!profile?.es_titular}
        pendientesAprobacion={pendientesAprobacion}
        enlaces={profile?.es_titular || profile?.is_admin ? [{ href: "/tecnico", texto: "Ver el menú del técnico" }] : []}
      />
      <div className="page" style={{ paddingTop: 24 }}>
        {/* V38: el técnico vuelve a su menú desde aquí. */}
        {tecnico && (
          <Link href="/tecnico" className="btn btn-primary" style={{ display: "flex", justifyContent: "center", marginBottom: 16, textDecoration: "none" }}>
            ← Volver a mi menú
          </Link>
        )}
        <h1 className="page-title">¿A dónde quieres entrar?</h1>

        {/* Mensaje de "sin acceso a las apps principales" (26-sep-2026,
            pedido explícito) -- ya no reemplaza toda la pantalla, porque
            siempre hay al menos la tarjeta de Viajes/Buceos para mostrar
            debajo; se deja como aviso aparte arriba del grid. */}
        {totalTarjetas === 0 ? (
          <div className="card" style={{ marginTop: 18 }}>
            <div className="empty">Todavía no tienes acceso a ninguna app. Habla con el Titular.</div>
          </div>
        ) : (
          !tieneClientes &&
          !tieneInterno && (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="empty">Todavía no tienes acceso a las apps principales. Habla con el Titular.</div>
            </div>
          )
        )}

        <div
          className="espacio-grid"
          style={soloUna ? { gridTemplateColumns: "1fr", maxWidth: 280, margin: "18px auto 0" } : undefined}
        >
          {tieneClientes && (
            <Link href="/app-clientes" className="card espacio-card">
              <div className="espacio-icon espacio-icon-clientes">
                <IconUsers size={TAM_ICONO} />
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
              <div className="espacio-icon espacio-icon-interno">
                <IconTiendaTanque size={TAM_ICONO} />
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
              Desde V42 es el app de verdad; V44: avisos y próximo viaje. */}
          {tieneViajes && (
            <Link href="/viajes-buceos" className="card espacio-card">
              <div className="espacio-icon espacio-icon-viajes">
                <IconBuzos size={TAM_ICONO} />
              </div>
              <div className="espacio-title">Buceos</div>
              <div className="espacio-notif">
                {lineasViajes.map((linea) => (
                  <div className="espacio-notif-alerta" key={linea}>
                    {linea}
                  </div>
                ))}
                {proximoViaje || (lineasViajes.length ? "" : "Sin buceos próximos.")}
              </div>
            </Link>
          )}

          {/* V37 -- "Alquiler" (pedido explícito: "debajo de app interno...
              ponlo coming soon"): queda debajo de App Interno porque va
              después de Viajes en la cuadrícula de 2. Rojo GUS (#CD392A). */}
          {tieneAlquiler && (
            <Link href="/alquiler" className="card espacio-card">
              <div className="espacio-icon espacio-icon-alquiler">
                <IconAlquiler size={TAM_ICONO} />
              </div>
              <div className="espacio-title">Alquiler</div>
              <div className="espacio-badge">Próximamente</div>
              <div className="espacio-notif">Aún en construcción.</div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
