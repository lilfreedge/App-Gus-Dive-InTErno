import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RegistroActions from "@/components/RegistroActions";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO, sumarDias } from "@/lib/fechas";

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
  const [{ data: mantenimientos }, { data: reguladores }] = await Promise.all([
    query,
    // Ítem 14 del feedback (23-sep-2026): mismo aviso que ya existe en
    // Inspección visual, ahora también para reguladores -- solo se pide
    // en la vista general (sin filtrar por un regulador puntual).
    reguladorId
      ? Promise.resolve({ data: [] })
      : supabase
          .from("reguladores_alquiler")
          .select("id, codigo, proximo_mantenimiento")
          .eq("activo", true)
          .order("proximo_mantenimiento", { ascending: true, nullsFirst: true }),
  ]);

  const hoy = hoyISO();
  const limite = sumarDias(hoy, 14);
  const reguladoresPendientes = (reguladores || []).filter(
    (r) => !r.proximo_mantenimiento || r.proximo_mantenimiento < hoy
  );
  const reguladoresProximos = (reguladores || []).filter(
    (r) => r.proximo_mantenimiento && r.proximo_mantenimiento >= hoy && r.proximo_mantenimiento <= limite
  );

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

        {reguladoresPendientes.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>
              Reguladores pendientes por mantenimiento
            </div>
            <div className="card">
              {reguladoresPendientes.map((r) => (
                <div className="list-item" key={r.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">{r.codigo}</span>
                    <span className="badge badge-rojo">
                      {r.proximo_mantenimiento
                        ? `Vencido desde ${formatFechaDDMMAAAADeDate(r.proximo_mantenimiento)}`
                        : "Nunca tuvo mantenimiento"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {reguladoresProximos.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>
              Mantenimiento próximo a vencer (2 semanas o menos)
            </div>
            <div className="card">
              {reguladoresProximos.map((r) => (
                <div className="list-item" key={r.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">{r.codigo}</span>
                    <span className="list-item-qty">
                      {formatFechaDDMMAAAADeDate(r.proximo_mantenimiento)}
                    </span>
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
