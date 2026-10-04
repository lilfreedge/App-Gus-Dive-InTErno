import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { filasReporteOrdenCliente, filasReciboClienteOrden } from "@/lib/reportes-clientes";
import ReciboClient from "./recibo-client";

// Reporte/Recibo de una orden (23-sep-2026, "se arma solo con lo ya
// guardado en Seguimiento"). Rediseñado 26-sep-2026 (item 5, pedido
// explícito: "necesito que el reporte tenga el mismo formato que tienen
// los reportes del app interno") -- la tabla Campo/Valor usa la misma
// clase (.reporte-preview-tabla) y las mismas filas (lib/reportes-clientes.js)
// que el PDF que se descarga y el que se manda por correo (item 15), para
// que las tres versiones nunca se desincronicen.
//
// **Ampliado a todo tipo de equipo, con dos vistas (1-oct-2026, pedido
// explícito, ver recibo-client.js)** -- antes esta pantalla (y el botón
// que llega acá desde la ficha de la orden) era solo para Reguladores;
// ahora cualquier tipo de orden puede tener su "Ver Recibo de la orden".
// El índice "Reportes e Informes" bajo Más (app/app-clientes/reportes/
// page.js) sigue acotado a Reguladores a propósito -- eso no se tocó, el
// pedido fue puntual sobre el link de la ficha + esta pantalla.
export default async function ReporteOrdenPage({ params }) {
  const supabase = createClient();
  // Permiso granular (ronda grande de feedback, 27-sep-2026, pedido
  // explícito) -- mismo permiso que gatea el link en la ficha de la orden,
  // para que no se pueda entrar directo a la URL sin él.
  await requirePermisoClientes(supabase, "equipos_clientes_reportes", "/app-clientes/mas");

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) notFound();

  let serie = null;
  if (o.equipo_id) {
    const { data: equipo } = await supabase
      .from("equipos_del_cliente")
      .select("serie")
      .eq("id", o.equipo_id)
      .maybeSingle();
    serie = equipo?.serie || null;
  }

  const filasSimple = filasReciboClienteOrden(o, { serie });
  const filasCompleto = filasReporteOrdenCliente(o, { serie });

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
        {/* "← Volver" y la miga de pan ahora apuntan a la ficha de la
            orden (1-oct-2026) en vez del índice "Reportes e Informes" --
            ese índice sigue acotado a Reguladores, así que para una orden
            de otro tipo de equipo no tendría sentido volver ahí. */}
        <Link href={`/app-clientes/ordenes/${o.id}`} className="back-link no-print">
          ← Volver
        </Link>
        <div className="no-print">
          <Breadcrumb
            items={[
              { label: "App Equipos de clientes", href: "/app-clientes" },
              { label: "Registro de Órdenes", href: "/app-clientes/ordenes" },
              { label: `No. ${o.no_orden_fisico ?? o.folio}`, href: `/app-clientes/ordenes/${o.id}` },
              { label: "Recibo de la orden" },
            ]}
          />
        </div>

        <ReciboClient orden={o} filasSimple={filasSimple} filasCompleto={filasCompleto} />
      </div>
    </div>
  );
}
