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
  const { data: ordenes } = await supabase
    .from("ordenes_equipos")
    .select(
      "id, folio, no_orden_fisico, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, fecha, estado, fecha_envio, fecha_envio_hidrostatica, fecha_retorno_tienda, en_espera"
    )
    .neq("estado", "Entregado")
    .order("fecha");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsClientesServer />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>Registro de Órdenes</h1>
          {puedeRegistrar && (
            <Link href="/app-clientes/ordenes/nueva">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Registrar orden
              </button>
            </Link>
          )}
        </div>

        <RegistroClient ordenes={ordenes || []} puedeActualizarEstado={puedeActualizarEstado} />
      </div>
    </div>
  );
}
