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

// Ficha de un equipo del cliente: esto es lo que responde al pedido
// explícito del usuario (23-sep-2026) de "tener un historial de que se le
// ha hecho cada vez que ha ido un mismo equipo a la tienda" -- cada visita
// (orden) de este equipo, sin importar cuántas veces haya venido, listada
// como botón hacia su propia ficha (no acordeón).
export default async function FichaEquipoPage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const { data: equipo } = await supabase
    .from("equipos_del_cliente")
    .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!equipo) notFound();

  const [{ data: cliente }, { data: ordenes }] = await Promise.all([
    supabase.from("clientes_equipos").select("id, nombre").eq("id", equipo.cliente_id).maybeSingle(),
    supabase
      .from("ordenes_equipos")
      .select("id, folio, fecha, estado, que_se_hara, created_at")
      .eq("equipo_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const tipoLabel = tipoEquipoLabel(equipo.tipo_equipo, equipo.tipo_equipo_otro);
  const marcaModelo = [equipo.marca, equipo.modelo].filter(Boolean).join(" ");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/app-clientes/clientes/${equipo.cliente_id}`} className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Listado de clientes", href: "/app-clientes/clientes" },
            { label: cliente?.nombre || "Cliente", href: `/app-clientes/clientes/${equipo.cliente_id}` },
            { label: tipoLabel },
          ]}
        />
        <h1 className="page-title">{marcaModelo ? `${tipoLabel} — ${marcaModelo}` : tipoLabel}</h1>

        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Campo etiqueta="Cliente">
              <Link href={`/app-clientes/clientes/${equipo.cliente_id}`} className="breadcrumb-crumb">
                {cliente?.nombre || "—"}
              </Link>
            </Campo>
            <Campo etiqueta="Tipo de equipo" valor={tipoLabel} />
            <Campo etiqueta={equipo.tipo_equipo === "Tanques" ? "Fabricante" : "Marca"} valor={equipo.marca || "—"} />
            {equipo.tipo_equipo !== "Tanques" && <Campo etiqueta="Modelo" valor={equipo.modelo || "—"} />}
            {["Reguladores", "Tanques", "Computadora"].includes(equipo.tipo_equipo) && (
              <Campo etiqueta="No. Serie" valor={equipo.serie || "—"} />
            )}
            <Campo etiqueta="Registrado" valor={formatFecha(equipo.created_at)} />
          </div>
        </div>

        <div style={{ display: "flex", marginBottom: 16, marginTop: 4 }}>
          <Link href={`/app-clientes/ordenes/nueva?cliente=${equipo.cliente_id}`}>
            <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
              + Registrar orden
            </button>
          </Link>
        </div>

        <div className="section-title" style={{ marginTop: 0 }}>
          Historial de este equipo
        </div>
        <div className="card">
          {!ordenes || ordenes.length === 0 ? (
            <div className="empty">Este equipo todavía no tiene órdenes registradas.</div>
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
                    {o.que_se_hara}
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
