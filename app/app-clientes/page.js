import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import NavArrowsClientesServer from "@/components/NavArrowsClientesServer";
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
//
// Rediseño del 23-sep-2026 (pedido explícito, mismo día): las secciones
// de envío (antes "Tanques enviados a prueba hidrostática" y "Órdenes
// enviadas a reparación") se renombraron y se movieron al final de la
// lista; se agregó "Órdenes en espera" (Opción A: check + motivo en
// Actualizar estado de orden); cada título de sección muestra ahora un
// contador; y las que ya salieron a hidrostática/reparación (envio_a
// puesto, sin volver todavía) se excluyen de "Pendientes por trabajar"
// para no aparecer duplicadas -- ya tienen su propia sección más abajo.
export default async function AppClientesPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  // Permiso granular equipos_clientes_registrar (item 15, pedido
  // explícito): sin él, se puede ver todo el hub pero no el botón de
  // registrar una orden nueva.
  const puedeRegistrar = !!profile?.es_titular || !!profile?.permisos?.equipos_clientes_registrar;

  const CAMPOS =
    "id, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, fecha, estado, envio_a, fecha_envio, fecha_envio_hidrostatica, fecha_retorno_tienda, fecha_listo_entrega, en_espera, motivo_espera";

  const [{ data: porTrabajarRaw }, { data: porEntregar }, { data: enEspera }, { data: enHidrostatica }, { data: enReparacion }] =
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
      // Órdenes en espera (Opción A, pedido explícito: "necesito una
      // manera de poder dar seguimiento a ordenes que quedan en hold...
      // en casos por ejemplo que estamos esperando que lleguen una
      // piezas") -- se ven acá además de en su sección normal (arriba),
      // como aviso aparte, mientras no se hayan entregado.
      supabase
        .from("ordenes_equipos")
        .select(CAMPOS)
        .eq("en_espera", true)
        .neq("estado", "Entregado")
        .order("fecha"),
      // Avisos de "enviado a" (pedido explícito, 23-sep-2026: "estos deben
      // de figurar también en el inicio... pero en caso de que no haya
      // ninguna orden pues que no salga en inicio esto") -- solo mientras
      // sigue afuera: ya salió de la tienda (envio_a) pero todavía no ha
      // vuelto (sin fecha_retorno_tienda). Una vez que vuelve, deja de
      // aparecer aquí -- el seguimiento completo sigue viéndose en la
      // ficha de la orden.
      // Prueba hidrostática ya no depende de envio_a (23-sep-2026, ver
      // form-client.js de Actualizar estado de orden) -- ahora se rastrea
      // con su propia fecha, fecha_envio_hidrostatica.
      supabase
        .from("ordenes_equipos")
        .select(CAMPOS)
        .not("fecha_envio_hidrostatica", "is", null)
        .is("fecha_retorno_tienda", null)
        .order("fecha"),
      supabase
        .from("ordenes_equipos")
        .select(CAMPOS)
        .eq("envio_a", "Reparación")
        .is("fecha_retorno_tienda", null)
        .order("fecha"),
    ]);

  // Excluir de "Pendientes por trabajar" las que ya salieron a
  // hidrostática/reparación y todavía no vuelven -- ya se ven en sus
  // propias secciones más abajo (pedido explícito, para no duplicar).
  const porTrabajar = (porTrabajarRaw || []).filter(
    (o) => !((o.envio_a === "Reparación" || o.fecha_envio_hidrostatica) && !o.fecha_retorno_tienda)
  );

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsClientesServer />

        {puedeRegistrar && (
          <div style={{ marginBottom: 20 }}>
            <Link href="/app-clientes/ordenes/nueva">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Registrar orden
              </button>
            </Link>
          </div>
        )}

        <div className="section-title" style={{ marginTop: 0 }}>
          Órdenes pendientes por trabajar ({porTrabajar.length})
        </div>
        <ListaOrdenes
          ordenes={porTrabajar}
          vacio="No hay órdenes pendientes por trabajar."
          fechaCampo="fecha"
          fechaLabel="Fecha de ingreso a tienda"
        />

        <div className="section-title">Órdenes pendientes por entregar ({(porEntregar || []).length})</div>
        <ListaOrdenes
          ordenes={porEntregar}
          vacio="No hay órdenes pendientes por entregar."
          fechaCampo="fecha_listo_entrega"
          fechaLabel="Fecha listo para entrega"
        />

        {enEspera && enEspera.length > 0 && (
          <>
            <div className="section-title">Órdenes en espera ({enEspera.length})</div>
            <ListaOrdenes ordenes={enEspera} vacio="" fechaCampo="fecha" fechaLabel="Fecha de ingreso a tienda" />
          </>
        )}

        {enHidrostatica && enHidrostatica.length > 0 && (
          <>
            <div className="section-title">Órdenes en prueba hidrostáticas ({enHidrostatica.length})</div>
            <ListaOrdenes ordenes={enHidrostatica} vacio="" fechaCampo="fecha_envio_hidrostatica" fechaLabel="Fecha enviado" />
          </>
        )}

        {enReparacion && enReparacion.length > 0 && (
          <>
            <div className="section-title">Órdenes enviadas a reparación ({enReparacion.length})</div>
            <ListaOrdenes ordenes={enReparacion} vacio="" fechaCampo="fecha_envio" fechaLabel="Fecha enviado" />
          </>
        )}
      </div>
    </div>
  );
}

// Badge de estado reposicionado al medio de la fila (pedido explícito,
// 23-sep-2026: "poner el 'en proceso' en medio del boton, en vez de ahi
// al final. al igual que cualquier otra nota que pueda aparecer") --
// acotado a este hub, Registro e Historial ya tenían el badge separado
// de la fecha en su propio diseño. `fechaCampo`/`fechaLabel` deciden
// qué fecha real mostrar y cómo se llama, según la sección (item 12).
function ListaOrdenes({ ordenes, vacio, fechaCampo = "fecha", fechaLabel = "Fecha" }) {
  return (
    <div className="card">
      {!ordenes || ordenes.length === 0 ? (
        <div className="empty">{vacio}</div>
      ) : (
        ordenes.map((o) => {
          const fechaValor = o[fechaCampo];
          return (
            <Link
              key={o.id}
              href={`/app-clientes/ordenes/${o.id}`}
              className="list-item"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <div className="list-item-top" style={{ alignItems: "center" }}>
                <span className="list-item-title" style={{ flex: 1, minWidth: 0 }}>
                  {o.cliente_nombre_snapshot} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                </span>
                <span style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {BADGE_ESTADO[o.estado] && <span className={`badge ${BADGE_ESTADO[o.estado]}`}>{o.estado}</span>}
                  {o.en_espera && <span className="badge badge-rojo">En espera</span>}
                </span>
                <span className="list-item-qty" style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--texto-suave)" }}>{fechaLabel}</div>
                  <div>{fechaValor ? formatFechaDDMMAAAADeDate(fechaValor) : "—"}</div>
                </span>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
