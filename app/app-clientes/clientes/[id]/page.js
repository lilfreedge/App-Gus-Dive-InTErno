import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  Entregado: "badge-verde",
};

// Ficha de un cliente: sus datos + su historial de órdenes -- cada una
// es un link a su propia ficha (no acordeón, misma lección aprendida en
// Compresores el 23-sep-2026: "que sea boton, no que se abra ahi mismo
// todo junto").
export default async function FichaClientePage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const { data: cliente } = await supabase
    .from("clientes_equipos")
    .select("id, nombre, telefono, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!cliente) notFound();

  const { data: ordenes } = await supabase
    .from("ordenes_equipos")
    .select("id, folio, tipo_equipo, tipo_equipo_otro, fecha, estado, created_at")
    .eq("cliente_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/clientes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Listado de clientes", href: "/app-clientes/clientes" },
            { label: cliente.nombre },
          ]}
        />
        <h1 className="page-title">{cliente.nombre}</h1>

        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Campo etiqueta="Teléfono" valor={cliente.telefono || "—"} />
            <Campo etiqueta="Cliente desde" valor={formatFecha(cliente.created_at)} />
          </div>
        </div>

        <div style={{ display: "flex", marginBottom: 16, marginTop: 4 }}>
          <Link href={`/app-clientes/ordenes/nueva?cliente=${cliente.id}`}>
            <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
              + Registrar orden
            </button>
          </Link>
        </div>

        <div className="section-title" style={{ marginTop: 0 }}>
          Historial de órdenes
        </div>
        <div className="card">
          {!ordenes || ordenes.length === 0 ? (
            <div className="empty">Este cliente todavía no tiene órdenes registradas.</div>
          ) : (
            ordenes.map((o) => (
              <Link
                key={o.id}
                href={`/app-clientes/ordenes/${o.id}`}
                className="list-item"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <div className="list-item-top">
                  <span className="list-item-title">
                    <span className="folio-tag">#{o.folio}</span>
                    {o.tipo_equipo === "Otro" ? o.tipo_equipo_otro : o.tipo_equipo}
                  </span>
                  <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`}>{o.estado}</span>
                </div>
                <div className="list-item-meta">{formatFechaDDMMAAAADeDate(o.fecha)}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ etiqueta, valor }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--texto-suave)", marginBottom: 2 }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: 14.5 }}>{valor}</div>
    </div>
  );
}
