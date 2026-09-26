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
    "id, folio, no_orden_fisico, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, fecha, estado, fecha_envio, fecha_envio_hidrostatica, fecha_retorno_tienda, fecha_listo_entrega, en_espera, motivo_espera";

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
      // Reparación ya no depende de "Status"/envio_a (26-sep-2026, ver
      // form-client.js de Actualizar estado de orden) -- lo que importa
      // es que YA se haya puesto fecha_envio (fecha de envío a taller o
      // proveedor), mismo criterio que ya usaba hidrostática con su
      // propia fecha.
      supabase
        .from("ordenes_equipos")
        .select(CAMPOS)
        .not("fecha_envio", "is", null)
        .is("fecha_retorno_tienda", null)
        .order("fecha"),
    ]);

  // Excluir de "Pendientes por trabajar" las que ya salieron a
  // hidrostática/reparación y todavía no vuelven -- ya se ven en sus
  // propias secciones más abajo (pedido explícito, para no duplicar).
  const porTrabajar = (porTrabajarRaw || []).filter(
    (o) => !((o.fecha_envio || o.fecha_envio_hidrostatica) && !o.fecha_retorno_tienda)
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

        {/* Estas 3 secciones ahora siempre se muestran, aunque estén en 0
            (25-sep-2026, pedido explícito: "pon que aparezcan las otra
            secciones aunque no tengan ordenes, solo para que se sepa que
            esta en '0'") -- antes se escondían por completo si no había
            ninguna orden en ese estado ("en caso de que no haya ninguna
            orden pues que no salga en inicio esto", pedido de v28), pero
            tras probar en vivo el usuario prefirió verlas siempre. */}
        <div className="section-title">Órdenes en espera ({(enEspera || []).length})</div>
        <ListaOrdenes
          ordenes={enEspera}
          vacio="No hay órdenes en espera."
          fechaCampo="fecha"
          fechaLabel="Fecha de ingreso a tienda"
        />

        <div className="section-title">Órdenes en prueba hidrostáticas ({(enHidrostatica || []).length})</div>
        <ListaOrdenes
          ordenes={enHidrostatica}
          vacio="No hay órdenes en prueba hidrostática."
          fechaCampo="fecha_envio_hidrostatica"
          fechaLabel="Fecha enviado"
        />

        <div className="section-title">Órdenes enviadas a reparación ({(enReparacion || []).length})</div>
        <ListaOrdenes
          ordenes={enReparacion}
          vacio="No hay órdenes enviadas a reparación."
          fechaCampo="fecha_envio"
          fechaLabel="Fecha enviado"
          mostrarDiasAfuera
        />
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
// `mostrarDiasAfuera` (item 13, pedido explícito, 26-sep-2026) agrega un
// aviso de cuántos días lleva afuera, para las que están en reparación.
// El No. de orden (item 10, pedido explícito) se agregó como `folio-tag`
// al inicio del título -- mismo patrón que ya usan Registro de Órdenes e
// Historial (folio-tag), antes solo se veía cliente + equipo aquí.
function ListaOrdenes({ ordenes, vacio, fechaCampo = "fecha", fechaLabel = "Fecha", mostrarDiasAfuera = false }) {
  return (
    <div className="card">
      {!ordenes || ordenes.length === 0 ? (
        <div className="empty">{vacio}</div>
      ) : (
        ordenes.map((o) => {
          const fechaValor = o[fechaCampo];
          const diasAfuera =
            mostrarDiasAfuera && fechaValor
              ? Math.floor((Date.now() - new Date(fechaValor).getTime()) / (1000 * 60 * 60 * 24))
              : null;
          return (
            <Link
              key={o.id}
              href={`/app-clientes/ordenes/${o.id}`}
              className="list-item"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <div className="list-item-top" style={{ alignItems: "center" }}>
                <span className="list-item-title" style={{ flex: 1, minWidth: 0 }}>
                  <span className="folio-tag">#{o.no_orden_fisico ?? o.folio}</span>
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
              {diasAfuera !== null && (
                <div className="hint-text" style={{ marginTop: 4, color: "var(--rojo)", fontWeight: 600 }}>
                  Lleva {diasAfuera} día{diasAfuera === 1 ? "" : "s"} afuera
                </div>
              )}
            </Link>
          );
        })
      )}
    </div>
  );
}
