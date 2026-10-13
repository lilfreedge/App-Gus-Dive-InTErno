import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso, tieneAcceso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import RegistroActions from "@/components/RegistroActions";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { esServicioHidrostatica, esServicioReparacion } from "@/lib/ordenes-estado";
import { requiereVerificacion } from "@/lib/procesos-ordenes";
import { holdActivo, diasEnHold, labelTipoHold, detalleHold } from "@/lib/holds";
import { edicionesDeLaOrden } from "@/lib/bitacora-orden";
import FotoLightbox from "@/components/FotoLightbox";
import { IconRefresh } from "@/components/icons";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  "En Hold": "badge-rojo",
  Entregado: "badge-verde",
};

// Ficha de una orden (rediseñada 23-sep-2026): ya no tiene un botón para
// avanzar el estado a mano -- el estado se calcula solo según qué campos
// de seguimiento estén llenos (lib/ordenes-estado.js). Todo ese
// seguimiento se llena progresivamente desde "Actualizar seguimiento",
// cada orden a su ritmo ("cada orden como serán diferentes no se de que
// manera es que vamos alimentar las demas cosas"). Ajustado el mismo
// día, tras probarlo en vivo: info principal y Seguimiento quedaron en
// una sola tarjeta, y el botón se movió arriba de la lista de campos
// (antes había que bajar más allá de 8 campos vacíos para encontrarlo).
export default async function FichaOrdenPage({ params }) {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  const esTitular = !!profile?.es_titular;
  // Editar/anular una orden (item 7, pedido explícito, 26-sep-2026) --
  // el borrado ya está restringido a Titular/Admin en la base de datos
  // (migration_16.sql), así que los botones se muestran con el mismo
  // criterio para no ofrecer algo que el servidor va a rechazar.
  // Permisos granulares nuevos (ronda grande de feedback, 27-sep-2026,
  // pedido explícito): "Actualizar estado de orden" se puede ocultar por
  // permiso (antes cualquiera con acceso a la app veía el botón).
  const puedeActualizarEstado = tieneAcceso(profile, "equipos_clientes_actualizar_estado");
  // Item 36, nueva feature (mockup Informe.dc.html) -- permiso propio,
  // separado de "Actualizar estado de orden".
  const puedeVerInforme = tieneAcceso(profile, "equipos_clientes_informe_mantenimiento");
  // "Ver reporte de la orden" gateado por el permiso de Reportes
  // (feedback en vivo, 30-sep-2026, pedido explícito: "quien no tenga
  // acceso a 'reportes' que no le salga boton de 'ver reporte de la
  // orden'") -- antes se veía con solo ser Regulador, sin mirar permisos.
  const puedeVerReportes = tieneAcceso(profile, "equipos_clientes_reportes");
  // Bitácora de la orden -- permiso granular propio desde el 5-oct-2026
  // (pedido explícito: "no me hace sentido tener algo que solo yo pueda
  // verlo, cuando el otro [Historial de ediciones de esta orden] es casi
  // igual y puedo dar ese acceso" -- ver migration_49.sql). Antes era
  // Titular/Administrador hardcodeado (feedback en vivo, 30-sep-2026:
  // "haz que solo yo tenga ese acceso y los administradores"), sin forma
  // de dárselo a nadie más. Ya que Bitácora muestra TODO lo que mostraba
  // el link separado "Ver historial de ediciones de esta orden" (las
  // ediciones) más holds resueltos y repuestos autorizados eliminados,
  // ese link se quitó de esta ficha -- ya no hacía falta tener los dos.
  const puedeVerBitacoraOrden = tieneAcceso(profile, "equipos_clientes_bitacora_orden");

  const [{ data: o }, { data: ajustes }] = await Promise.all([
    supabase.from("ordenes_equipos_con_nombre").select("*").eq("id", params.id).single(),
    supabase.from("ajustes_app_clientes").select("*").eq("id", true).maybeSingle(),
  ]);

  if (!o) notFound();

  // Contador de "Ver bitácora de la orden (N)" -- mismo total que muestra
  // esa pantalla: entradas de bitacora_orden + ediciones con algún cambio
  // real (feedback sobre v52, pedido explícito: "la cantidad que aparece
  // en () aparece en 0... corrige eso"). Solo se consulta si la persona
  // puede ver la Bitácora.
  const edicionesBitacora = puedeVerBitacoraOrden
    ? await edicionesDeLaOrden(supabase, o.id, "id, accion, datos_anteriores, datos_nuevos")
    : [];

  // "n/a" en vez de "—" para "Verificado por" cuando la orden ya se cerró
  // y ese paso ni siquiera le aplicaba a este tipo de equipo (Procesos
  // órdenes, feedback en vivo, 29-sep-2026, pedido explícito: "cuando una
  // orden se cierre, si no tuvo que ser verificada por nadie, que en
  // verificado por salga n/a") -- mientras sigue abierta se deja el "—" de
  // siempre, por si "Procesos órdenes" cambia de opinión antes de cerrar.
  const verificadoPorTexto =
    o.verificado_por || (o.estado === "Entregado" && !requiereVerificacion(ajustes, o.tipo_equipo) ? "n/a" : "—");

  const marcaModelo = [o.equipo_marca_snapshot, o.equipo_modelo_snapshot].filter(Boolean).join(" ");
  // "Status" desapareció (item 13, pedido explícito, 26-sep-2026: "quita
  // esa seccion. quiero probar si sin eso podemos trabajar") -- Reparación
  // pasa a detectarse sola según el servicio, igual que Prueba
  // hidrostática desde el 23-sep.
  const esHidrostatica = esServicioHidrostatica(o.que_se_hara);
  const esReparacion = esServicioReparacion(o.que_se_hara);
  const muestraRetorno = esReparacion || esHidrostatica;
  const esRegulador = o.tipo_equipo === "Reguladores";
  // "Hold" (27-sep-2026, reemplaza el check "En espera" -- ver lib/holds.js).
  const hold = holdActivo(o.holds);
  const bitacora = o.bitacora_orden || [];
  // Lista de Códigos a cobrar para mostrar en bullets (feedback en vivo,
  // 6-oct-2026, pedido explícito: "los codigos a cobrar escritos se vean
  // tipo bullets") -- usa repuestos_usados_detalle (array con .nombre,
  // ver editar/form-client.js) cuando existe; si una orden vieja no lo
  // tiene, cae de vuelta a separar por coma el string repuestos_usados de
  // siempre, mismo fallback que ya usa el wizard de edición.
  const codigosLista =
    Array.isArray(o.repuestos_usados_detalle) && o.repuestos_usados_detalle.length > 0
      ? o.repuestos_usados_detalle.map((r) => r.nombre).filter(Boolean)
      : (o.repuestos_usados || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
  // Editar y Anular ahora se deciden por separado (ronda grande de
  // feedback, 27-sep-2026, pedido explícito: permiso nuevo y propio para
  // "editar orden"/"editar mantenimiento de compresor", sin tocar quién
  // puede anular -- eso sigue siendo Titular/Administrador, según la
  // política de borrado en la base de datos, migration_16.sql).
  const puedeEditar = tieneAcceso(
    profile,
    o.tipo_equipo === "Compresor" ? "equipos_clientes_editar_mantenimiento_compresor" : "equipos_clientes_editar_orden"
  );
  const puedeAnular = esTitular || !!profile?.is_admin;

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        {/* "← Volver"/miga de pan de la ficha (item 1, pedido explícito,
            27-sep-2026: "Click a orden en inicio o registro me lleva a
            listado de ordenes, deberia de llevarme a registro de ordenes")
            -- antes siempre regresaba a "Listado de órdenes"; ahora
            siempre regresa a "Registro de Órdenes", sin importar desde
            dónde se entró a la ficha ("aplica donde sea. el listado de
            ordenes solo se usa para quienes quieran hacer una consulta
            general de todo" -- ese listado sigue disponible aparte, desde
            "Más"). */}
        <Link href="/app-clientes/ordenes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Registro de Órdenes", href: "/app-clientes/ordenes" },
            { label: `No. ${o.no_orden_fisico ?? o.folio}` },
          ]}
        />
        {/* Título y botones en filas separadas (feedback en vivo,
            30-sep-2026, pedido explícito: "pon que el boton se vea en el
            mismo lugar en todas las fichas, aunque no lleven informe. Asi
            el boton se ve en el mismo lugar siempre") -- antes el título y
            el grupo de botones compartían una fila con
            justify-content:space-between, así que el grupo de botones
            quedaba pegado al margen derecho: al ser "Informe de
            mantenimiento" solo para Reguladores, el grupo cambiaba de
            ancho según el tipo de equipo y "Actualizar estado de orden"
            (el primer botón del grupo) se corría de lugar en la pantalla
            según la ficha. Ahora los botones van en su propia fila, abajo
            del título y alineados a la izquierda: "Actualizar estado de
            orden" siempre arranca en el mismo punto, lleve o no lleve
            Informe de mantenimiento al lado. */}
        <div style={{ marginBottom: 14 }}>
          <h1 className="page-title" style={{ marginBottom: 10 }}>
            No. {o.no_orden_fisico ?? o.folio} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
          </h1>
          {/* Acciones de la orden, todas juntas arriba (28-sep-2026, pedido
              explícito: "quiero mover de lugar y de forma los botones de
              reporte de la orden e informe de mantenimiento") --
              "Reporte de la orden" e "Informe de mantenimiento" vivían
              como texto suelto más abajo, encajados entre "Holds
              resueltos" y "Seguimiento" (ver item 244 más abajo, ahora
              quitado de ahí). Propuesta: agruparlas aquí junto a
              "Actualizar estado de orden" -- mismo lugar donde ya se
              buscan las acciones de la orden -- como botones secundarios
              chicos (mismo tamaño de botón que el resto de la app, no el
              texto plano de antes, pero sin competir con el primario). */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* "Reporte de la orden" se movió de acá para abajo, junto a
                "Ver bitácora de la orden" (28-sep-2026, feedback en vivo,
                item 18: "vamos a renombrar el boton de 'reporte de la
                orden' y vamos a ponerlo abajo, Debajo de ver bitacora de la
                orden") -- pendiente confirmar con Pipe el nuevo nombre del
                botón, por ahora se dejó el texto igual. */}
            {/* "Actualizar estado de orden" antes que "Informe de
                mantenimiento" (feedback en vivo, 29-sep-2026, pedido
                explícito: "intercambiar de lugar 'informe de mantenimiento'
                y 'actualizar estado de orden'") -- subió junto al título
                (item 6.5, feedback sobre v40, pedido explícito: "poner el
                editar y anular al final de la ficha y poner el actualizar
                estado de orden arriba") -- antes vivía más abajo, junto a
                "Seguimiento". Mismo ícono que su atajo en Registro de
                Órdenes (item 6.4, pedido explícito). Ya no se muestra una
                vez Entregada (item 7.3, pedido explícito) -- no hay nada
                más que actualizar. */}
            {puedeActualizarEstado && o.estado !== "Entregado" && (
              <Link href={`/app-clientes/ordenes/${o.id}/editar`}>
                <button
                  className="btn btn-primary"
                  type="button"
                  style={{ marginTop: 0, width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <IconRefresh size={15} />
                  Actualizar estado de orden
                </button>
              </Link>
            )}
            {esRegulador && puedeVerInforme && (
              <Link href={`/app-clientes/ordenes/${o.id}/informe`}>
                <button className="btn secondary" type="button" style={{ marginTop: 0, width: "auto", padding: "9px 14px", fontSize: 13 }}>
                  Informe de mantenimiento
                </button>
              </Link>
            )}
          </div>
        </div>

        <div className="card">
          {/* Grid compacto (23-sep-2026, pedido explícito: "se ve mucho
              espacio en blanco a la derecha") -- los campos cortos caen
              uno al lado del otro; Cliente/Equipo/Servicio/Autorización/
              Notas usan .campo-ancho porque su contenido puede ser largo
              (links, texto libre). */}
          {/* Bloque de arriba en dos columnas (feedback sobre v52, 6-oct-2026,
              pedido explícito, con foto: "Quiero mover la fecha, donde
              propones? veo que queda un espacio muy en blanco entre el
              estado y el cliente" -- se mostró una maqueta con 3 opciones y
              eligió la C: "me gusta la opcion C"). Izquierda: No. de orden
              con la Fecha de ingreso chiquita debajo, y el Estado; derecha:
              "Ver Recibo de la orden" arriba y la copia de "Códigos a
              cobrar" debajo. Así las dos columnas quedan de una altura
              parecida y desaparece el hueco que quedaba debajo del Estado.
              Historia: "Ver Recibo" vivía al final de la ficha hasta v52
              ("ponlo... entre el numero de orden y la fecha de ingreso",
              estilo etiqueta, opción 2); al salir la fecha de esa fila pasó
              arriba a la derecha. La copia de Códigos a cobrar es de v52
              ("quiero que el recuadro de códigos a cobrar salga en la parte
              de arriba... formato cuadrado... tipo bullets") -- el campo de
              siempre sigue en Seguimiento, más abajo. Mismo .campos-grid de
              siempre: en pantallas angostas las dos columnas se apilan. */}
          <div className="campos-grid" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* No. de orden / Estado destacados (item 24, pedido
                  explícito, 26-sep-2026: "pon esta info que resalten un
                  poco mas, es lo principal de una orden"). */}
              {o.no_orden_fisico ? (
                <div>
                  <Campo etiqueta="No. de orden" valor={o.no_orden_fisico} destacado />
                  <div className="hint-text" style={{ marginTop: 2 }}>
                    Ingreso: {formatFechaDDMMAAAADeDate(o.fecha)}
                  </div>
                </div>
              ) : (
                <Campo etiqueta="Fecha de ingreso" valor={formatFechaDDMMAAAADeDate(o.fecha)} />
              )}
              <Campo etiqueta="Estado" destacado>
                {/* El badge de "En Hold" separado se quitó (feedback sobre
                    v40, pedido explícito) -- ahora `o.estado` ES "En Hold"
                    mientras dure (ver lib/ordenes-estado.js), así que ya no
                    hace falta un segundo badge repitiendo lo mismo. */}
                <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`} style={{ marginLeft: 0 }}>
                  {o.estado}
                </span>
              </Campo>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {puedeVerReportes && (
                <Link
                  href={`/app-clientes/reportes/${o.id}`}
                  style={{
                    alignSelf: "flex-end",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--azul-claro)",
                    background: "var(--superficie-suave)",
                    border: "1px solid var(--borde)",
                    borderRadius: 6,
                    padding: "6px 11px",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Ver Recibo de la orden
                </Link>
              )}
              <div
                style={{
                  background: "var(--superficie-suave)",
                  border: "2px solid var(--azul-claro)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--azul-claro)", marginBottom: 4 }}>
                  CÓDIGOS A COBRAR
                </div>
                {codigosLista.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 15, fontSize: 13.5, lineHeight: 1.5 }}>
                    {codigosLista.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: 13.5 }}>—</div>
                )}
              </div>
            </div>
          </div>

          <div className="campos-grid">
            {/* Cliente / Equipo destacados (item 24, ver arriba). */}
            <Campo etiqueta="Cliente" full destacado>
              <Link href={`/app-clientes/clientes/${o.cliente_id}`} className="breadcrumb-crumb">
                {o.cliente_nombre_snapshot}
              </Link>
              {o.cliente_telefono && ` · ${o.cliente_telefono}`}
            </Campo>
            <Campo etiqueta="Equipo" full destacado>
              {o.equipo_id ? (
                <Link href={`/app-clientes/equipos/${o.equipo_id}`} className="breadcrumb-crumb">
                  {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                  {marcaModelo && ` — ${marcaModelo}`}
                </Link>
              ) : (
                <>
                  {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                  {marcaModelo && ` — ${marcaModelo}`}
                </>
              )}
            </Campo>
            <Campo etiqueta="Servicio a realizar" valor={o.que_se_hara} full />
            {o.autorizacion_cliente && (
              <Campo etiqueta="Autorización del cliente" full>
                {o.autorizacion_cliente}
                {o.autorizacion_notas && <div className="hint-text" style={{ marginTop: 2 }}>{o.autorizacion_notas}</div>}
              </Campo>
            )}
            {o.notas && <Campo etiqueta="Notas" valor={o.notas} full />}
          </div>

          {/* Banner de Hold activo (27-sep-2026, pedido explícito: "visible
              banner on ficha... showing the motivo" -- se resuelve desde
              "Actualizar estado de orden", con la Decisión del cliente). */}
          {hold && (
            <div
              style={{
                marginTop: 16,
                background: "var(--error-fondo)",
                border: "2px solid var(--rojo)",
                borderRadius: 10,
                padding: 14,
              }}
            >
              {/* "Orden en hold" en vez de solo "En hold", un poco más
                  grande (feedback en vivo, 29-sep-2026, pedido explícito:
                  "cambiar 'en hold - consulta a cliente' por 'orden en hold
                  - consulta a cliente' y ponlo un poco mas grande"). */}
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--rojo)" }}>
                ORDEN EN HOLD — {labelTipoHold(hold)}
              </div>
              <div style={{ fontSize: 14.5, marginTop: 4 }}>{detalleHold(hold)}</div>
              <div className="hint-text" style={{ marginTop: 4 }}>
                Desde el {formatFechaDDMMAAAADeDate(hold.fecha_inicio)} ({diasEnHold(hold)} día{diasEnHold(hold) === 1 ? "" : "s"} en Hold) — resuélvelo desde &quot;Actualizar estado de orden&quot;.
              </div>
            </div>
          )}

          {/* Historial de Holds resueltos (item 16, feedback sobre v40,
              pedido explícito: mostrar también en la ficha, no solo en
              "Actualizar estado de orden" -- para consulta rápida sin
              tener que entrar al wizard). */}
          {(o.holds || []).some((h) => !h.activo) && (
            <div style={{ marginTop: 12 }}>
              <div className="section-title" style={{ marginTop: 0, marginBottom: 6, fontSize: 12.5 }}>
                Holds resueltos
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(o.holds || [])
                  .filter((h) => !h.activo)
                  .map((h) => (
                    <div key={h.id} style={{ fontSize: 12.5, padding: "8px 10px", background: "var(--superficie-suave)", borderRadius: 8 }}>
                      <div style={{ fontWeight: 600 }}>
                        {labelTipoHold(h)} — {detalleHold(h)}
                      </div>
                      <div className="hint-text" style={{ marginTop: 2 }}>
                        Decisión del cliente: {h.decision === "si" ? "Sí" : h.decision === "no" ? "No" : "—"}
                        {h.decision_nota ? ` — ${h.decision_nota}` : ""} · {formatFechaDDMMAAAADeDate(h.fecha_inicio)} →{" "}
                        {formatFechaDDMMAAAADeDate(h.fecha_resolucion)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {o.foto_url && (
            <>
              <div className="section-title">Foto</div>
              {/* Lightbox en la misma página (item 23, pedido explícito,
                  26-sep-2026: "cuando se le de click a la foto, que se abra
                  ahi mismo, no en otra ventana") -- antes abría foto_url en
                  una pestaña nueva. */}
              <FotoLightbox src={o.foto_url} alt="Foto del equipo" />
            </>
          )}
        </div>

        {/* "Seguimiento" en adelante, en su propia caja (feedback en vivo,
            6-oct-2026, pedido explícito: "quiero que separes la seccion de
            seguimiento. O sea que de seguimiento para abajo, se vea como un
            cuadrado aparte a la info que esta arriba" -- confirmado en la
            maqueta: "la separacion la hiciste bien"). Revierte lo del
            23-sep (comentario al inicio de este archivo: info principal y
            Seguimiento en una sola tarjeta) -- la caja de arriba se queda
            con los datos principales, el Hold, los Holds resueltos y la
            Foto; esta, con Seguimiento, Nota, Bitácora, "Registrado por"
            y el folio. */}
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Seguimiento</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* "Se trabajó en tienda, no fue necesario enviarlo a taller"
                (feedback sobre v50, pedido explícito: "que figure que no
                fue necesario enviarse en la ficha de la orden") -- antes,
                si se marcaba `reparacion_en_tienda` en el wizard (ver
                editar/form-client.js, trabajadoEnTienda), esta ficha
                igual mostraba "—" en ambos campos, sin ninguna indicación
                de que fue a propósito y no un dato que falta. Mismo texto
                exacto que ya usa el wizard, para no decir lo mismo de dos
                formas distintas. */}
            {esReparacion && (
              <Campo
                etiqueta="Fecha de envío a taller o proveedor"
                valor={
                  o.reparacion_en_tienda
                    ? "Se trabajó en tienda, no fue necesario enviarlo a taller"
                    : o.fecha_envio
                      ? formatFechaDDMMAAAADeDate(o.fecha_envio)
                      : "—"
                }
              />
            )}
            {esHidrostatica && (
              <Campo etiqueta="Fecha de envío a prueba hidrostática" valor={o.fecha_envio_hidrostatica ? formatFechaDDMMAAAADeDate(o.fecha_envio_hidrostatica) : "—"} />
            )}
            {muestraRetorno && (
              <Campo
                etiqueta="Fecha de retorno a tienda"
                valor={
                  esReparacion && o.reparacion_en_tienda
                    ? "Se trabajó en tienda, no fue necesario enviarlo a taller"
                    : o.fecha_retorno_tienda
                      ? formatFechaDDMMAAAADeDate(o.fecha_retorno_tienda)
                      : "—"
                }
              />
            )}
            {esHidrostatica && (
              <Campo etiqueta="Inspección visual realizada" valor={o.inspeccion_visual_realizada ? "Listo" : "Pendiente"} />
            )}
            <Campo etiqueta="Fecha de listo para entrega" valor={o.fecha_listo_entrega ? formatFechaDDMMAAAADeDate(o.fecha_listo_entrega) : "—"} />
            <Campo etiqueta="Verificado por" valor={verificadoPorTexto} />
            <Campo etiqueta="Notificaciones al cliente">
              {!o.notificaciones_cliente || o.notificaciones_cliente.length === 0 ? (
                "—"
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {o.notificaciones_cliente.map((n, i) => (
                    <div key={i}>
                      <div>{formatFechaDDMMAAAADeDate(n.fecha)} — {n.medio}</div>
                      {n.notas && <div className="hint-text" style={{ marginTop: 0 }}>{n.notas}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Campo>
            <Campo etiqueta="Fecha de entrega al cliente" valor={o.fecha_entrega_cliente ? formatFechaDDMMAAAADeDate(o.fecha_entrega_cliente) : "—"} />
            <Campo etiqueta="Nombre de quien recibe" valor={o.nombre_recibe || "—"} />
            <Campo etiqueta="Factura de repuesto o servicio" valor={o.factura || "—"} />
            {/* "Códigos a cobrar" (23-sep-2026, pedido explícito: "que se
                vea que es algo aparte, que llame la atención") -- vivía en
                su propia caja destacada acá mismo. Desde el 6-oct-2026
                (pedido explícito, ver nota de la copia de arriba, junto a
                Estado) esa caja se volvió la copia de acceso rápido de
                arriba; acá en Seguimiento se dejó "del mismo tamaño que las
                demás cosas" (pedido explícito) -- un Campo más de la lista,
                sin recuadro ni colores propios. Renombrado de "Repuestos
                utilizados" (feedback sobre v40) -- y ya no se marca como
                obligatorio: ahora se puede cerrar la orden sin nada aquí,
                con una advertencia al guardar en vez de un bloqueo (item
                7.1). */}
            <Campo etiqueta="Códigos a cobrar">
              {codigosLista.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 15, lineHeight: 1.5 }}>
                  {codigosLista.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </Campo>
          </div>

          {/* Notas del técnico sobre el regulador (item 12, pedido
              explícito, 25-sep-2026) -- visible al cliente, aquí y en el
              reporte. Renombrada a "Nota" (1-oct-2026, pedido explícito,
              ver nota en editar/form-client.js) -- mismo campo. */}
          {o.notas_tecnico_regulador && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--texto-suave)", marginBottom: 2 }}>
                Nota
              </div>
              <div style={{ fontSize: 14.5 }}>{o.notas_tecnico_regulador}</div>
            </div>
          )}

          {/* Bitácora de la orden (27-sep-2026, pedido explícito: "si, que
              la pueda ver quien sea por ahora") -- historial de Holds
              resueltos, repuestos autorizados eliminados, y (desde
              30-sep-2026) también las ediciones de la orden. **Nota
              (30-sep-2026): se restringió a Titular/Administrador**
              (pedido explícito: "haz que solo yo tenga ese acceso y los
              administradores") -- ya no es visible a cualquiera con
              acceso a la app como en el diseño original. **Nota
              (6-oct-2026): se movió de último de todo, debajo de la Nota**
              (pedido explícito: "ponla de ultimo incluso debajo de la nota.
              muy debajo" -- "recuerda que solo yo veré ese cuando sea
              necesario") -- antes vivía junto a "Ver Recibo de la orden",
              antes de la Nota. También cambió de link de texto azul a
              texto normal con una raya azul abajo (opción 2 de las que se
              le mostraron), para que se vea aún más discreto -- "Ver
              Recibo de la orden" (de uso más frecuente) se movió arriba de
              la ficha, junto al No. de orden; ver esa nota más arriba. */}
          {puedeVerBitacoraOrden && (
            <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px dashed var(--borde)" }}>
              <Link
                href={`/app-clientes/ordenes/${o.id}/bitacora`}
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--texto)",
                  textDecoration: "none",
                  borderBottom: "2px solid var(--azul-claro)",
                  paddingBottom: 2,
                }}
              >
                Ver bitácora de la orden ({bitacora.length + edicionesBitacora.length})
              </Link>
            </div>
          )}

          {/* "Registrado por" (item 14, pedido explícito, 25-sep-2026:
              "pon el 'registrado por' abajo a la derecha, que se vea
              sutil. No es una info muy necesaria ni practica") -- se
              sacó de la grilla de arriba y se movió aquí. */}
          <div style={{ marginTop: 14, textAlign: "right", fontSize: 11, color: "var(--texto-suave)" }}>
            Registrado por {o.full_name} · {formatFecha(o.created_at)}
          </div>

          {/* "folio #X" (item 30, pedido explícito, 26-sep-2026: "pon que el
              numero de folio, en vez de que salga arriba, que salga abajo,
              al final de todo") -- antes vivía justo debajo del título de la
              página; ahora es lo último dentro de esta tarjeta (lo último de
              toda la ficha pasó a ser Editar/Anular, ver más abajo). */}
          <div className="folio-discreto" style={{ marginTop: 10, textAlign: "right" }}>
            folio #{o.folio}
          </div>
        </div>

        {/* "Ver historial de ediciones de esta orden" se quitó de acá
            (5-oct-2026, pedido explícito, ver nota de puedeVerBitacoraOrden
            más arriba) -- Bitácora de la orden ahora es un permiso que se
            puede dar igual, y muestra todo esto más holds/repuestos. */}

        {/* Editar/anular la orden (item 7, pedido explícito, 26-sep-2026:
            "más allá del seguimiento" -- cliente/equipo/servicio/No. de
            orden) -- movidos al final de todo (item 6.5, feedback sobre
            v40, pedido explícito: "poner el editar y anular al final de
            la ficha"), ya no junto al título; ese lugar ahora lo ocupa
            "Actualizar estado de orden" (ver arriba). Editar y Anular se
            muestran por separado según corresponda (puedeEditar/
            puedeAnular). */}
        {(puedeEditar || puedeAnular) && (
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <RegistroActions
              tabla="ordenes_equipos"
              registro={o}
              editHref={`/app-clientes/ordenes/${o.id}/editar-datos`}
              afterDelete="/app-clientes/historial"
              mostrarEditar={puedeEditar}
              mostrarAnular={puedeAnular}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ etiqueta, valor, children, full, destacado }) {
  return (
    <div className={full ? "campo-ancho" : undefined}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--texto-suave)", marginBottom: 2 }}>
        {etiqueta}
      </div>
      <div style={destacado ? { fontSize: 16.5, fontWeight: 700, color: "var(--texto)" } : { fontSize: 14.5 }}>
        {children !== undefined ? children : valor}
      </div>
    </div>
  );
}
