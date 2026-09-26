import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
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
  await requirePermiso(supabase, "equipos_clientes");

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
      <AppHeaderClientes />
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
              { label: `#${o.no_orden_fisico ?? o.folio}` },
            ]}
          />
        </div>
        <h1 className="page-title" style={{ marginBottom: 2 }}>
          Reporte — #{o.no_orden_fisico ?? o.folio}
        </h1>
        <div className="folio-discreto" style={{ marginBottom: 14 }}>
          folio #{o.folio}
        </div>

        <div style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }} className="no-print">
          <BotonImprimir />
          <a href={`/api/reportes-clientes/${o.id}/pdf`} className="btn secondary" style={{ marginTop: 0, textDecoration: "none" }}>
            Descargar PDF
          </a>
          <EnviarReporteClient ordenId={o.id} />
        </div>

        <div className="card">
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
        </div>
      </div>
    </div>
  );
}
