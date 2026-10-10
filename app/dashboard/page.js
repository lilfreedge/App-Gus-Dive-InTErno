import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso, esOperativo } from "@/lib/roles";
import { seccionesVisibles } from "@/lib/nav";
import { obtenerPendientesInterno } from "@/lib/notificaciones";
import AppHeader from "@/components/AppHeader";
import { IconPackage, IconTank, IconAlert, IconLock } from "@/components/icons";
import InicioOperativo from "./operativo";

const ETIQUETAS_PERIODO = {
  semana: "esta semana",
  mes: "este mes",
  anio: "este año",
};

export default async function DashboardPage({ searchParams }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  // Acceso a App Interno (26-sep-2026, pedido explícito: nueva pantalla
  // "Accesos a apps" desde /espacio -- "quien no tenga el acceso pues
  // que no le salga el boton del app"). /dashboard nunca había tenido un
  // gate propio -- se agrega aquí, en la entrada de la app, y no con
  // requirePermiso (que manda de vuelta a /dashboard, un loop) sino con
  // este redirect a /espacio. migration_28.sql le puso este permiso en
  // true a todos los perfiles ya existentes, así que nadie que ya
  // estuviera usando App Interno se queda afuera de golpe.
  if (!tieneAcceso(profile, "acceso_app_interno")) {
    redirect("/espacio");
  }
  // Rol Operativo (V30, pedido explícito: "En inicio reestructúralo
  // completo y hazlo dedicado para ese rol... solo tendrá una ventana"):
  // su Inicio es otra pantalla, la única que tiene.
  if (esOperativo(profile)) {
    return <InicioOperativo profile={profile} />;
  }

  // V30 (pedido explícito: "si alguien no tiene permiso de registrar
  // salida ni tanque, que no aparezcan esos botones en inicio. Y si
  // alguien solo tiene 1 permiso, que solo salga ese, centralizado"):
  // botones, números, "Artículos más sacados" y la actividad reciente
  // salen según lo que cada quien puede ver.
  const puedeSalidas = tieneAcceso(profile, "registrar_salida");
  const puedeRegistrarLlenado = tieneAcceso(profile, "registrar_llenado");
  const puedeVerLlenados = puedeRegistrarLlenado || tieneAcceso(profile, "facturacion");
  const puedeVerTodoMovimientos = tieneAcceso(profile, "movimientos");
  // Sin ninguna sección habilitada (solo "Inicio" en el menú de arriba):
  // en vez de una pantalla vacía, un aviso.
  const sinSecciones =
    seccionesVisibles({ esTitular: !!profile?.es_titular, permisos: profile?.permisos || {} }).length <= 1;

  // "Ver movimientos" (destino de las tarjetas de "Artículos más sacados")
  // es solo para Titular/Administrador — mismo gate que en Catálogo.
  const puedeVerMovimientos = !!(profile?.is_admin || profile?.es_titular);
  const puedeFacturar = tieneAcceso(profile, "facturacion");

  const periodoParam = searchParams?.periodo;
  const periodo = periodoParam === "mes" || periodoParam === "anio" ? periodoParam : "semana";

  const desde = new Date();
  if (periodo === "anio") desde.setDate(desde.getDate() - 365);
  else if (periodo === "mes") desde.setDate(desde.getDate() - 30);
  else desde.setDate(desde.getDate() - 7);

  const [salidasRes, tanquesRes, ultimasSalidas, ultimosTanques, pendientes] =
    await Promise.all([
      puedeSalidas
        ? supabase
            .from("salidas")
            .select("articulo, articulo_id, cantidad")
            .gte("created_at", desde.toISOString())
            .limit(1000)
        : Promise.resolve({ data: [] }),
      puedeVerLlenados
        ? supabase
            .from("llenados_tanques")
            .select("cantidad")
            .gte("created_at", desde.toISOString())
            .limit(1000)
        : Promise.resolve({ data: [] }),
      puedeSalidas ? supabase.from("salidas_con_nombre").select("*").limit(8) : Promise.resolve({ data: [] }),
      puedeVerLlenados ? supabase.from("llenados_con_nombre").select("*").limit(8) : Promise.resolve({ data: [] }),
      // Notificaciones operativas (pendiente por facturar, inspecciones/
      // mantenimientos vencidos): sin importar el periodo (semana/mes/
      // año) del dashboard -- son alertas del momento, no estadísticas del
      // periodo. Lógica compartida con /espacio en lib/notificaciones.js.
      obtenerPendientesInterno(supabase, profile),
    ]);

  const totalSalidas = (salidasRes.data || []).length;
  const totalTanques = (tanquesRes.data || []).reduce(
    (acc, r) => acc + Number(r.cantidad),
    0
  );
  const totalPendientesFacturar = pendientes.pendientesFacturar;
  const { tanquesVencidos, reguladoresVencidos, hidroVencidas, hidroPorVencer } = pendientes;

  const topArticulos = calcularTopArticulos(salidasRes.data || []).slice(0, 3);

  const actividad = [
    ...(ultimasSalidas.data || []).map((s) => ({
      tipo: "salida",
      id: s.id,
      created_at: s.created_at,
      full_name: s.full_name,
      titulo: s.articulo,
      cantidad: s.cantidad,
      detalle: s.motivo,
    })),
    ...(ultimosTanques.data || []).map((t) => ({
      tipo: "tanque",
      id: t.id,
      created_at: t.created_at,
      full_name: t.full_name,
      titulo: "Llenado de tanque",
      cantidad: t.cantidad,
      detalle: t.nota,
    })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  return (
    <div>
      <AppHeader />

      <div className="page">
        {sinSecciones && (
          <div className="card" style={{ textAlign: "center", padding: "28px 18px" }}>
            <div style={{ color: "var(--texto-suave)", marginBottom: 8 }}>
              <IconLock size={26} />
            </div>
            <div style={{ fontWeight: 700, color: "var(--azul-texto)", marginBottom: 4 }}>
              Todavía no tienes secciones habilitadas
            </div>
            <div className="hint-text" style={{ marginTop: 0 }}>
              Pídele al Titular que te dé acceso a lo que vas a usar.
            </div>
          </div>
        )}

        {(puedeSalidas || puedeVerLlenados) && (
        <div className="period-toggle">
          {["semana", "mes", "anio"].map((p) => (
            <Link
              key={p}
              href={`/dashboard?periodo=${p}`}
              className={"period-btn" + (periodo === p ? " period-btn-active" : "")}
            >
              {p === "semana" ? "Semana" : p === "mes" ? "Mes" : "Año"}
            </Link>
          ))}
        </div>
        )}

        {puedeFacturar && totalPendientesFacturar > 0 && (
          <Link
            href="/tanques"
            className="error-box"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <IconAlert size={18} />
            {totalPendientesFacturar} llenado{totalPendientesFacturar === 1 ? "" : "s"} pendiente
            {totalPendientesFacturar === 1 ? "" : "s"} por facturar
          </Link>
        )}

        {tanquesVencidos > 0 && (
          <Link
            href="/equipos/inspeccion-visual"
            className="error-box"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <IconAlert size={18} />
            {tanquesVencidos} tanque{tanquesVencidos === 1 ? "" : "s"} con inspección vencida
          </Link>
        )}

        {reguladoresVencidos > 0 && (
          <Link
            href="/equipos/mantenimiento-reguladores"
            className="error-box"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <IconAlert size={18} />
            {reguladoresVencidos} regulador{reguladoresVencidos === 1 ? "" : "es"} con mantenimiento
            vencido
          </Link>
        )}

        {hidroVencidas > 0 && (
          <Link
            href="/equipos/pruebas-hidrostaticas"
            className="error-box"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <IconAlert size={18} />
            {hidroVencidas} tanque{hidroVencidas === 1 ? "" : "s"} con prueba hidrostática vencida
          </Link>
        )}

        {/* Aviso con 2 meses de anticipación (V29, pedido explícito) -- en
            ámbar, para distinguirlo de lo que ya está vencido (rojo). */}
        {hidroPorVencer > 0 && (
          <Link
            href="/equipos/pruebas-hidrostaticas"
            className="aviso-box"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <IconAlert size={18} />
            {hidroPorVencer} tanque{hidroPorVencer === 1 ? "" : "s"} con prueba hidrostática por vencer (2 meses o
            menos)
          </Link>
        )}

        {(puedeSalidas || puedeVerLlenados) && (
          <div
            className="stat-row"
            style={puedeSalidas && puedeVerLlenados ? undefined : { gridTemplateColumns: "1fr" }}
          >
            {puedeSalidas && (
              <div className="stat-card">
                <div className="stat-value">{totalSalidas}</div>
                <div className="stat-label">Salidas {ETIQUETAS_PERIODO[periodo]}</div>
              </div>
            )}
            {puedeVerLlenados && (
              <div className="stat-card">
                <div className="stat-value">{totalTanques}</div>
                <div className="stat-label">Tanques llenados {ETIQUETAS_PERIODO[periodo]}</div>
              </div>
            )}
          </div>
        )}

        {/* Un solo botón: centrado, del mismo ancho que cuando son dos. */}
        {(puedeSalidas || puedeRegistrarLlenado) && (
          <div
            className="grid-actions"
            style={
              puedeSalidas && puedeRegistrarLlenado
                ? undefined
                : { gridTemplateColumns: "minmax(0, calc(50% - 6px))", justifyContent: "center" }
            }
          >
            {puedeSalidas && (
              <Link href="/salidas/nueva" className="action-card">
                <IconPackage size={26} />
                Registrar salida de pieza
              </Link>
            )}
            {puedeRegistrarLlenado && (
              <Link href="/tanques/nuevo" className="action-card">
                <IconTank size={26} />
                Registrar llenado de tanque
              </Link>
            )}
          </div>
        )}

        {topArticulos.length > 0 && (
          <>
            <div className="section-title">Artículos más sacados</div>
            <div className="card">
              {topArticulos.map((a) => {
                const contenido = (
                  <div className="list-item-top">
                    <span className="list-item-title">{a.nombre}</span>
                    <span className="list-item-qty">{a.total}</span>
                  </div>
                );
                // Solo Titular/Administrador pueden entrar a "Ver
                // movimientos" — para el resto la tarjeta se ve atenuada
                // y no es clickeable (no basta con confiar en el gate del
                // servidor en /catalogo/[id]/movimientos).
                if (puedeVerMovimientos && a.articuloId) {
                  return (
                    <Link
                      href={`/catalogo/${a.articuloId}/movimientos`}
                      className="list-item"
                      key={a.nombre}
                      style={{ display: "block" }}
                    >
                      {contenido}
                    </Link>
                  );
                }
                return (
                  <div className="list-item" key={a.nombre} style={{ opacity: 0.55 }}>
                    {contenido}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {(puedeSalidas || puedeVerLlenados) && (
        <>
        <div className="section-title">
          Actividad reciente
          {puedeVerTodoMovimientos && <Link href="/movimientos">Ver todo</Link>}
        </div>
        <div className="card">
          {actividad.length > 0 ? (
            actividad.map((a) => (
              <div className="list-item" key={a.tipo + a.id}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    {a.tipo === "salida" ? <IconPackage size={14} /> : <IconTank size={14} />}{" "}
                    {a.titulo}
                  </span>
                  <span className="list-item-qty">
                    {a.tipo === "salida" ? a.cantidad : `${a.cantidad} tanque(s)`}
                  </span>
                </div>
                <div className="list-item-meta">
                  {a.full_name} · {formatFecha(a.created_at)}
                </div>
                {a.detalle && <div className="list-item-note">{a.detalle}</div>}
              </div>
            ))
          ) : (
            <div className="empty">Aún no hay actividad registrada.</div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function calcularTopArticulos(salidas) {
  const totales = new Map();
  for (const s of salidas) {
    const clave = s.articulo;
    const actual = totales.get(clave) || { nombre: s.articulo, articuloId: s.articulo_id, total: 0 };
    actual.total += Number(s.cantidad);
    totales.set(clave, actual);
  }
  return Array.from(totales.values()).sort((a, b) => b.total - a.total);
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
