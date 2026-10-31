import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RegistroActions from "@/components/RegistroActions";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";
import { IconAlert } from "@/components/icons";
import { hoyISO, sumarDias } from "@/lib/fechas";
import BuscadorLista from "@/components/BuscadorLista";
import { todasLasFilas } from "@/lib/todas-las-filas";
import { detalleMantenimientoTexto, cambiosTexto } from "@/lib/mantenimiento-regulador";

export default async function MantenimientoReguladoresPage({ searchParams }) {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "registrar_mantenimiento");
  // V32: "registrar_mantenimiento" es para ver; registrar pide "mantenimiento_registrar".
  const puedeRegistrar = tieneAcceso(profile, "mantenimiento_registrar");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  const reguladorId = searchParams?.regulador || null;

  // V35 (buscador en los historiales): todos, no solo los últimos 200.
  const [mantenimientos, { data: reguladores }] = await Promise.all([
    todasLasFilas(supabase, "mantenimientos_con_nombre", (q) => {
      let consulta = q.select("*");
      if (reguladorId) consulta = consulta.eq("regulador_id", reguladorId);
      return consulta.order("created_at", { ascending: false }).order("id");
    }),
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

        {/* V49 (nota: "que los mantenimientos pendientes figuren por encima
            del listado de mantenimientos. Debería de llamar más la
            atención"): arriba, en rojo, cada uno lleva a registrar su
            mantenimiento. */}
        {reguladoresPendientes.length > 0 && (
          <div className="mant-pend">
            <div className="mant-pend-t">
              <IconAlert size={18} />
              {reguladoresPendientes.length} regulador{reguladoresPendientes.length === 1 ? "" : "es"} pendiente
              {reguladoresPendientes.length === 1 ? "" : "s"} por mantenimiento
            </div>
            <div className="mant-pend-lista">
              {reguladoresPendientes.map((r) => {
                const texto = r.proximo_mantenimiento ? `vencido desde ${formatFechaDDMMAAAADeDate(r.proximo_mantenimiento)}` : "nunca tuvo";
                const contenido = (
                  <>
                    <b>{r.codigo}</b>
                    <span>{texto}</span>
                  </>
                );
                return puedeRegistrar ? (
                  <Link key={r.id} href={`/equipos/mantenimiento-reguladores/nueva?regulador=${r.id}`} className="mant-pend-chip">
                    {contenido}
                  </Link>
                ) : (
                  <span key={r.id} className="mant-pend-chip">
                    {contenido}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {reguladoresProximos.length > 0 && (
          <div className="mant-pend proximo">
            <div className="mant-pend-t">Próximos a vencer (2 semanas o menos)</div>
            <div className="mant-pend-lista">
              {reguladoresProximos.map((r) => (
                <span key={r.id} className="mant-pend-chip">
                  <b>{r.codigo}</b>
                  <span>{formatFechaDDMMAAAADeDate(r.proximo_mantenimiento)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="section-title" style={{ marginTop: 8 }}>
          Mantenimientos registrados
        </div>
        <BuscadorLista placeholder="Buscar regulador o persona...">
        <div className="card">
          {mantenimientos && mantenimientos.length > 0 ? (
            mantenimientos.map((m) => (
              <div className="list-item" key={m.id} data-buscar="">
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
                <div className="list-item-meta">{detalleMantenimientoTexto(m)}</div>
                {/* V50: componentes que cambiaron en este mantenimiento. */}
                {cambiosTexto(m.componentes_cambios) && (
                  <div className="list-item-meta" style={{ color: "var(--verde)", fontWeight: 700 }}>
                    Cambió: {cambiosTexto(m.componentes_cambios)}
                  </div>
                )}
                {m.detalle && <div className="list-item-note">{m.detalle}</div>}
              </div>
            ))
          ) : (
            <div className="empty">Aún no hay mantenimientos registrados.</div>
          )}
        </div>
        </BuscadorLista>

      </div>
    </div>
  );
}
