import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RegistroActions from "@/components/RegistroActions";
import { formatFecha } from "@/lib/format";

export default async function MantenimientoReguladoresPage({ searchParams }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeRegistrar = tieneAcceso(profile, "registrar_mantenimiento");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  const reguladorId = searchParams?.regulador || null;

  let query = supabase.from("mantenimientos_con_nombre").select("*").limit(200);
  if (reguladorId) {
    query = query.eq("regulador_id", reguladorId);
  }
  const { data: mantenimientos } = await query;

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Mantenimiento de reguladores" }]} />

        {reguladorId && (
          <div className="hint-text" style={{ marginTop: -8, marginBottom: 12 }}>
            Mostrando solo mantenimientos de este regulador ·{" "}
            <Link href="/equipos/mantenimiento-reguladores">Ver todos</Link>
          </div>
        )}

        {puedeRegistrar && (
          <Link href="/equipos/mantenimiento-reguladores/nueva">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
              + Registrar mantenimiento
            </button>
          </Link>
        )}

        <div className="card">
          {mantenimientos && mantenimientos.length > 0 ? (
            mantenimientos.map((m) => (
              <div className="list-item" key={m.id}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    <span className="folio-tag">#{m.folio}</span>
                    Mantenimiento de regulador
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="list-item-qty">{m.regulador_codigo_snapshot}</span>
                    {puedeEditar && (
                      <RegistroActions
                        tabla="mantenimientos_reguladores"
                        registro={m}
                        editHref={`/equipos/mantenimiento-reguladores/${m.id}/editar`}
                      />
                    )}
                  </div>
                </div>
                <div className="list-item-meta">
                  {m.full_name} · {formatFecha(m.created_at)}
                </div>
                <div className="list-item-meta">
                  {[
                    `Limpieza ultrasonido: ${m.limpieza_ultrasonido ? "Sí" : "No"}`,
                    `Presión intermedia: ${m.presion_intermedia ? "Sí" : "No"}`,
                    `O-rings: ${m.o_rings || "Ninguno"}`,
                  ].join(" · ")}
                </div>
                {m.detalle && <div className="list-item-note">{m.detalle}</div>}
              </div>
            ))
          ) : (
            <div className="empty">Aún no hay mantenimientos registrados.</div>
          )}
        </div>
      </div>
    </div>
  );
}
