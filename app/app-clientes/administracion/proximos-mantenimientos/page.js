import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO } from "@/lib/fechas";

// "Próximos mantenimientos" (1-oct-2026, nueva feature, pedido explícito:
// "que cada equipo guarde esta info para yo poder consultar en alguna
// parte en caso de ser necesario... Necesito un lado donde pueda hacer
// ese tipos de consultar y saber que cliente llamar") -- lista todos los
// equipos con una fecha recomendada guardada (equipos_del_cliente.
// proximo_mantenimiento_recomendado, migration_46.sql), la más próxima
// primero, resaltando las ya vencidas. Se llena desde el Informe de
// mantenimiento (ver app/app-clientes/ordenes/[id]/informe/form-client.js,
// generarInforme) al marcar "6 meses"/"12 meses". Mismo permiso que
// Reportes -- no se creó uno nuevo, es la misma audiencia que ya puede
// ver esa información.
export default async function ProximosMantenimientosPage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_reportes", "/app-clientes/mas");

  const { data: equipos } = await supabase
    .from("equipos_del_cliente")
    .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie, proximo_mantenimiento_recomendado")
    .not("proximo_mantenimiento_recomendado", "is", null)
    .order("proximo_mantenimiento_recomendado", { ascending: true });

  // Consulta chica aparte para los clientes dueños (mismo criterio ya
  // usado en todo el proyecto: "consulta chica en vez de embed") --
  // batcheada con `.in(...)` en vez de una por equipo.
  const clienteIds = [...new Set((equipos || []).map((e) => e.cliente_id).filter(Boolean))];
  const { data: clientes } =
    clienteIds.length > 0
      ? await supabase.from("clientes_equipos").select("id, nombre, telefono").in("id", clienteIds)
      : { data: [] };
  const clientePorId = new Map((clientes || []).map((c) => [c.id, c]));

  const hoy = hoyISO();

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/mas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Próximos mantenimientos" },
          ]}
        />
        <h1 className="page-title">Próximos mantenimientos</h1>
        <p className="page-subtitle">
          Equipos con una fecha recomendada guardada desde un Informe de mantenimiento -- las más próximas primero.
        </p>

        {!equipos || equipos.length === 0 ? (
          <div className="empty">Todavía no hay ninguna recomendación guardada.</div>
        ) : (
          <div className="card">
            {equipos.map((e) => {
              const cliente = clientePorId.get(e.cliente_id);
              const vencido = e.proximo_mantenimiento_recomendado < hoy;
              const marcaModelo = [e.marca, e.modelo].filter(Boolean).join(" ");
              return (
                <Link key={e.id} href={`/app-clientes/equipos/${e.id}`} className="list-item" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                  <div className="list-item-top">
                    <div className="list-item-title">{cliente?.nombre || "Cliente"}</div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: vencido ? "var(--rojo)" : "var(--azul-texto)", whiteSpace: "nowrap" }}>
                      {formatFechaDDMMAAAADeDate(e.proximo_mantenimiento_recomendado)}
                      {vencido ? " -- vencido" : ""}
                    </span>
                  </div>
                  <div className="hint-text" style={{ marginTop: 2 }}>
                    {[tipoEquipoLabel(e.tipo_equipo, e.tipo_equipo_otro), marcaModelo].filter(Boolean).join(" · ")}
                    {e.serie ? ` · No. ${e.serie}` : ""}
                  </div>
                  {cliente?.telefono && <div className="hint-text" style={{ marginTop: 2 }}>{cliente.telefono}</div>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
