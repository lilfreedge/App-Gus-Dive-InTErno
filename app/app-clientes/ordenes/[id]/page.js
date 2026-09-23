import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  Entregado: "badge-verde",
};

// Ficha de una orden (rediseñada 23-sep-2026): ya no tiene un botón para
// avanzar el estado a mano -- el estado se calcula solo según qué campos
// de seguimiento estén llenos (lib/ordenes-estado.js). Todo ese
// seguimiento se llena progresivamente desde "Actualizar seguimiento",
// cada orden a su ritmo ("cada orden como serán diferentes no se de que
// manera es que vamos alimentar las demas cosas"). Ajustado el mismo
// día, tras probarlo en vivo: info principal y Seguimiento quedaron en
// una sola tarjeta, y el botón se movió arriba de la lista de campos
// (antes había que bajar más allá de 8 campos vacíos para encontrarlo).
export default async function FichaOrdenPage({ params }) {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  const esTitular = !!profile?.es_titular;

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) notFound();

  const marcaModelo = [o.equipo_marca_snapshot, o.equipo_modelo_snapshot].filter(Boolean).join(" ");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/historial" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Historial de órdenes", href: "/app-clientes/historial" },
            { label: `#${o.folio}` },
          ]}
        />
        <h1 className="page-title">
          #{o.folio} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
        </h1>

        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {o.no_orden_fisico && <Campo etiqueta="No. de orden" valor={o.no_orden_fisico} />}
            <Campo etiqueta="Cliente">
              <Link href={`/app-clientes/clientes/${o.cliente_id}`} className="breadcrumb-crumb">
                {o.cliente_nombre_snapshot}
              </Link>
              {o.cliente_telefono && ` · ${o.cliente_telefono}`}
            </Campo>
            <Campo etiqueta="Equipo">
              {o.equipo_id ? (
                <Link href={`/app-clientes/equipos/${o.equipo_id}`} className="breadcrumb-crumb">
                  {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                  {marcaModelo && ` — ${marcaModelo}`}
                </Link>
              ) : (
                <>
                  {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                  {marcaModelo && ` — ${marcaModelo}`}
                </>
              )}
            </Campo>
            <Campo etiqueta="Servicio a realizar" valor={o.que_se_hara} />
            <Campo etiqueta="Fecha de ingreso" valor={formatFechaDDMMAAAADeDate(o.fecha)} />
            <Campo etiqueta="Estado">
              <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`} style={{ marginLeft: 0 }}>
                {o.estado}
              </span>
            </Campo>
            {o.notas && <Campo etiqueta="Notas" valor={o.notas} />}
            <Campo etiqueta="Registrado por">
              {o.full_name} · {formatFecha(o.created_at)}
            </Campo>
          </div>

          {o.foto_url && (
            <>
              <div className="section-title">Foto</div>
              <a href={o.foto_url} target="_blank" rel="noreferrer" style={{ display: "inline-block" }}>
                <img
                  src={o.foto_url}
                  alt="Foto del equipo"
                  style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid var(--borde)", display: "block" }}
                />
              </a>
            </>
          )}

          <div className="section-title">Seguimiento</div>
          <Link href={`/app-clientes/ordenes/${o.id}/editar`}>
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 14 }}>
              Actualizar seguimiento
            </button>
          </Link>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Campo etiqueta="Envío a" valor={o.envio_a || "—"} />
            {o.envio_a && (
              <>
                <Campo etiqueta="Fecha de envío" valor={o.fecha_envio ? formatFechaDDMMAAAADeDate(o.fecha_envio) : "—"} />
                <Campo etiqueta="Fecha de retorno a tienda" valor={o.fecha_retorno_tienda ? formatFechaDDMMAAAADeDate(o.fecha_retorno_tienda) : "—"} />
              </>
            )}
            <Campo etiqueta="Fecha de listo para entrega" valor={o.fecha_listo_entrega ? formatFechaDDMMAAAADeDate(o.fecha_listo_entrega) : "—"} />
            <Campo etiqueta="Verificado por" valor={o.verificado_por || "—"} />
            <Campo etiqueta="Fecha de notificación al cliente" valor={o.fecha_notificacion_cliente ? formatFechaDDMMAAAADeDate(o.fecha_notificacion_cliente) : "—"} />
            <Campo etiqueta="Fecha de entrega al cliente" valor={o.fecha_entrega_cliente ? formatFechaDDMMAAAADeDate(o.fecha_entrega_cliente) : "—"} />
            <Campo etiqueta="Nombre de quien recibe" valor={o.nombre_recibe || "—"} />
            <Campo etiqueta="Factura de repuesto o servicio" valor={o.factura || "—"} />
          </div>
        </div>

        {esTitular && (
          <div style={{ marginTop: 4 }}>
            <Link
              href={`/app-clientes/administracion/historial?orden=${o.id}`}
              style={{ fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
            >
              Ver historial de ediciones de esta orden →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ etiqueta, valor, children }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--texto-suave)", marginBottom: 2 }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: 14.5 }}>{children !== undefined ? children : valor}</div>
    </div>
  );
}
