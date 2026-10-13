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
        {/* El título, "Órdenes abiertas" y "+ Registrar orden" se movieron
            a RegistroClient (v42/28-sep-2026, pedido explícito: "Ponemos
            ordenes abiertas que sea clickeable?") -- "Órdenes abiertas"
            necesitaba compartir el estado `tab` de las pestañas de abajo
            para poder ser clickeable, y este es un server component, no
            puede tener ese estado. */}
        <RegistroClient
          ordenes={ordenes || []}
          cerradas={cerradas || []}
          puedeActualizarEstado={puedeActualizarEstado}
          puedeRegistrar={puedeRegistrar}
        />
      </div>
    </div>
  );
}
