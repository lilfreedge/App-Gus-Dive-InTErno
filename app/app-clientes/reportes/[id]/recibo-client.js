"use client";

import { DESCARGO } from "@/lib/descargo";
import BotonImprimir from "@/components/BotonImprimir";
import EnviarReporteClient from "./enviar-client";

// Dos vistas del mismo documento (1-oct-2026, pedido explícito: "quitale
// que aparezca esto: Estado, fecha de listo para entrega, verificado por,
// notificaciones al cliente, fecha de entrega al cliente, nombre de quien
// recibe, factura de repuesto o servicio, codigos a cobrar. La idea es que
// el esto se pueda imprimir y el cliente tenga una constancia de lo que
// dejó. Pero igual me gustaria poder ver el recibo completo para consultar
// en caso de ser necesario") -- "Recibo" (filasSimple, default, lo que se
// le imprime/entrega al cliente) y "Recibo completo" (filasCompleto, todo
// lo de siempre, para consulta interna), con un botón para alternar entre
// las dos. Mismo patrón de "dos vistas" que ya usa el Informe de
// mantenimiento (Formulario técnico / Informe cliente). `vista` se manda
// también al PDF y al envío por correo, para que impriman/envíen
// exactamente lo que se está viendo en pantalla.
export default function ReciboClient({ orden: o, filasSimple, filasCompleto }) {
  // V69 (pedido explícito: "quitar boton de descargar pdf y quitar boton de
  // ver recibo completo") -- este recibo queda solo con la vista sencilla,
  // la que se le imprime/entrega al cliente. `filasCompleto` ya no se usa
  // aquí (la vista completa, para consulta interna, sigue en la ficha de la
  // orden en App Equipos de clientes).
  const vista = "simple";
  const filas = filasSimple;
  const numero = o.no_orden_fisico ?? o.folio;

  return (
    <>
      <div style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }} className="no-print">
        <BotonImprimir />
        <EnviarReporteClient ordenId={o.id} vista={vista} />
      </div>

      {/* Membrete navy + logo (item 2, pedido explícito, 27-sep-2026:
          "necesito que el reporte tenga el mismo formato que tienen los
          reportes del app interno") -- mismo estilo que el PDF y el
          correo, para que las tres versiones se vean igual. */}
      {/* V112 (con el PDF impreso de la orden 02178: "necesito que salga en 1
          sola página y abajo tenga una línea para que el cliente firme"; "no
          cambies el formato del recuadro de arriba… la letra quizá está muy
          pequeña… usa el espacio en blanco"): `recibo-hoja` hace que al
          imprimir quede en una hoja carta, con la firma abajo. */}
      <div className="card recibo-hoja" style={{ padding: 0, overflow: "hidden" }}>
        <div className="reporte-membrete">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-gus-icon.png" alt="Gus Dive" className="reporte-membrete-logo" />
          <div>
            <div className="reporte-membrete-titulo">
              {vista === "simple" ? "Recibo" : "Recibo completo"} — #{numero}
            </div>
            {o.cliente_nombre_snapshot && <div className="reporte-membrete-subtitulo">{o.cliente_nombre_snapshot}</div>}
          </div>
        </div>
        <div className="reporte-cuerpo" style={{ padding: 16 }}>
          <div style={{ overflow: "auto" }}>
            <table className="reporte-preview-tabla">
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.label}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{f.label}</td>
                    <td>{f.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* V69 (pedido explícito: "que no aparezca el folio abajo a la
              derecha, se ve mal") -- se quitó; antes iba aquí (27-sep-2026,
              también pedido explícito). */}
          {/* V57: el Descargo de Responsabilidad al final del Recibo. */}
          <div className="recibo-descargo">
            <b className="recibo-descargo-t">{DESCARGO.titulo}</b>
            <b>{DESCARGO.subtitulo}</b>
            {DESCARGO.intro.map((t) => (
              <p key={t}>{t}</p>
            ))}
            <ol>
              {DESCARGO.puntos.map((x) => (
                <li key={x.t}>
                  <b>{x.t}:</b> {x.texto}
                </li>
              ))}
            </ol>
            <p>
              <b>{DESCARGO.cierre}</b>
            </p>
          </div>
          {/* "quita la línea de poner fecha": solo la firma. */}
          <div className="recibo-firmas">
            <div>
              <b>Firma del cliente</b>
              {o.cliente_nombre_snapshot && <span>{o.cliente_nombre_snapshot}</span>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
