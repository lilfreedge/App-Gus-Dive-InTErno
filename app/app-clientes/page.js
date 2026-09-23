import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

const BADGE_ESTADO = {
  "En proceso": "badge-amarillo",
};

// Hub de App Equipos Clientes (23-sep-2026, primera versión real --
// reemplaza el placeholder "próximamente"). Pedido explícito del
// usuario: de un vistazo, órdenes pendientes por trabajar y órdenes
// pendientes por despachar, y un botón para registrar una orden nueva
// ("a que te refieres con una tarjeta por tipo? me gustaria en la
// pantalla principal un hub donde se puedan ver rapidamente ordenes
// pendientes por trabajar, ordenes pendiente por despachar..." -- esto
// reemplazó la idea anterior de una tarjeta por tipo de equipo: el tipo
// de equipo quedó como un campo del formulario de la orden, no como
// pantallas separadas).
//
// "Pendientes por trabajar" agrupa Pendiente por trabajar + En proceso
// (ambas necesitan que alguien les ponga la mano) -- criterio de Claude,
// no especificado explícitamente por el usuario.
export default async function AppClientesPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const [{ data: porTrabajar }, { data: porDespachar }] = await Promise.all([
    supabase
      .from("ordenes_equipos")
      .select("id, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, fecha, estado")
      .in("estado", ["Pendiente por trabajar", "En proceso"])
      .order("fecha"),
    supabase
      .from("ordenes_equipos")
      .select("id, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, fecha, estado")
      .eq("estado", "Pendiente por despachar")
      .order("fecha"),
  ]);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <h1 className="page-title">App Clientes</h1>

        <div style={{ marginBottom: 20 }}>
          <Link href="/app-clientes/ordenes/nueva">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
              + Registrar orden
            </button>
          </Link>
        </div>

        <div className="section-title" style={{ marginTop: 0 }}>
          Órdenes pendientes por trabajar
        </div>
        <ListaOrdenes ordenes={porTrabajar} vacio="No hay órdenes pendientes por trabajar." />

        <div className="section-title">Órdenes pendientes por despachar</div>
        <ListaOrdenes ordenes={porDespachar} vacio="No hay órdenes pendientes por despachar." />
      </div>
    </div>
  );
}

function ListaOrdenes({ ordenes, vacio }) {
  return (
    <div className="card">
      {!ordenes || ordenes.length === 0 ? (
        <div className="empty">{vacio}</div>
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
                {o.cliente_nombre_snapshot} — {o.tipo_equipo === "Otro" ? o.tipo_equipo_otro : o.tipo_equipo}
              </span>
              <span className="list-item-qty">
                {formatFechaDDMMAAAADeDate(o.fecha)}
                {BADGE_ESTADO[o.estado] && <span className={`badge ${BADGE_ESTADO[o.estado]}`}>{o.estado}</span>}
              </span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
