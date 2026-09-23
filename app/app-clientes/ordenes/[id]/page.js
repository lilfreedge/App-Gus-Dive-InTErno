import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";
import EstadoOrden from "./estado-client";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  Entregado: "badge-verde",
};

export default async function FichaOrdenPage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) notFound();

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
          #{o.folio} — {o.tipo_equipo === "Otro" ? o.tipo_equipo_otro : o.tipo_equipo}
        </h1>

        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Campo etiqueta="Cliente">
              <Link href={`/app-clientes/clientes/${o.cliente_id}`} className="breadcrumb-crumb">
                {o.cliente_nombre_snapshot}
              </Link>
              {o.cliente_telefono && ` · ${o.cliente_telefono}`}
            </Campo>
            <Campo etiqueta="Tipo de equipo" valor={o.tipo_equipo === "Otro" ? `Otro — ${o.tipo_equipo_otro}` : o.tipo_equipo} />
            <Campo etiqueta="Qué se le hará" valor={o.que_se_hara} />
            <Campo etiqueta="Fecha" valor={formatFechaDDMMAAAADeDate(o.fecha)} />
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

          <div style={{ marginTop: 18 }}>
            <EstadoOrden orden={o} />
          </div>
        </div>
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
