import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import ReportesClient from "./reportes-client";

// Reportes (23-sep-2026, pedido explícito: "una idea que tengo en mente
// para futuro es que el app pueda emitir un reporte de su orden, donde
// se vea cambios realizados... la idea es que sea un reporte que se
// vaya alimentando en base al seguimiento" -- se arma solo con los datos
// que ya se van guardando en Seguimiento, no pide nada nuevo). El de
// tanques (prueba hidrostática, para que el cliente vea el resultado de
// su tanque) queda para más adelante -- pedido explícito de no tocarlo
// todavía ("me interesa para mucho mas par alante, no trabajes en eso")
// -- por ahora esta lista solo trae órdenes de Reguladores.
export default async function ReportesPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const { data: ordenes } = await supabase
    .from("ordenes_equipos")
    .select("id, folio, no_orden_fisico, cliente_nombre_snapshot, equipo_marca_snapshot, equipo_modelo_snapshot, fecha, estado")
    .eq("tipo_equipo", "Reguladores")
    .order("fecha", { ascending: false });

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
            { label: "Reportes" },
          ]}
        />
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">
          Reporte de seguimiento por orden, armado solo con lo que ya se fue registrando -- por ahora, solo para Reguladores.
        </p>

        <ReportesClient ordenes={ordenes || []} />
      </div>
    </div>
  );
}
