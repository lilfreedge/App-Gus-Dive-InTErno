import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import { IconPackage, IconTank, IconAlert } from "@/components/icons";

const ETIQUETAS_PERIODO = {
  semana: "esta semana",
  mes: "este mes",
  anio: "este año",
};

export default async function DashboardPage({ searchParams }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
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

  const [salidasRes, tanquesRes, ultimasSalidas, ultimosTanques, pendientesRes] =
    await Promise.all([
      supabase
        .from("salidas")
        .select("articulo, articulo_id, cantidad")
        .gte("created_at", desde.toISOString())
        .limit(1000),
      supabase
        .from("llenados_tanques")
        .select("cantidad")
        .gte("created_at", desde.toISOString())
        .limit(1000),
      supabase.from("salidas_con_nombre").select("*").limit(8),
      supabase.from("llenados_con_nombre").select("*").limit(8),
      // Notificación de "pendiente por facturar": cuenta TODOS los llenados
      // sin facturar, sin importar el periodo (semana/mes/año) del dashboard
      // — es una alerta operativa, no una estadística del periodo.
      puedeFacturar
        ? supabase
            .from("llenados_tanques")
            .select("id", { count: "exact", head: true })
            .eq("facturado", false)
        : Promise.resolve({ count: 0 }),
    ]);

  const totalSalidas = (salidasRes.data || []).length;
  const totalTanques = (tanquesRes.data || []).reduce(
    (acc, r) => acc + Number(r.cantidad),
    0
  );
  const totalPendientesFacturar = pendientesRes.count || 0;

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

        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-value">{totalSalidas}</div>
            <div className="stat-label">Salidas {ETIQUETAS_PERIODO[periodo]}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalTanques}</div>
            <div className="stat-label">Tanques llenados {ETIQUETAS_PERIODO[periodo]}</div>
          </div>
        </div>

        <div className="grid-actions">
          <Link href="/salidas/nueva" className="action-card">
            <IconPackage size={26} />
            Registrar salida de pieza
          </Link>
          <Link href="/tanques/nuevo" className="action-card">
            <IconTank size={26} />
            Registrar llenado de tanque
          </Link>
        </div>

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

        <div className="section-title">
          Actividad reciente
          <Link href="/movimientos">Ver todo</Link>
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
