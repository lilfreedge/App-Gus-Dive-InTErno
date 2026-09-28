import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import BotonImprimir from "@/components/BotonImprimir";
import { filasReporteOrdenCliente } from "@/lib/reportes-clientes";
import EnviarReporteClient from "./enviar-client";

// Reporte de una orden (23-sep-2026, "se arma solo con lo ya guardado en
// Seguimiento"). Rediseñado 26-sep-2026 (item 5, pedido explícito: "necesito
// que el reporte tenga el mismo formato que tienen los reportes del app
// interno") -- la tabla Campo/Valor de abajo usa la misma clase
// (.reporte-preview-tabla) y las mismas filas (lib/reportes-clientes.js)
// que el PDF que se descarga y el que se manda por correo (item 15), para
// que las tres versiones nunca se desincronicen. Por ahora solo
// Reguladores, mismo alcance de siempre.
export default async function ReporteOrdenPage({ params }) {
  const supabase = createClient();
  // Permiso granular nuevo (ronda grande de feedback, 27-sep-2026, pedido
  // explícito) -- mismo permiso que la lista (app-clientes/reportes),
  // para que no se pueda entrar directo a la URL de un reporte sin él.
  await requirePermisoClientes(supabase, "equipos_clientes_reportes", "/app-clientes/mas");

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) notFound();
  if (o.tipo_equipo !== "Reguladores") notFound();

  let serie = null;
  if (o.equipo_id) {
    const { data: equipo } = await supabase
      .from("equipos_del_cliente")
      .select("serie")
      .eq("id", o.equipo_id)
      .maybeSingle();
    serie = equipo?.serie || null;
  }

  const filas = filasReporteOrdenCliente(o, { serie });

  return (
    <div>
      {/* Arreglo de impresión (28-sep-2026, pedido explícito sobre el
          Informe de mantenimiento, mismo bug acá: "el informe sigue
          saliendo con formato extrano, no el deseado") -- le faltaba
          "no-print" al encabezado de navegación (AppHeaderClientes), así
          que se imprimía completo arriba del reporte. */}
      <div className="no-print">
        <AppHeaderClientes />
      </div>
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/reportes" className="back-link no-print">
          ← Volver
        </Link>
        <div className="no-print">
          <Breadcrumb
            items={[
              { label: "App Equipos de clientes", href: "/app-clientes" },
              { label: "Más", href: "/app-clientes/mas" },
              { label: "Reportes", href: "/app-clientes/reportes" },
              { label: `No. ${o.no_orden_fisico ?? o.folio}` },
            ]}
          />
        </div>
        <div style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }} className="no-print">
          <BotonImprimir />
          <a href={`/api/reportes-clientes/${o.id}/pdf`} className="btn secondary" style={{ marginTop: 0, textDecoration: "none" }}>
            Descargar PDF
          </a>
          <EnviarReporteClient ordenId={o.id} />
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
              <div className="reporte-membrete-titulo">Reporte — #{o.no_orden_fisico ?? o.folio}</div>
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
                mismo lugar/estilo que ya usa la ficha de la orden
                (app/app-clientes/ordenes/[id]/page.js), antes iba arriba
                de la tabla. */}
            <div className="folio-discreto" style={{ marginTop: 10, textAlign: "right" }}>
              folio #{o.folio}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
