import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RegistroActions from "@/components/RegistroActions";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO, sumarDias } from "@/lib/fechas";
import BuscadorLista from "@/components/BuscadorLista";
import { IconAlert } from "@/components/icons";
import { todasLasFilas } from "@/lib/todas-las-filas";

export default async function InspeccionVisualPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "registrar_inspeccion");
  // V32: "registrar_inspeccion" es para ver; registrar pide "inspeccion_registrar".
  const puedeRegistrar = tieneAcceso(profile, "inspeccion_registrar");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  // V35 (buscador en los historiales): todas, no solo las últimas 200.
  const [inspecciones, { data: tanques }] = await Promise.all([
    todasLasFilas(supabase, "inspecciones_con_nombre", (q) =>
      q.select("*").order("created_at", { ascending: false }).order("id")
    ),
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

        {/* V61 (nota del 3-nov): "pon los tanques pendientes arriba de primero,
            y la lista abajo con el search bar", con el mismo cuadro rojo que
            Mantenimiento de reguladores ("me gusta como se ve este listado"). */}
        {tanquesPendientes.length > 0 && (
          <div className="mant-pend">
            <div className="mant-pend-t">
              <IconAlert size={18} />
              {tanquesPendientes.length} tanque{tanquesPendientes.length === 1 ? "" : "s"} pendiente{tanquesPendientes.length === 1 ? "" : "s"} por inspección visual
            </div>
            <div className="mant-pend-lista">
              {tanquesPendientes.map((t) => {
                const contenido = (
                  <>
                    <b>{t.codigo}</b>
                    <span>{t.proxima_inspeccion ? `vencida desde ${formatFechaDDMMAAAADeDate(t.proxima_inspeccion)}` : "nunca inspeccionado"}</span>
                  </>
                );
                return puedeRegistrar ? (
                  <Link key={t.id} href={`/equipos/inspeccion-visual/nueva?tanque=${t.id}`} className="mant-pend-chip">
                    {contenido}
                  </Link>
                ) : (
                  <span key={t.id} className="mant-pend-chip">
                    {contenido}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {tanquesProximos.length > 0 && (
          <div className="mant-pend proximo">
            <div className="mant-pend-t">Próximos a vencer (2 semanas o menos)</div>
            <div className="mant-pend-lista">
              {tanquesProximos.map((t) => (
                <span key={t.id} className="mant-pend-chip">
                  <b>{t.codigo}</b>
                  <span>{formatFechaDDMMAAAADeDate(t.proxima_inspeccion)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="section-title" style={{ marginTop: 8 }}>
          Inspecciones registradas
        </div>
        <BuscadorLista placeholder="Buscar tanque, resultado o persona...">
        <div className="card">
          {inspecciones && inspecciones.length > 0 ? (
            inspecciones.map((i) => (
              <div className="list-item" key={i.id} data-buscar="">
                <div className="list-item-top">
                  <span className="list-item-title">
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
                {i.fecha_inspeccion && (
                  <div className="list-item-meta">
                    Fecha de la inspección: <b>{formatFechaDDMMAAAADeDate(i.fecha_inspeccion)}</b>
                  </div>
                )}
                <div className="list-item-meta">
                  {i.full_name} · {formatFecha(i.created_at)} <span className="folio-fin">· #{i.folio}</span>
                </div>
                {i.nota && <div className="list-item-note">{i.nota}</div>}
              </div>
            ))
          ) : (
            <div className="empty">Aún no hay inspecciones registradas.</div>
          )}
        </div>
        </BuscadorLista>

      </div>
    </div>
  );
}
