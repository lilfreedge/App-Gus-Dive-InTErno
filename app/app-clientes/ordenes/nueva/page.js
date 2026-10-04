import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes, tieneAcceso } from "@/lib/roles";
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
  // "Editar cliente" justo al lado de "Agregar cliente" (feedback en vivo,
  // 29-sep-2026, pedido explícito, item 8) -- mismo permiso que ya usa la
  // ficha del cliente (equipos_clientes_editar_cliente, exclusivo de
  // Administradores/Titular).
  const puedeEditarCliente = tieneAcceso(profile, "equipos_clientes_editar_cliente");

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

  // Ceros a la izquierda conservados en la sugerencia (1-oct-2026, pedido
  // explícito: "Pon que las secuencia se le vea el '0' o sea, '0001',
  // '0002', '0003'... Hoy en dia si escribo un 0 se me quita") -- la causa
  // real: esta sugerencia calculaba el siguiente número pero no conservaba
  // el ancho del anterior (si el último fue "0009", sugería "10" en vez de
  // "0010"), lo que además disparaba el aviso de abajo ("el siguiente
  // número esperado era...") y desalentaba seguir con el formato
  // acolchado. Ahora, si el último número tenía ceros a la izquierda, el
  // siguiente se rellena al mismo ancho (`padStart`); si no los tenía
  // (ej. "9"), sigue igual que antes.
  const ultimoTexto = (ultimaOrden?.no_orden_fisico || "").trim();
  const ultimoNumero = parseInt(ultimoTexto, 10);
  const noOrdenSugerido = Number.isFinite(ultimoNumero) ? String(ultimoNumero + 1).padStart(ultimoTexto.length, "0") : "";

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
          puedeEditarCliente={puedeEditarCliente}
          puedeAgregarEquipo={puedeAgregarEquipo}
          noOrdenSugerido={noOrdenSugerido}
        />
      </div>
    </div>
  );
}
