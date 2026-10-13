import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { esServicioHidrostatica } from "@/lib/ordenes-estado";
import EditarServicioForm from "./form-client";

// V30: editar un servicio "queda solo para administradores y yo" --
// Titular, o Administrador con el permiso "Editar servicio"
// (equipos_clientes_editar_servicio). Antes bastaba con ver Base de datos.
export default async function EditarServicioPage({ params }) {
  const supabase = createClient();
  const { profile } = await requirePermisoClientes(
    supabase,
    "equipos_clientes_editar_servicio",
    "/app-clientes/catalogo/servicios"
  );
  if (!profile?.es_titular && !profile?.is_admin) redirect("/app-clientes/catalogo/servicios");

  const { data: servicio } = await supabase
    .from("servicios_catalogo")
    .select("id, nombre, activo, tipos_equipo")
    .eq("id", params.id)
    .maybeSingle();

  if (!servicio) notFound();

  // "Prueba Hidrostática" no se puede renombrar, desactivar ni eliminar
  // (item 29, pedido explícito, tras confirmar con el usuario que también
  // aplica a desactivar: "29. si") -- las fechas/lógica de la ficha de la
  // orden dependen de detectar este servicio por nombre (ver
  // esServicioHidrostatica en lib/ordenes-estado.js), así que cambiar el
  // nombre o quitarlo del catálogo rompería ese seguimiento.
  const protegido = esServicioHidrostatica(servicio.nombre);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/catalogo/servicios" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Base de datos", href: "/app-clientes/catalogo" },
            { label: "Servicios", href: "/app-clientes/catalogo/servicios" },
            { label: servicio.nombre },
          ]}
        />
        <h1 className="page-title">Editar servicio</h1>

        <EditarServicioForm servicio={servicio} protegido={protegido} />
      </div>
    </div>
  );
}
