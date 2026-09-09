import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import RegistroActions from "@/components/RegistroActions";
import { formatFecha } from "@/lib/format";

export default async function TanquesPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  const { data: llenados } = await supabase.from("llenados_con_nombre").select("*").limit(200);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Tanques</h1>

        <Link href="/tanques/nuevo">
          <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
            + Registrar llenados
          </button>
        </Link>

        <div className="card">
          {llenados && llenados.length > 0 ? (
            llenados.map((t) => (
              <div className="list-item" key={t.id}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    <span className="folio-tag">#{t.folio}</span>
                    Llenados de tanque
                    <span className="badge">{t.tipo_gas}</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="list-item-qty">{t.cantidad} tanque(s)</span>
                    {puedeEditar && (
                      <RegistroActions
                        tabla="llenados_tanques"
                        registro={t}
                        editHref={`/tanques/${t.id}/editar`}
                      />
                    )}
                  </div>
                </div>
                <div className="list-item-meta">
                  {t.full_name} · {formatFecha(t.created_at)}
                </div>
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
