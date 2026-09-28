import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso, tieneAcceso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import NavArrowsClientesServer from "@/components/NavArrowsClientesServer";
import RegistroClient from "./registro-client";

// "Registro" (23-sep-2026, feedback en vivo tras probar v24): dejó de ser
// directo al formulario "Registrar orden" -- ahora es la cola de trabajo,
// un listado de TODAS las órdenes abiertas (nunca las Entregado, esas
// solo viven en Historial de órdenes) con pestañas para filtrar entre
// Abiertas / Pendientes por trabajar / Pendientes por entregar, más un
// buscador de cliente. Pedido explícito del usuario.
export default async function RegistroPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  const puedeRegistrar = !!profile?.es_titular || !!profile?.permisos?.equipos_clientes_registrar;
  // Permiso granular nuevo (ronda grande de feedback, 27-sep-2026, pedido
  // explícito) -- oculta el atajo directo a "Actualizar estado de orden"
  // de cada fila si el usuario no tiene el permiso (esa pantalla ya
  // redirige sola si se intenta entrar por la URL directa).
  const puedeActualizarEstado = tieneAcceso(profile, "equipos_clientes_actualizar_estado");

  // Campos ampliados (pedido explícito, mid-flow: "agrega aqui junto a
  // abiertas, pendientes por trabajar, pendientes por entregar. agrega
  // todo lo demas que hay en inicio y que sea clickeable asi") -- Registro
  // gana 3 pestañas más que ya existían como secciones en Inicio (En Hold,
  // En prueba hidrostática, Enviadas a reparación), por eso necesita estos
  // campos extra para poder filtrar igual que allá.
  const CAMPOS =
    "id, folio, no_orden_fisico, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, fecha, estado, fecha_envio, fecha_envio_hidrostatica, fecha_retorno_tienda, en_espera";

  const [{ data: ordenes }, { data: cerradas }] = await Promise.all([
    supabase.from("ordenes_equipos").select(CAMPOS).neq("estado", "Entregado").order("fecha"),
    // "Órdenes cerradas" (feedback sobre v40, pedido explícito) -- lista
    // aparte y acotada (las últimas 100), en vez de sumarlas a `ordenes`
    // (que el resto de las pestañas asume que son todas abiertas) o de
    // traer el historial completo acá.
    supabase
      .from("ordenes_equipos")
      .select(CAMPOS)
      .eq("estado", "Entregado")
      .order("fecha_entrega_cliente", { ascending: false })
      .limit(100),
  ]);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsClientesServer />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>Registro de Órdenes</h1>
          {/* "Órdenes abiertas", destacada (feedback sobre v40, pedido
              explícito: "ordenes abiertas ponlo entre registro de ordenes y
              registrar orden") -- reemplaza la pestaña "Abiertas" que había
              en RegistroClient, para que este número no se pierda entre las
              demás pestañas. Es el total de `ordenes` (todo lo que no está
              Entregado), el mismo criterio que ya usaba esa pestaña. Por
              ahora es informativa (no hay una pestaña propia a la que
              llevar: el listado completo sin filtro no existe como pestaña)
              -- si hace falta un atajo, RegistroClient sigue mostrando
              "Pendientes por trabajar" por defecto.
              Nota (v41, feedback sobre esta misma píldora): pasó de ser un
              <span> en forma de píldora roja (fuera de tono con el resto) a
              un <button>, con la misma forma (borderRadius 9px, sin pill) y
              la misma paleta azul marino que ya usan las pestañas activas
              de RegistroClient (clase `.period-btn-active`), para que se
              vea parte de la misma familia de botones en vez de destacar
              con un color ajeno.
              */}
          <button
            type="button"
            style={{
              background: "var(--azul)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13.5,
              padding: "9px 16px",
              borderRadius: 9,
              whiteSpace: "nowrap",
              cursor: "default",
            }}
          >
            Órdenes abiertas ({(ordenes || []).length})
          </button>
          {puedeRegistrar && (
            <Link href="/app-clientes/ordenes/nueva">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Registrar orden
              </button>
            </Link>
          )}
        </div>

        <RegistroClient ordenes={ordenes || []} cerradas={cerradas || []} puedeActualizarEstado={puedeActualizarEstado} />
      </div>
    </div>
  );
}
