import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RegistroActions from "@/components/RegistroActions";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO, sumarDias } from "@/lib/fechas";

export default async function InspeccionVisualPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeRegistrar = tieneAcceso(profile, "registrar_inspeccion");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  const [{ data: inspecciones }, { data: tanques }] = await Promise.all([
    supabase.from("inspecciones_con_nombre").select("*").limit(200),
    // Ítem 14 del feedback de v16 (22-sep-2026): abajo de la lista de
    // inspecciones registradas, dos avisos aparte -- tanques que necesitan
    // inspección (nunca tuvieron una, o la tienen vencida) y tanques a los
    // que les faltan 2 semanas o menos para que venza la suya.
    supabase
      .from("tanques_alquiler")
      .select("id, codigo, proxima_inspeccion")
      .eq("activo", true)
      .order("proxima_inspeccion", { ascending: true, nullsFirst: true }),
  ]);

  const hoy = hoyISO();
  const limite = sumarDias(hoy, 14);
  const tanquesPendientes = (tanques || []).filter(
    (t) => !t.proxima_inspeccion || t.proxima_inspeccion < hoy
  );
  const tanquesProximos = (tanques || []).filter(
    (t) => t.proxima_inspeccion && t.proxima_inspeccion >= hoy && t.proxima_inspeccion <= limite
  );

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Inspección visual" }]} />

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

        {tanquesPendientes.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>
              Tanques pendientes por inspección visual
            </div>
            <div className="card">
              {tanquesPendientes.map((t) => (
                <div className="list-item" key={t.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">{t.codigo}</span>
                    <span className="badge badge-rojo">
                      {t.proxima_inspeccion
                        ? `Vencida desde ${formatFechaDDMMAAAADeDate(t.proxima_inspeccion)}`
                        : "Nunca inspeccionado"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tanquesProximos.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>
              Inspección visual próxima a vencer (2 semanas o menos)
            </div>
            <div className="card">
              {tanquesProximos.map((t) => (
                <div className="list-item" key={t.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">{t.codigo}</span>
                    <span className="list-item-qty">{formatFechaDDMMAAAADeDate(t.proxima_inspeccion)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
