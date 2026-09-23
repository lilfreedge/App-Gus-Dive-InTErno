import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";

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
//
// La etiqueta de la segunda lista se cambió a "pendientes por entregar"
// (pedido explícito, 23-sep-2026) -- el estado interno sigue llamándose
// "Pendiente por despachar" (mismo valor que usa el resto del código,
// Registro incluido), solo cambió el texto que ve el usuario.
export default async function AppClientesPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const CAMPOS = "id, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, fecha, estado";

  const [{ data: porTrabajar }, { data: porEntregar }, { data: enHidrostatica }, { data: enReparacion }] =
    await Promise.all([
      supabase
        .from("ordenes_equipos")
        .select(CAMPOS)
        .in("estado", ["Pendiente por trabajar", "En proceso"])
        .order("fecha"),
      supabase
        .from("ordenes_equipos")
        .select(CAMPOS)
        .eq("estado", "Pendiente por despachar")
        .order("fecha"),
      // Avisos de "enviado a" (pedido explícito, 23-sep-2026: "estos deben
      // de figurar también en el inicio... pero en caso de que no haya
      // ninguna orden pues que no salga en inicio esto") -- solo mientras
      // sigue afuera: ya salió de la tienda (envio_a) pero todavía no ha
      // vuelto (sin fecha_retorno_tienda). Una vez que vuelve, deja de
      // aparecer aquí -- el seguimiento completo sigue viéndose en la
      // ficha de la orden.
      supabase
        .from("ordenes_equipos")
        .select(CAMPOS)
        .eq("envio_a", "Prueba hidrostática")
        .is("fecha_retorno_tienda", null)
        .order("fecha"),
      supabase
        .from("ordenes_equipos")
        .select(CAMPOS)
        .eq("envio_a", "Reparación")
        .is("fecha_retorno_tienda", null)
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

        {enHidrostatica && enHidrostatica.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 0 }}>
              Tanques enviados a prueba hidrostática
            </div>
            <ListaOrdenes ordenes={enHidrostatica} vacio="" />
          </>
        )}

        {enReparacion && enReparacion.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 0 }}>
              Órdenes enviadas a reparación
            </div>
            <ListaOrdenes ordenes={enReparacion} vacio="" />
          </>
        )}

        <div className="section-title" style={{ marginTop: 0 }}>
          Órdenes pendientes por trabajar
        </div>
        <ListaOrdenes ordenes={porTrabajar} vacio="No hay órdenes pendientes por trabajar." />

        <div className="section-title">Órdenes pendientes por entregar</div>
        <ListaOrdenes ordenes={porEntregar} vacio="No hay órdenes pendientes por entregar." />
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
                {o.cliente_nombre_snapshot} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
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
