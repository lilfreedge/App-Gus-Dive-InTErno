import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import BotonImprimir from "@/components/BotonImprimir";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  Entregado: "badge-verde",
};

// Reporte de una orden (23-sep-2026, pedido explícito: "la idea es que
// sea un reporte que se vaya alimentando en base al seguimiento" --
// nada de captura nueva, se arma solo con lo ya guardado en Seguimiento,
// igual que la ficha de la orden pero en formato de solo lectura pensado
// para imprimir/guardar como PDF y compartir con el cliente). Por ahora
// solo Reguladores ("El reporte de tanques... no trabajes en eso" --
// se guarda la disciplina de alcance con un notFound() si la orden no es
// de ese tipo, aunque alguien intente entrar por URL directa).
export default async function ReporteOrdenPage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) notFound();
  if (o.tipo_equipo !== "Reguladores") notFound();

  // El folio/marca/modelo quedan como snapshot en la orden, pero el No.
  // de serie vive en la ficha del equipo -- se busca aparte si la orden
  // quedó enlazada a un equipo (equipo_id).
  let serie = null;
  if (o.equipo_id) {
    const { data: equipo } = await supabase
      .from("equipos_del_cliente")
      .select("serie")
      .eq("id", o.equipo_id)
      .maybeSingle();
    serie = equipo?.serie || null;
  }

  const marcaModelo = [o.equipo_marca_snapshot, o.equipo_modelo_snapshot].filter(Boolean).join(" ");
  const esHidrostatica = (o.que_se_hara || "").toLowerCase().includes("hidrostat");
  const muestraRetorno = o.envio_a === "Reparación" || esHidrostatica;

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/reportes" className="back-link no-print">
          ← Volver
        </Link>
        <div className="no-print">
          <Breadcrumb
            items={[
              { label: "App Equipos de clientes", href: "/app-clientes" },
              { label: "Más", href: "/app-clientes/mas" },
              { label: "Reportes", href: "/app-clientes/reportes" },
              { label: `#${o.no_orden_fisico ?? o.folio}` },
            ]}
          />
        </div>
        <h1 className="page-title" style={{ marginBottom: 2 }}>
          Reporte — #{o.no_orden_fisico ?? o.folio}
        </h1>
        <div className="folio-discreto" style={{ marginBottom: 14 }}>
          folio #{o.folio}
        </div>

        <div style={{ marginBottom: 14 }} className="no-print">
          <BotonImprimir />
        </div>

        <div className="card">
          <div className="campos-grid">
            <Campo etiqueta="Cliente" valor={o.cliente_nombre_snapshot} />
            <Campo etiqueta="Fecha de ingreso" valor={formatFechaDDMMAAAADeDate(o.fecha)} />
            <Campo etiqueta="Equipo" valor={tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)} />
            <Campo etiqueta="Marca / Modelo" valor={marcaModelo || "—"} />
            <Campo etiqueta="No. de serie" valor={serie || "—"} />
            <Campo etiqueta="Estado">
              <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`} style={{ marginLeft: 0 }}>
                {o.estado}
              </span>
            </Campo>
            <Campo etiqueta="Servicio a realizar" valor={o.que_se_hara} full />
            {o.autorizacion_cliente && (
              <Campo etiqueta="Autorización del cliente" full>
                {o.autorizacion_cliente}
                {o.autorizacion_notas && <div className="hint-text" style={{ marginTop: 2 }}>{o.autorizacion_notas}</div>}
              </Campo>
            )}
          </div>

          <div className="section-title">Seguimiento</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Campo
              etiqueta="Status"
              valor={o.en_espera ? `En espera${o.motivo_espera ? ` — ${o.motivo_espera}` : ""}` : o.envio_a === "Reparación" ? "Reparación" : "—"}
            />
            {o.envio_a === "Reparación" && (
              <Campo etiqueta="Fecha de envío" valor={o.fecha_envio ? formatFechaDDMMAAAADeDate(o.fecha_envio) : "—"} />
            )}
            {esHidrostatica && (
              <Campo etiqueta="Fecha de envío a prueba hidrostática" valor={o.fecha_envio_hidrostatica ? formatFechaDDMMAAAADeDate(o.fecha_envio_hidrostatica) : "—"} />
            )}
            {muestraRetorno && (
              <Campo etiqueta="Fecha de retorno a tienda" valor={o.fecha_retorno_tienda ? formatFechaDDMMAAAADeDate(o.fecha_retorno_tienda) : "—"} />
            )}
            {esHidrostatica && (
              <Campo etiqueta="Inspección visual realizada" valor={o.inspeccion_visual_realizada ? "Listo" : "Pendiente"} />
            )}
            <Campo etiqueta="Fecha de listo para entrega" valor={o.fecha_listo_entrega ? formatFechaDDMMAAAADeDate(o.fecha_listo_entrega) : "—"} />
            <Campo etiqueta="Verificado por" valor={o.verificado_por || "—"} />
            <Campo etiqueta="Notificaciones al cliente">
              {!o.notificaciones_cliente || o.notificaciones_cliente.length === 0 ? (
                "—"
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {o.notificaciones_cliente.map((n, i) => (
                    <div key={i}>{formatFechaDDMMAAAADeDate(n.fecha)} — {n.medio}</div>
                  ))}
                </div>
              )}
            </Campo>
            <Campo etiqueta="Fecha de entrega al cliente" valor={o.fecha_entrega_cliente ? formatFechaDDMMAAAADeDate(o.fecha_entrega_cliente) : "—"} />
            <Campo etiqueta="Nombre de quien recibe" valor={o.nombre_recibe || "—"} />
            <Campo etiqueta="Factura de repuesto o servicio" valor={o.factura || "—"} />
          </div>

          <div
            style={{
              marginTop: 16,
              background: "var(--superficie-suave)",
              border: "2px solid var(--azul-claro)",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--azul-claro)", marginBottom: 4 }}>
              REPUESTOS UTILIZADOS
            </div>
            <div style={{ fontSize: 14.5 }}>{o.repuestos_usados || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ etiqueta, valor, children, full }) {
  return (
    <div className={full ? "campo-ancho" : undefined}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--texto-suave)", marginBottom: 2 }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: 14.5 }}>{children !== undefined ? children : valor}</div>
    </div>
  );
}
