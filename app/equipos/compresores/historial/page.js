import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialClient from "./historial-client";

// Historial de mantenimientos de compresores, con filtros (tipo,
// compresor, responsable, rango de fechas -- ítem 3 de la respuesta
// enumerada del 23-sep-2026). El filtrado es en el cliente (mismo
// criterio que las búsquedas de catálogos) ya que el volumen de
// mantenimientos no amerita paginación server-side todavía.
export default async function HistorialCompresoresPage({ searchParams }) {
  const supabase = createClient();
  await requirePermiso(supabase, "compresores");

  const [{ data: mantenimientos }, { data: compresores }] = await Promise.all([
    supabase.from("mantenimientos_compresores_con_nombre").select("*").limit(500),
    supabase.from("compresores").select("id, codigo, descripcion").order("codigo"),
  ]);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/compresores" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Compresores", href: "/equipos/compresores" },
            { label: "Historial de mantenimientos" },
          ]}
        />
        <h1 className="page-title">Historial de mantenimientos</h1>

        <HistorialClient
          mantenimientos={mantenimientos || []}
          compresores={compresores || []}
          compresorInicial={searchParams?.compresor || ""}
        />
      </div>
    </div>
  );
}
