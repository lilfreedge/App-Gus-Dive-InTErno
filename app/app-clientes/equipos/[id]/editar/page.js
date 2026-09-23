import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import EditarEquipoForm from "./form-client";

// Editar un Equipo del cliente ya creado (pedido explícito, 23-sep-2026:
// "agregar que yo pueda editar equipos de clientes, agregame el acceso en
// administracion para darselo a los demas"). Mismo patrón que "Editar
// compresor" (app/equipos/compresores/[id]/editar): formulario precargado,
// registrarCambio antes del update para que quede en el historial de
// ediciones Titular-only de App Clientes (ver migration_24.sql, que
// extiende la política de cambios_historial a tabla = 'equipos_del_cliente').
// Gateado por el nuevo permiso granular equipos_clientes_editar_equipo
// (además de equipos_clientes para poder entrar a la app -- lo hace
// requirePermisoClientes).
export default async function EditarEquipoPage({ params }) {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_editar_equipo", `/app-clientes/equipos/${params.id}`);

  const { data: equipo } = await supabase
    .from("equipos_del_cliente")
    .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!equipo) notFound();

  const { data: cliente } = await supabase
    .from("clientes_equipos")
    .select("id, nombre")
    .eq("id", equipo.cliente_id)
    .maybeSingle();

  const tipoLabel = tipoEquipoLabel(equipo.tipo_equipo, equipo.tipo_equipo_otro);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/app-clientes/equipos/${equipo.id}`} className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Listado de clientes", href: "/app-clientes/clientes" },
            { label: cliente?.nombre || "Cliente", href: `/app-clientes/clientes/${equipo.cliente_id}` },
            { label: tipoLabel, href: `/app-clientes/equipos/${equipo.id}` },
            { label: "Editar" },
          ]}
        />
        <h1 className="page-title">Editar equipo</h1>

        <EditarEquipoForm equipo={equipo} />
      </div>
    </div>
  );
}
