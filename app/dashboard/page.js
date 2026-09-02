import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import { IconPackage, IconTank } from "@/components/icons";

export default async function DashboardPage({ searchParams }) {
  const supabase = createClient();
  const periodo = searchParams?.periodo === "anio" ? "anio" : "semana";

  const desde = new Date();
  desde.setDate(desde.getDate() - (periodo === "anio" ? 365 : 7));

  const [salidasRes, tanquesRes, ultimasSalidas, ultimosTanques] =
    await Promise.all([
      supabase
        .from("salidas")
        .select("articulo, cantidad")
        .gte("created_at", desde.toISOString())
        .limit(1000),
      supabase
        .from("llenados_tanques")
        .select("cantidad")
        .gte("created_at", desde.toISOString())
        .limit(1000),
      supabase.from("salidas_con_nombre").select("*").limit(8),
      supabase.from("llenados_con_nombre").select("*").limit(8),
    ]);

  const totalSalidas = (salidasRes.data || []).length;
  const totalTanques = (tanquesRes.data || []).reduce(
    (acc, r) => acc + Number(r.cantidad),
    0
  );

  const topArticulos = calcularTopArticulos(salidasRes.data || []);

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
          <Link
            href="/dashboard?periodo=semana"
            className={"period-btn" + (periodo === "semana" ? " period-btn-active" : "")}
          >
            Esta semana
          </Link>
          <Link
            href="/dashboard?periodo=anio"
            className={"period-btn" + (periodo === "anio" ? " period-btn-active" : "")}
          >
            Este año
          </Link>
        </div>

        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-value">{totalSalidas}</div>
            <div className="stat-label">
              Salidas {periodo === "anio" ? "este año" : "esta semana"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalTanques}</div>
            <div className="stat-label">
              Tanques llenados {periodo === "anio" ? "este año" : "esta semana"}
            </div>
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
              {topArticulos.map((a) => (
                <div className="list-item" key={a.nombre}>
                  <div className="list-item-top">
                    <span className="list-item-title">{a.nombre}</span>
                    <span className="list-item-qty">{a.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-title">
          Actividad reciente
          <Link href="/salidas">Ver todo</Link>
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
                    {a.tipo === "salida" ? `x${a.cantidad}` : `${a.cantidad} tanque(s)`}
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
    const actual = totales.get(s.articulo) || 0;
    totales.set(s.articulo, actual + Number(s.cantidad));
  }
  return Array.from(totales.entries())
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
