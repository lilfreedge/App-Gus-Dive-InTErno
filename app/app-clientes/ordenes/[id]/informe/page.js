import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import InformeMantenimientoForm from "./form-client";

// "Informe de mantenimiento" (item 36, nueva feature, ronda grande de
// feedback, 27-sep-2026) -- mockup aprobado Informe.dc.html. Pantalla
// propia, separada de "Actualizar estado de orden" y de "Reportes": un
// formulario estructurado que llena el técnico (marca/modelo/serie,
// trabajo realizado, presión, observación, aprobado/no aprobado) y que
// se convierte en el informe/PDF que se entrega al cliente. Por ahora
// solo Reguladores, mismo alcance que ya tenía Reportes.
export default async function InformeMantenimientoPage({ params }) {
  const supabase = createClient();
  const { profile } = await requirePermisoClientes(
    supabase,
    "equipos_clientes_informe_mantenimiento",
    `/app-clientes/ordenes/${params.id}`
  );

  const { data: orden } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!orden) notFound();
  if (orden.tipo_equipo !== "Reguladores") notFound();

  let serie = null;
  if (orden.equipo_id) {
    const { data: equipo } = await supabase
      .from("equipos_del_cliente")
      .select("serie")
      .eq("id", orden.equipo_id)
      .maybeSingle();
    serie = equipo?.serie || null;
  }

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/app-clientes/ordenes/${params.id}`} className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Registro de Órdenes", href: "/app-clientes/ordenes" },
            { label: `No. ${orden.no_orden_fisico ?? orden.folio}`, href: `/app-clientes/ordenes/${params.id}` },
            { label: "Informe de mantenimiento" },
          ]}
        />
        <h1 className="page-title">Informe de mantenimiento</h1>

        <InformeMantenimientoForm orden={orden} serie={serie} tecnicoSugerido={profile?.full_name || ""} />
      </div>
    </div>
  );
}
