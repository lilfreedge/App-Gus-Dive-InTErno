import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireInterno, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialClient from "./historial-client";
import { todasLasFilas } from "@/lib/todas-las-filas";
import { cargarRecordatorios, proximaInspeccionDe } from "@/lib/recordatorios";
import { hoyISO } from "@/lib/fechas";

// V37 -- Historial de mantenimientos de compresores, ampliado (pedido
// explícito: "ponlo más ampliado donde se pueda ver, por compresor, el
// nivel de aceite si va bajando... mucha más información histórica, no que
// uno tenga que abrir para ver detalle"; maquetas plan-v37 aprobadas):
// - Por compresor: cuadritos de resumen, gráfica del aceite y una tabla con
//   todo en una fila (en el celular, tarjetas).
// - "Todos": una tarjetita por compresor y la tabla con todos juntos.
// - "Personalizar vista": solo el Titular y los administradores.
// - Permiso propio "Ver historial de mantenimientos" (migration_70.sql).
export default async function HistorialCompresoresPage({ searchParams }) {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "compresores");
  if (!tieneAcceso(profile, "compresores_historial")) redirect("/equipos/compresores");

  const hoy = hoyISO();
  const [mantenimientos, { data: compresores }, { items: recordatorios }] = await Promise.all([
    todasLasFilas(supabase, "mantenimientos_compresores_con_nombre", (q) =>
      q.select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false }).order("id")
    ),
    supabase.from("compresores").select("id, codigo, descripcion, activo").order("codigo"),
    cargarRecordatorios(supabase, { hoy }),
  ]);

  const proximas = {};
  for (const c of compresores || []) proximas[c.id] = proximaInspeccionDe(recordatorios, c.id);

  const esAdmin = !!profile?.es_titular || !!profile?.is_admin;

  return (
    <div>
      <AppHeader />
      <div className="page page-ancha" style={{ paddingTop: 24 }}>
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
        <HistorialClient
          mantenimientos={mantenimientos || []}
          compresores={compresores || []}
          compresorInicial={searchParams?.compresor || ""}
          proximas={proximas}
          hoy={hoy}
          esAdmin={esAdmin}
          miId={profile?.id}
          vistaGuardada={esAdmin ? profile?.vista_historial_compresores || null : null}
        />
      </div>
    </div>
  );
}
