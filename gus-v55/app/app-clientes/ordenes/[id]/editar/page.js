import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes, tieneAcceso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { requiereVerificacion as calcularRequiereVerificacion } from "@/lib/procesos-ordenes";
import EditarSeguimientoForm from "./form-client";

// Actualizar seguimiento (renombrado de "Editar seguimiento", 23-sep-2026,
// feedback en vivo -- la mayoría de las veces se está llenando un campo
// por primera vez, no corrigiendo uno ya puesto) -- llena progresivamente
// los campos que van pasando con la orden (envío a, fechas de
// retorno/listo/entrega, verificado por, factura). Cada guardado anota
// el cambio en el historial (Titular) y recalcula el estado solo, según
// lib/ordenes-estado.js.
export default async function EditarSeguimientoPage({ params, searchParams }) {
  const supabase = createClient();
  // Permiso granular nuevo (ronda grande de feedback, 27-sep-2026, pedido
  // explícito) -- antes cualquiera con acceso a la app podía entrar acá.
  const { profile } = await requirePermisoClientes(
    supabase,
    "equipos_clientes_actualizar_estado",
    `/app-clientes/ordenes/${params.id}`
  );
  // "Verificado por" solo lo puede llenar el Titular o un Administrador
  // (pedido explícito, 23-sep-2026: "por el momento, el 'verificado por'
  // solamente lo podré llenar yo y a quien yo le de acceso como
  // administrador") -- mismo profiles.is_admin de toda la cuenta.
  const puedeVerificar = !!profile?.es_titular || !!profile?.is_admin;
  // Editar un Hold ya activo (item 6, feedback sobre v40, pedido
  // explícito: "pon el permiso en administración") -- exclusivo de
  // Administradores, mismo patrón que editar_orden/editar_cliente.
  const puedeEditarHold = tieneAcceso(profile, "equipos_clientes_editar_hold");

  const { data: orden } = await supabase
    .from("ordenes_equipos")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!orden) notFound();

  // "Procesos órdenes" (28-sep-2026, pedido explícito, ver
  // administracion/procesos-ordenes-client.js) -- por tipo de equipo, si
  // el paso "Verificado por" es obligatorio antes de Notificaciones/
  // Cierre de la orden. Sin fila configurada, requiereVerificacion trata
  // todo como que sí lo requiere (comportamiento de siempre).
  const { data: ajustes } = await supabase.from("ajustes_app_clientes").select("*").eq("id", true).maybeSingle();
  const requiereVerificacion = calcularRequiereVerificacion(ajustes, orden.tipo_equipo);

  // Catálogo de Piezas y repuestos (item 4, pedido explícito, 27-sep-2026:
  // "que ayude a escribir lo que tenemos en base de datos. Asi como texto
  // libre no me funciona") -- se pasa solo para sugerir/autocompletar
  // mientras se escribe (un <datalist>, ver form-client.js); "Repuestos
  // utilizados" sigue siendo texto libre, así que también se puede escribir
  // algo que no esté en el catálogo.
  // `codigo` agregado al select (feedback en vivo, 29-sep-2026, pedido
  // explícito: "que aparezca el codigo y la descripcion juntas, no solo la
  // descripcion") -- antes solo se traía `nombre`, así que no había forma
  // de anteponer el código al agregar un repuesto desde el catálogo (ver
  // agregarRepuesto() en form-client.js).
  const { data: piezas } = await supabase.from("piezas_catalogo").select("id, nombre, codigo").eq("activo", true).order("nombre");

  // BUG corregido (item 11a, reportado en vivo, 26-sep-2026: "cuando le
  // doy me abre el actualizar estado de orden desde el 'listado de
  // ordenes' en vez de 'registro de ordenes'"). Causa: esta pantalla tiene
  // dos puntos de entrada -- el botón "Actualizar estado de orden" de la
  // ficha (que sí viene de Listado de órdenes) y el atajo directo agregado
  // en Registro de Órdenes (que se salta la ficha) -- pero la miga de pan
  // mostraba siempre "Listado de órdenes" sin importar de cuál se vino.
  // Arreglo: el atajo de Registro de Órdenes ahora agrega ?from=registro a
  // su link, y esta página arma la miga según eso.
  const vieneDeRegistro = searchParams?.from === "registro";

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/app-clientes/ordenes/${params.id}`} className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            vieneDeRegistro
              ? { label: "Registro de Órdenes", href: "/app-clientes/ordenes" }
              : { label: "Historial de órdenes", href: "/app-clientes/historial" },
            { label: `No. ${orden.no_orden_fisico ?? orden.folio}`, href: `/app-clientes/ordenes/${params.id}` },
            { label: "Actualizar estado de orden" },
          ]}
        />
        <h1 className="page-title">Actualizar estado de orden</h1>

        {/* Item 37 (pedido explícito, texto EXACTO recuperado del
            transcript tras una compactación ambigua: "ah no quita to esa
            vaina" sobre mi propia propuesta de quitar títulos/subtítulos
            redundantes app-wide) -- el único caso real era el subtítulo
            largo de esta pantalla ("Todos estos campos son opcionales...")
            duplicando lo que ya queda claro en el wizard de abajo. No se
            tocó ningún otro subtítulo de la app: todos los demás agregan
            información real y distinta, y el patrón breadcrumb+h1 es una
            convención intencional en toda la app. */}

        {/* Resumen de la orden que se está actualizando (item 26, pedido
            explícito, 26-sep-2026: "agregar aqui en la parte de arriba
            datos sobre la orden que se esta actualizando, numero de orden,
            cliente y el equipo"). Fecha de ingreso agregada (item 13,
            pedido explícito, 27-sep-2026: "agregar fecha de ingreso a los
            datos de la orden"). */}
        <div className="card" style={{ padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
          <strong>No. {orden.no_orden_fisico ?? orden.folio}</strong> — {orden.cliente_nombre_snapshot || "—"} —{" "}
          {tipoEquipoLabel(orden.tipo_equipo, orden.tipo_equipo_otro)} — {formatFechaDDMMAAAADeDate(orden.fecha)}
          {/* Servicio a realizar agregado al resumen (pedido explícito,
              mid-flow, con captura de pantalla: "en los datos del cliente,
              agregar el servicio que se va a realizar"). */}
          {orden.que_se_hara && (
            <>
              <br />
              {orden.que_se_hara}
            </>
          )}
        </div>

        <EditarSeguimientoForm
          orden={orden}
          puedeVerificar={puedeVerificar}
          requiereVerificacion={requiereVerificacion}
          piezas={piezas || []}
          puedeEditarHold={puedeEditarHold}
        />
      </div>
    </div>
  );
}
