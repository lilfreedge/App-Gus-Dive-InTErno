import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RegistroActions from "@/components/RegistroActions";
import { formatFecha } from "@/lib/format";

export default async function InspeccionVisualPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeRegistrar = tieneAcceso(profile, "registrar_inspeccion");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  const { data: inspecciones } = await supabase
    .from("inspecciones_con_nombre")
    .select("*")
    .limit(200);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Inspección visual" }]} />
        <h1 className="page-title">Inspección visual</h1>

        {puedeRegistrar && (
          <Link href="/equipos/inspeccion-visual/nueva">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
              + Registrar inspección
            </button>
          </Link>
        )}

        <div className="card">
          {inspecciones && inspecciones.length > 0 ? (
            inspecciones.map((i) => (
              <div className="list-item" key={i.id}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    <span className="folio-tag">#{i.folio}</span>
                    Inspección visual
                    <span className={i.resultado === "Aprobado" ? "badge badge-verde" : "badge badge-rojo"}>
                      {i.resultado}
                    </span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="list-item-qty">{i.tanque_codigo_snapshot}</span>
                    {puedeEditar && (
                      <RegistroActions
                        tabla="inspecciones_visuales"
                        registro={i}
                        editHref={`/equipos/inspeccion-visual/${i.id}/editar`}
                      />
                    )}
                  </div>
                </div>
                <div className="list-item-meta">
                  {i.full_name} · {formatFecha(i.created_at)}
                </div>
                {i.nota && <div className="list-item-note">{i.nota}</div>}
              </div>
            ))
          ) : (
            <div className="empty">Aún no hay inspecciones registradas.</div>
          )}
        </div>
      </div>
    </div>
  );
}
