import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NuevaOrdenForm from "./form-client";

// Registrar orden -- App Equipos Clientes (23-sep-2026, primera versión
// real). Si viene ?cliente=<id> (desde la ficha de un cliente), llega
// preseleccionado. Gateado por el permiso granular
// equipos_clientes_registrar (item 15, pedido explícito).
export default async function NuevaOrdenPage({ searchParams }) {
  const supabase = createClient();
  const { profile } = await requirePermisoClientes(supabase, "equipos_clientes_registrar", "/app-clientes");
  const esTitular = !!profile?.es_titular;
  const permisos = profile?.permisos || {};
  const puedeAgregarCliente = esTitular || !!permisos.equipos_clientes_agregar_cliente;
  const puedeAgregarEquipo = esTitular || !!permisos.equipos_clientes_agregar_equipo;

  const [{ data: clientes }, { data: equipos }, { data: servicios }] = await Promise.all([
    supabase.from("clientes_equipos").select("id, nombre, telefono").order("nombre"),
    supabase
      .from("equipos_del_cliente")
      .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie"),
    // Catálogo de servicios (23-sep-2026) -- reemplaza la lista fija que
    // antes estaba en form-client.js, ver migration_21.sql.
    supabase.from("servicios_catalogo").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/ordenes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Registro de Órdenes", href: "/app-clientes/ordenes" },
            { label: "Registrar orden" },
          ]}
        />
        <h1 className="page-title">Registrar orden</h1>

        <NuevaOrdenForm
          clientes={clientes || []}
          equipos={equipos || []}
          servicios={servicios || []}
          clientePreseleccionado={searchParams?.cliente || ""}
          puedeAgregarCliente={puedeAgregarCliente}
          puedeAgregarEquipo={puedeAgregarEquipo}
        />
      </div>
    </div>
  );
}
