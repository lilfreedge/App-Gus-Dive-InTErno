import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import RegistroActions from "@/components/RegistroActions";

export default async function TanquesPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [{ data: llenados }, { data: delMes }] = await Promise.all([
    supabase.from("llenados_con_nombre").select("*").limit(200),
    supabase
      .from("llenados_tanques")
      .select("cantidad")
      .gte("created_at", inicioMes.toISOString()),
  ]);

  const totalMes = (delMes || []).reduce((acc, r) => acc + Number(r.cantidad), 0);
  const totalGeneral = (llenados || []).reduce((acc, r) => acc + Number(r.cantidad), 0);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Conteo de tanques llenados</h1>
        <p className="page-subtitle">Llenados internos realizados en la tienda.</p>

        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-value">{totalMes}</div>
            <div className="stat-label">Tanques este mes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalGeneral}</div>
            <div className="stat-label">Total histórico (últimos 200)</div>
          </div>
        </div>

        <Link href="/tanques/nuevo">
          <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
            + Registrar llenado
          </button>
        </Link>

        <div className="card">
          {llenados && llenados.length > 0 ? (
            llenados.map((t) => (
              <div className="list-item" key={t.id}>
                <div className="list-item-top">
                  <span className="list-item-title">{t.full_name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="list-item-qty">{t.cantidad} tanque(s)</span>
                    {profile?.is_admin && (
                      <RegistroActions
                        tabla="llenados_tanques"
                        registro={t}
                        editHref={`/tanques/${t.id}/editar`}
                      />
                    )}
                  </div>
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
