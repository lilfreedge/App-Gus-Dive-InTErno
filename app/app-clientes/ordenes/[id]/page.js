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
import { holdActivo, diasEnHold, labelTipoHold, detalleHold } from "@/lib/holds";
import FotoLightbox from "@/components/FotoLightbox";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
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
  // permiso (antes cualquiera con acceso a la app veía el botón), y "Ver
  // historial de ediciones de esta orden" pasó de Titular-only al mismo
  // permiso que gatea la pantalla completa de Historial.
  const puedeActualizarEstado = tieneAcceso(profile, "equipos_clientes_actualizar_estado");
  const puedeVerHistorial = tieneAcceso(profile, "equipos_clientes_historial");
  // Item 36, nueva feature (mockup Informe.dc.html) -- permiso propio,
  // separado de "Actualizar estado de orden".
  const puedeVerInforme = tieneAcceso(profile, "equipos_clientes_informe_mantenimiento");

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) notFound();

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            No. {o.no_orden_fisico ?? o.folio} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
          </h1>
          {/* Editar/anular la orden (item 7, pedido explícito, 26-sep-2026:
              "más allá del seguimiento" -- cliente/equipo/servicio/No. de
              orden). Mismo componente que ya usa el resto de la app.
              Editar y Anular se muestran por separado según corresponda
              (ver puedeEditar/puedeAnular arriba). */}
          {(puedeEditar || puedeAnular) && (
            <RegistroActions
              tabla="ordenes_equipos"
              registro={o}
              editHref={`/app-clientes/ordenes/${o.id}/editar-datos`}
              afterDelete="/app-clientes/historial"
              mostrarEditar={puedeEditar}
              mostrarAnular={puedeAnular}
            />
          )}
        </div>

        <div className="card">
          {/* Grid compacto (23-sep-2026, pedido explícito: "se ve mucho
              espacio en blanco a la derecha") -- los campos cortos caen
              uno al lado del otro; Cliente/Equipo/Servicio/Autorización/
              Notas usan .campo-ancho porque su contenido puede ser largo
              (links, texto libre). */}
          <div className="campos-grid">
            {/* No. de orden / Estado / Cliente / Equipo destacados (item 24,
                pedido explícito, 26-sep-2026: "pon esta info que resalten un
                poco mas, es lo principal de una orden") -- mismo grid de
                siempre, solo con más peso visual que Fecha/Servicio/etc. */}
            {o.no_orden_fisico && <Campo etiqueta="No. de orden" valor={o.no_orden_fisico} destacado />}
            <Campo etiqueta="Fecha de ingreso" valor={formatFechaDDMMAAAADeDate(o.fecha)} />
            <Campo etiqueta="Estado" destacado>
              <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`} style={{ marginLeft: 0 }}>
                {o.estado}
              </span>
              {o.en_espera && (
                <span className="badge badge-rojo" style={{ marginLeft: 6 }}>
                  {/* "En Hold" (pedido explícito, ronda grande de feedback,
                      27-sep-2026: renombrar también este badge, no solo el
                      título de la sección en Inicio). */}
                  En Hold{o.motivo_espera ? ` — ${o.motivo_espera}` : ""}
                </span>
              )}
            </Campo>
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
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--rojo)" }}>
                EN HOLD — {labelTipoHold(hold)}
              </div>
              <div style={{ fontSize: 14.5, marginTop: 4 }}>{detalleHold(hold)}</div>
              <div className="hint-text" style={{ marginTop: 4 }}>
                Desde el {formatFechaDDMMAAAADeDate(hold.fecha_inicio)} ({diasEnHold(hold)} día{diasEnHold(hold) === 1 ? "" : "s"} en Hold) — resuélvelo desde &quot;Actualizar estado de orden&quot;.
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

          {/* Reporte de esta orden (items 5/14/15; reubicado arriba de
              Seguimiento -- item 14, pedido explícito, 26-sep-2026: "ponlo
              en la seccion de la orden. arriba de seguimiento" -- antes
              vivía fuera de esta tarjeta, después de "Registrado por"). Por
              ahora solo Reguladores, mismo alcance que ya tenía Reportes. */}
          {esRegulador && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <Link
                href={`/app-clientes/reportes/${o.id}`}
                className="btn secondary"
                style={{ width: "100%", display: "flex", justifyContent: "center", textDecoration: "none" }}
              >
                Ver, descargar o enviar el reporte de esta orden
              </Link>
              {/* Informe de mantenimiento (item 36, nueva feature, mockup
                  Informe.dc.html) -- distinto del Reporte de arriba: un
                  formulario estructurado que llena el técnico y se
                  convierte en el documento que se entrega al cliente. */}
              {puedeVerInforme && (
                <Link
                  href={`/app-clientes/ordenes/${o.id}/informe`}
                  className="btn secondary"
                  style={{ width: "100%", display: "flex", justifyContent: "center", textDecoration: "none" }}
                >
                  Informe de mantenimiento
                </Link>
              )}
            </div>
          )}

          <div className="section-title">Seguimiento</div>
          {puedeActualizarEstado && (
            <Link href={`/app-clientes/ordenes/${o.id}/editar`}>
              <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 14 }}>
                Actualizar estado de orden
              </button>
            </Link>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {esReparacion && (
              <Campo etiqueta="Fecha de envío a taller o proveedor" valor={o.fecha_envio ? formatFechaDDMMAAAADeDate(o.fecha_envio) : "—"} />
            )}
            {esHidrostatica && (
              <Campo etiqueta="Fecha de envío a prueba hidrostática" valor={o.fecha_envio_hidrostatica ? formatFechaDDMMAAAADeDate(o.fecha_envio_hidrostatica) : "—"} />
            )}
            {muestraRetorno && (
              <Campo etiqueta="Fecha de retorno a tienda" valor={o.fecha_retorno_tienda ? formatFechaDDMMAAAADeDate(o.fecha_retorno_tienda) : "—"} />
            )}
            {esHidrostatica && (
              <Campo etiqueta="Inspección visual realizada" valor={o.inspeccion_visual_realizada ? "Listo" : "Pendiente"} />
            )}
            <Campo etiqueta="Fecha de listo para entrega" valor={o.fecha_listo_entrega ? formatFechaDDMMAAAADeDate(o.fecha_listo_entrega) : "—"} />
            <Campo etiqueta="Verificado por" valor={o.verificado_por || "—"} />
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
          </div>

          {/* Repuestos utilizados, destacado (23-sep-2026, pedido
              explícito: "que se vea que es algo aparte, que llame la
              atención... mandatorio [al] cerrar la orden") -- caja
              propia en vez de un Campo más de la lista. */}
          <div
            style={{
              marginTop: 16,
              background: "var(--superficie-suave)",
              border: "2px solid var(--azul-claro)",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--azul-claro)", marginBottom: 4 }}>
              REPUESTOS UTILIZADOS {!o.repuestos_usados && o.estado !== "Entregado" && "(obligatorio antes de entregar)"}
            </div>
            <div style={{ fontSize: 14.5 }}>{o.repuestos_usados || "—"}</div>
          </div>

          {/* Bitácora de la orden (27-sep-2026, pedido explícito: "si, que
              la pueda ver quien sea por ahora") -- historial de Holds
              resueltos y repuestos autorizados eliminados. Visible a
              cualquiera con acceso a la app, no solo Titular (a diferencia
              de "Ver historial de ediciones" más abajo). */}
          <div style={{ marginTop: 10 }}>
            <Link
              href={`/app-clientes/ordenes/${o.id}/bitacora`}
              style={{ fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
            >
              Ver bitácora de la orden ({bitacora.length}) →
            </Link>
          </div>

          {/* Notas del técnico sobre el regulador (item 12, pedido
              explícito, 25-sep-2026) -- visible al cliente, aquí y en el
              reporte. */}
          {o.notas_tecnico_regulador && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--texto-suave)", marginBottom: 2 }}>
                Notas del técnico sobre el regulador
              </div>
              <div style={{ fontSize: 14.5 }}>{o.notas_tecnico_regulador}</div>
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
              página; ahora es lo último que se ve en toda la ficha. */}
          <div className="folio-discreto" style={{ marginTop: 10, textAlign: "right" }}>
            folio #{o.folio}
          </div>
        </div>

        {puedeVerHistorial && (
          <div style={{ marginTop: 10 }}>
            <Link
              href={`/app-clientes/administracion/historial?orden=${o.id}`}
              style={{ fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
            >
              Ver historial de ediciones de esta orden →
            </Link>
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
