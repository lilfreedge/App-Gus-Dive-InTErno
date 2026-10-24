import { todasLasFilas } from "@/lib/todas-las-filas";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso, tieneAcceso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import NavArrowsClientesServer from "@/components/NavArrowsClientesServer";
import RegistroClient from "./registro-client";
import { tecnicosConCarga } from "@/lib/tecnicos";
import { ultimosAvisos } from "@/lib/avisos-tecnicos";

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
  // V34 -- "Asignar órdenes" (maqueta-v34.html, parte B): quien tiene el
  // permiso ve "Asignar ▾" / "Cambiar" en cada orden y la pestaña "Sin
  // asignar". Los demás solo ven a quién está asignada.
  const puedeAsignar = tieneAcceso(profile, "equipos_clientes_asignar");

  // Campos ampliados (pedido explícito, mid-flow: "agrega aqui junto a
  // abiertas, pendientes por trabajar, pendientes por entregar. agrega
  // todo lo demas que hay en inicio y que sea clickeable asi") -- Registro
  // gana 3 pestañas más que ya existían como secciones en Inicio (En Hold,
  // En prueba hidrostática, Enviadas a reparación), por eso necesita estos
  // campos extra para poder filtrar igual que allá.
  const CAMPOS =
    "id, folio, no_orden_fisico, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, fecha, estado, fecha_envio, fecha_envio_hidrostatica, fecha_retorno_tienda, en_espera, tecnico_asignado_id, tecnico_nombre, asignada_en, equipo_marca_snapshot, equipo_modelo_snapshot, que_se_hara";

  // V31: las cerradas se traen todas (de a 1000) para que el buscador por
  // cliente o No. de orden encuentre también las viejas; la pestaña
  // "Órdenes cerradas" sigue mostrando solo las últimas 100.
  // V34: de la vista (trae el nombre del técnico asignado).
  const [{ data: ordenes }, cerradas, tecnicos] = await Promise.all([
    supabase.from("ordenes_equipos_con_nombre").select(CAMPOS).neq("estado", "Entregado").order("fecha"),
    todasLasFilas(supabase, "ordenes_equipos_con_nombre", (q) =>
      q
        .select(CAMPOS)
        .eq("estado", "Entregado")
        .order("fecha_entrega_cliente", { ascending: false, nullsFirst: false })
        .order("id")
    ),
    puedeAsignar ? tecnicosConCarga(supabase) : Promise.resolve([]),
  ]);

  // V37: si al técnico ya se le avisó por WhatsApp (avisos_tecnicos).
  const avisos = await ultimosAvisos(supabase, ordenes || []);

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
          puedeAsignar={puedeAsignar}
          tecnicos={tecnicos}
          avisos={avisos}
          miNombre={profile?.full_name || ""}
        />
      </div>
    </div>
  );
}
