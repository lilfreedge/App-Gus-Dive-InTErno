import Link from "next/link";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import { tieneAcceso } from "@/lib/roles";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { formatFechaDDMMAAAA } from "@/lib/format";
import { holdActivo, resumenHold, diasEnHold } from "@/lib/holds";
import { nombreCorto } from "@/lib/tecnicos";
import { IconRefresh } from "@/components/icons";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  "En Hold": "badge-rojo",
  Entregado: "badge-verde",
};

// V34 -- Inicio del técnico: "Mis órdenes asignadas" (maqueta-v34.html,
// parte C; aprobado). Sale a quien tiene un rol de App Equipos de clientes
// con Pantalla de inicio "Mis órdenes asignadas" (esTecnico).
// - Arriba, SUS órdenes abiertas: Por trabajar, En proceso y En Hold, con
//   "Actualizar estado" e "Informe" a un toque. Las listas para entregar ya
//   le tocan a la tienda.
// - Al final, discreto (pedido explícito: "Me interesa que vea todas para
//   que sepa qué se está moviendo, pero eso que no llame mucho la atención
//   ... puede estar de último en la ventana por si él quiere consultar"):
//   "Todas las órdenes abiertas", en gris, plegada, solo para consultar.
// - "Tomar esta orden" queda para la V35 ("dejemos esa idea tentativa para
//   la v35").
export default async function InicioTecnico({ supabase, profile, userId }) {
  const puedeActualizar = tieneAcceso(profile, "equipos_clientes_actualizar_estado");
  const puedeInforme = tieneAcceso(profile, "equipos_clientes_informe_mantenimiento");

  const { data } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select(
      "id, folio, no_orden_fisico, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, equipo_marca_snapshot, que_se_hara, fecha, estado, holds, tecnico_asignado_id, tecnico_nombre, asignada_en, asignada_por_nombre"
    )
    .neq("estado", "Entregado")
    .order("fecha");

  // V49: por número de orden, de menor a mayor (igual que el Inicio general).
  const numeroDe = (o) => Number(String(o.no_orden_fisico ?? o.folio ?? "").replace(/\D/g, "")) || 0;
  const abiertas = [...(data || [])].sort((a, b) => numeroDe(a) - numeroDe(b));
  const mias = abiertas.filter((o) => o.tecnico_asignado_id === userId);
  const porTrabajar = mias.filter((o) => o.estado === "Pendiente por trabajar");
  const enProceso = mias.filter((o) => o.estado === "En proceso");
  const enHold = mias.filter((o) => o.estado === "En Hold");
  const hoy = formatFechaDDMMAAAA(new Date().toISOString());

  function Orden({ o, atrasoDias = null }) {
    const dias = Math.floor((Date.now() - new Date(o.fecha).getTime()) / (1000 * 60 * 60 * 24));
    const atrasada = atrasoDias !== null && dias > atrasoDias;
    const hold = o.estado === "En Hold" ? holdActivo(o.holds) : null;
    const diasHold = hold ? diasEnHold(hold) : null;
    const asignadaEl = o.asignada_en ? formatFechaDDMMAAAA(o.asignada_en) : null;
    const equipo = [tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro), o.equipo_marca_snapshot].filter(Boolean).join(" — ");
    return (
      <div className="list-item">
        <Link href={`/app-clientes/ordenes/${o.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
          <div className="list-item-top">
            <span className="list-item-title">
              <span className="folio-tag">No. {o.no_orden_fisico ?? o.folio}</span>
              {o.cliente_nombre_snapshot}
            </span>
            <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`}>{o.estado}</span>
          </div>
          <div className="list-item-meta">
            {equipo}
            {o.que_se_hara ? ` · ${o.que_se_hara}` : ""}
          </div>
          {atrasada && (
            <div className="list-item-meta" style={{ color: "var(--rojo)", fontWeight: 600 }}>
              Atrasada — lleva {dias} día{dias === 1 ? "" : "s"} en tienda
            </div>
          )}
          {hold && (
            <div className="list-item-meta" style={{ color: "var(--rojo)", fontWeight: 600 }}>
              {resumenHold(hold)}
              {diasHold !== null ? ` — ${diasHold} día${diasHold === 1 ? "" : "s"} en Hold` : ""}
            </div>
          )}
          {o.asignada_por_nombre && (
            <div className="list-item-meta">
              Te la asignó {nombreCorto(o.asignada_por_nombre)} {asignadaEl === hoy ? "hoy" : asignadaEl ? `el ${asignadaEl}` : ""}
            </div>
          )}
        </Link>
        {(puedeActualizar || (puedeInforme && o.tipo_equipo === "Reguladores")) && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {puedeActualizar && (
              <Link href={`/app-clientes/ordenes/${o.id}/editar?from=mis-ordenes`}>
                <button
                  className="btn btn-primary"
                  type="button"
                  style={{ marginTop: 0, width: "auto", padding: "6px 12px", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <IconRefresh size={14} />
                  Actualizar estado
                </button>
              </Link>
            )}
            {puedeInforme && o.tipo_equipo === "Reguladores" && (
              <Link href={`/app-clientes/ordenes/${o.id}/informe`}>
                <button className="btn secondary" type="button" style={{ marginTop: 0, width: "auto", padding: "6px 12px", fontSize: 12.5 }}>
                  Informe
                </button>
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  function Seccion({ titulo, ordenes, vacio, atrasoDias = null }) {
    return (
      <>
        <div className="section-title">
          {titulo} ({ordenes.length})
        </div>
        <div className="card">
          {ordenes.length === 0 ? (
            <div className="empty">{vacio}</div>
          ) : (
            ordenes.map((o) => <Orden key={o.id} o={o} atrasoDias={atrasoDias} />)
          )}
        </div>
      </>
    );
  }

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        {/* V38: de vuelta al menú del técnico. */}
        <Link href="/tecnico" className="back-link">
          ← Mi menú
        </Link>
        <h1 className="page-title">Mis órdenes asignadas</h1>

        <div className="stat-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: porTrabajar.length > 0 ? "var(--rojo)" : undefined }}>
              {porTrabajar.length}
            </div>
            <div className="stat-label">Por trabajar</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: enProceso.length > 0 ? "#b5691f" : undefined }}>
              {enProceso.length}
            </div>
            <div className="stat-label">En proceso</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{enHold.length}</div>
            <div className="stat-label">En Hold</div>
          </div>
        </div>

        <Seccion titulo="Por trabajar" ordenes={porTrabajar} vacio="No tienes órdenes por trabajar." atrasoDias={5} />
        <Seccion titulo="En proceso" ordenes={enProceso} vacio="No tienes órdenes en proceso." />
        <Seccion titulo="En Hold" ordenes={enHold} vacio="No tienes órdenes en Hold." />

        {/* Discreto, al final y plegado: solo para consultar. */}
        <details className="plegable" style={{ marginTop: 30 }}>
          <summary
            className="section-title"
            style={{ cursor: "pointer", listStyle: "none", justifyContent: "flex-start", gap: 8, fontSize: 13.5, color: "var(--texto-suave)" }}
          >
            <span className="plegable-flecha" aria-hidden="true" />
            Todas las órdenes abiertas ({abiertas.length})
          </summary>
          <p className="hint-text" style={{ marginTop: 2 }}>
            Solo para consultar qué se está moviendo en el taller.
          </p>
          <div className="card" style={{ padding: "4px 14px", opacity: 0.92 }}>
            {abiertas.length === 0 ? (
              <div className="empty">No hay órdenes abiertas.</div>
            ) : (
              abiertas.map((o) => (
                <Link
                  key={o.id}
                  href={`/app-clientes/ordenes/${o.id}`}
                  className="list-item"
                  style={{ display: "block", padding: "8px 0", textDecoration: "none", color: "inherit" }}
                >
                  <div className="list-item-top">
                    <span style={{ fontSize: 13 }}>
                      <span className="folio-tag">No. {o.no_orden_fisico ?? o.folio}</span>
                      {o.cliente_nombre_snapshot} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                    </span>
                    <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`}>{o.estado}</span>
                  </div>
                  <div className="list-item-meta">
                    {o.tecnico_asignado_id
                      ? o.tecnico_asignado_id === userId
                        ? "Asignada a ti"
                        : `Asignada a ${nombreCorto(o.tecnico_nombre)}`
                      : "Sin asignar"}
                  </div>
                </Link>
              ))
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
