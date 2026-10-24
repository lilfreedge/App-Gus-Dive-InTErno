import Link from "next/link";
import { formatFechaDDMMAAAADeDate, formatFechaDDMMAAAA } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { labelTipoHold, detalleHold, diasEnHold } from "@/lib/holds";
import FotoLightbox from "@/components/FotoLightbox";
import { IconRefresh } from "@/components/icons";

// V38 -- Ficha de la orden para el rol Técnico, más sencilla (pedido
// explícito: "pon que al técnico la ficha... le salga más sencilla", opción
// A de maqueta-v38.html: "solo lo de su trabajo"; y "ponle el shortcut de
// botón de seguimiento", maqueta-v38-2.html). El técnico no ve el contacto
// del cliente ("sí, cliente no debe de ver contacto"): solo el nombre, sin
// teléfono ni link a la ficha del cliente. Tampoco ve el Seguimiento de la
// tienda (envío, entrega, factura...), "Registrado por" ni el folio. El
// Titular y los administradores siguen viendo la ficha completa.

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  "En Hold": "badge-rojo",
  Entregado: "badge-verde",
};

const DIA_MS = 24 * 60 * 60 * 1000;

function diasDesde(desdeIso, hoyIso) {
  if (!desdeIso) return null;
  const n = Math.round((Date.parse(`${hoyIso}T00:00:00Z`) - Date.parse(`${String(desdeIso).slice(0, 10)}T00:00:00Z`)) / DIA_MS);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function primerNombre(nombre) {
  return String(nombre || "").trim().split(/\s+/)[0] || "";
}

export default function FichaOrdenTecnico({
  o,
  miId,
  hoy,
  hold,
  serie = null,
  codigosLista = [],
  puedeActualizarEstado = false,
  puedeVerInforme = false,
}) {
  const esRegulador = o.tipo_equipo === "Reguladores";
  const marcaModelo = [o.equipo_marca_snapshot, o.equipo_modelo_snapshot].filter(Boolean).join(" ");
  const equipoTexto = `${tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}${marcaModelo ? ` — ${marcaModelo}` : ""}`;
  const dias = diasDesde(o.fecha, hoy);
  const abierta = o.estado !== "Entregado";
  const puedeActualizar = puedeActualizarEstado && abierta;
  const linkActualizar = `/app-clientes/ordenes/${o.id}/editar?from=mis-ordenes`;

  let asignacion = null;
  if (o.tecnico_asignado_id && o.tecnico_asignado_id === miId) {
    asignacion = o.asignada_por_nombre
      ? `Te la asignó ${primerNombre(o.asignada_por_nombre)}${o.asignada_en ? ` el ${formatFechaDDMMAAAA(o.asignada_en)}` : ""}`
      : "Asignada a ti";
  } else if (o.tecnico_asignado_id) {
    asignacion = `Asignada a ${o.tecnico_nombre || "otro técnico"}`;
  } else if (abierta) {
    asignacion = "Sin asignar";
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <h1 className="page-title" style={{ marginBottom: 10 }}>
          No. {o.no_orden_fisico ?? o.folio} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {puedeActualizar && (
            <Link href={linkActualizar}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`} style={{ marginLeft: 0, fontSize: 13 }}>
            {o.estado}
          </span>
          <span className="hint-text" style={{ margin: 0 }}>
            {abierta
              ? `Ingresó el ${formatFechaDDMMAAAADeDate(o.fecha)}${
                  dias === null ? "" : dias === 0 ? " · hoy" : ` · hace ${dias} día${dias === 1 ? "" : "s"}`
                }`
              : o.fecha_entrega_cliente
                ? `Entregada el ${formatFechaDDMMAAAADeDate(o.fecha_entrega_cliente)}`
                : `Ingresó el ${formatFechaDDMMAAAADeDate(o.fecha)}`}
          </span>
        </div>
        {asignacion && (
          <div className="hint-text" style={{ margin: "0 0 14px" }}>
            {asignacion}
          </div>
        )}

        {/* El aviso de Hold se queda igual que en la ficha completa. */}
        {hold && (
          <div
            style={{
              margin: "4px 0 14px",
              background: "var(--error-fondo)",
              border: "2px solid var(--rojo)",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--rojo)" }}>ORDEN EN HOLD — {labelTipoHold(hold)}</div>
            <div style={{ fontSize: 14.5, marginTop: 4 }}>{detalleHold(hold)}</div>
            <div className="hint-text" style={{ marginTop: 4 }}>
              Desde el {formatFechaDDMMAAAADeDate(hold.fecha_inicio)} ({diasEnHold(hold)} día{diasEnHold(hold) === 1 ? "" : "s"} en Hold)
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Campo etiqueta="Equipo" destacado>
            {equipoTexto}
            {serie && (
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--texto-suave)", marginTop: 2 }}>No. Serie {serie}</div>
            )}
            {o.equipo_id && (
              <div style={{ marginTop: 4, fontSize: 12.5 }}>
                <Link href={`/app-clientes/equipos/${o.equipo_id}?orden=${o.id}`} className="breadcrumb-crumb">
                  Ver lo que se le ha hecho antes ›
                </Link>
              </div>
            )}
          </Campo>
          <Campo etiqueta="Servicio a realizar">
            <b>{o.que_se_hara || "—"}</b>
          </Campo>
          {o.autorizacion_cliente && (
            <Campo etiqueta="Autorización del cliente">
              {o.autorizacion_cliente}
              {o.autorizacion_notas && <div className="hint-text" style={{ marginTop: 2 }}>{o.autorizacion_notas}</div>}
            </Campo>
          )}
          {o.notas && <Campo etiqueta="Notas de recepción" valor={o.notas} />}
          <Campo etiqueta="Cliente" valor={o.cliente_nombre_snapshot || "—"} />
          {o.foto_url && (
            <div>
              <FotoLightbox src={o.foto_url} alt="Foto del equipo" />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          Tu trabajo
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* V38: el informe de los reguladores, a la vista (sin informe no
              puede poner "listo"). */}
          {esRegulador && (
            <Campo etiqueta="Informe de mantenimiento">
              {o.informe_mantenimiento ? (
                <span style={{ color: "var(--verde)", fontWeight: 700 }}>
                  ✓ Informe listo
                  {puedeVerInforme && (
                    <Link
                      href={`/app-clientes/ordenes/${o.id}/informe`}
                      style={{ marginLeft: 10, fontSize: 13, color: "var(--azul-claro)", textDecoration: "none" }}
                    >
                      Ver o cambiar
                    </Link>
                  )}
                </span>
              ) : (
                <>
                  <span style={{ color: "var(--rojo)", fontWeight: 700 }}>Falta el informe</span>
                  {puedeVerInforme && abierta && (
                    <div style={{ marginTop: 6 }}>
                      <Link href={`/app-clientes/ordenes/${o.id}/informe`}>
                        <button className="btn secondary" type="button" style={{ marginTop: 0, width: "auto" }}>
                          Llenar el informe
                        </button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </Campo>
          )}
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
          <Campo etiqueta="Nota" valor={o.notas_tecnico_regulador || "—"} />
        </div>
        {/* Atajo al seguimiento también aquí abajo (pedido explícito:
            "ponle el shortcut de botón de seguimiento"), para no tener que
            subir. */}
        {puedeActualizar && (
          <Link href={linkActualizar}>
            <button
              className="btn btn-primary"
              type="button"
              style={{ marginTop: 14, width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <IconRefresh size={15} />
              Actualizar estado de orden
            </button>
          </Link>
        )}
      </div>
    </>
  );
}

function Campo({ etiqueta, valor, children, destacado }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--texto-suave)", marginBottom: 2 }}>{etiqueta}</div>
      <div style={destacado ? { fontSize: 16.5, fontWeight: 700, color: "var(--texto)" } : { fontSize: 14.5 }}>
        {children !== undefined ? children : valor}
      </div>
    </div>
  );
}
