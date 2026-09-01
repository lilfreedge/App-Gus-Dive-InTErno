import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TopbarClient from "./topbar-client";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const nombre = profile?.full_name || user.email;
  const primerNombre = nombre.split(" ")[0];

  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const [salidasHoy, tanquesHoy, ultimasSalidas, ultimosTanques] =
    await Promise.all([
      supabase
        .from("salidas")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioHoy.toISOString()),
      supabase
        .from("llenados_tanques")
        .select("cantidad")
        .gte("created_at", inicioHoy.toISOString()),
      supabase
        .from("salidas_con_nombre")
        .select("*")
        .limit(4),
      supabase
        .from("llenados_con_nombre")
        .select("*")
        .limit(4),
    ]);

  const totalTanquesHoy = (tanquesHoy.data || []).reduce(
    (acc, r) => acc + Number(r.cantidad),
    0
  );

  return (
    <div>
      <TopbarClient nombre={primerNombre} />

      <div className="page">
        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-value">{salidasHoy.count ?? 0}</div>
            <div className="stat-label">Salidas registradas hoy</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalTanquesHoy}</div>
            <div className="stat-label">Tanques llenados hoy</div>
          </div>
        </div>

        <div className="grid-actions">
          <Link href="/salidas/nueva" className="action-card">
            <span className="action-icon">📦</span>
            Registrar salida de pieza
          </Link>
          <Link href="/tanques/nuevo" className="action-card">
            <span className="action-icon">🛢️</span>
            Registrar llenado de tanque
          </Link>
        </div>

        <div className="section-title">
          Últimas salidas
          <Link href="/salidas">Ver historial</Link>
        </div>
        <div className="card">
          {ultimasSalidas.data && ultimasSalidas.data.length > 0 ? (
            ultimasSalidas.data.map((s) => (
              <div className="list-item" key={s.id}>
                <div className="list-item-top">
                  <span className="list-item-title">{s.articulo}</span>
                  <span className="list-item-qty">x{s.cantidad}</span>
                </div>
                <div className="list-item-meta">
                  {s.full_name} · {formatFecha(s.created_at)} · {s.motivo}
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Aún no hay salidas registradas.</div>
          )}
        </div>

        <div className="section-title">
          Últimos llenados de tanques
          <Link href="/tanques">Ver historial</Link>
        </div>
        <div className="card">
          {ultimosTanques.data && ultimosTanques.data.length > 0 ? (
            ultimosTanques.data.map((t) => (
              <div className="list-item" key={t.id}>
                <div className="list-item-top">
                  <span className="list-item-title">{t.full_name}</span>
                  <span className="list-item-qty">{t.cantidad} tanque(s)</span>
                </div>
                <div className="list-item-meta">{formatFecha(t.created_at)}</div>
                {t.nota && <div className="list-item-note">{t.nota}</div>}
              </div>
            ))
          ) : (
            <div className="empty">Aún no hay llenados registrados.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
