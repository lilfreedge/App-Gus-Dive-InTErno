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

  const [{ data: clientes }, { data: equipos }, { data: servicios }, { data: ultimaOrden }] = await Promise.all([
    supabase.from("clientes_equipos").select("id, nombre, telefono").order("nombre"),
    supabase
      .from("equipos_del_cliente")
      .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie, regulador_componentes_detalle"),
    // Catálogo de servicios (23-sep-2026) -- reemplaza la lista fija que
    // antes estaba en form-client.js, ver migration_21.sql. `tipos_equipo`
    // (item 21, migration_29.sql) filtra qué servicios se ofrecen según el
    // tipo de Equipo elegido.
    supabase.from("servicios_catalogo").select("id, nombre, tipos_equipo").eq("activo", true).order("nombre"),
    // No. de orden auto-sugerido (item 17, pedido explícito, 26-sep-2026:
    // "que la secuencia de no. al registrar una orden se ponga sola y se
    // base en el ultimo numero escrito") -- se lee el último no_orden_fisico
    // (por fecha de creación, no por el número en sí -- puede no ser
    // estrictamente numérico) y se le suma 1 si es un número entero.
    supabase
      .from("ordenes_equipos")
      .select("no_orden_fisico")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const ultimoNumero = parseInt(ultimaOrden?.no_orden_fisico, 10);
  const noOrdenSugerido = Number.isFinite(ultimoNumero) ? String(ultimoNumero + 1) : "";

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
          noOrdenSugerido={noOrdenSugerido}
        />
      </div>
    </div>
  );
}
