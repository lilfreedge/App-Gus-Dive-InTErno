"use client";

import { useState } from "react";
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
  const [vista, setVista] = useState("simple");
  const filas = vista === "simple" ? filasSimple : filasCompleto;
  const numero = o.no_orden_fisico ?? o.folio;

  return (
    <>
      <div style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }} className="no-print">
        <BotonImprimir />
        <a
          href={`/api/reportes-clientes/${o.id}/pdf?vista=${vista}`}
          className="btn secondary"
          style={{ marginTop: 0, textDecoration: "none" }}
        >
          Descargar PDF
        </a>
        <EnviarReporteClient ordenId={o.id} vista={vista} />
        <button
          type="button"
          className="btn secondary"
          onClick={() => setVista((v) => (v === "simple" ? "completo" : "simple"))}
          style={{ marginTop: 0, marginLeft: "auto" }}
        >
          {vista === "simple" ? "Ver recibo completo →" : "← Ver recibo (cliente)"}
        </button>
      </div>

      {/* Membrete navy + logo (item 2, pedido explícito, 27-sep-2026:
          "necesito que el reporte tenga el mismo formato que tienen los
          reportes del app interno") -- mismo estilo que el PDF y el
          correo, para que las tres versiones se vean igual. */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
        <div style={{ padding: 16 }}>
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
          {/* Folio movido abajo a la derecha, chico (pedido explícito,
              27-sep-2026: "pon el folio abajo a la derecha pequeño") --
              mismo lugar/estilo que ya usa la ficha de la orden. */}
          <div className="folio-discreto" style={{ marginTop: 10, textAlign: "right" }}>
            folio #{o.folio}
          </div>
        </div>
      </div>
    </>
  );
}
