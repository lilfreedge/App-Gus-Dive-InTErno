import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import NavArrowsClientesServer from "@/components/NavArrowsClientesServer";
import Breadcrumb from "@/components/Breadcrumb";
import ClientesClient from "./clientes-client";
import Link from "next/link";

// Permiso granular propio (28-sep-2026, pedido explícito: "AGREGAR AQUI:
// Listado de clientes, listado de ordenes" en Permisos > General) --
// antes cualquiera con acceso base a la app (equipos_clientes) veía este
// botón fijo del menú superior; ahora hace falta también
// equipos_clientes_listado_clientes (el Titular lo sigue viendo siempre).
// El link del menú se oculta solo en TopbarClientes.js si falta el
// permiso -- este `requirePermisoClientes` es la protección real, por si
// alguien entra directo por la URL.
export default async function ListadoClientesPage() {
  const supabase = createClient();
  const { profile } = await requirePermisoClientes(supabase, "equipos_clientes_listado_clientes", "/app-clientes");
  const puedeAgregarCliente = !!profile?.es_titular || !!profile?.permisos?.equipos_clientes_agregar_cliente;

  const { data: clientes } = await supabase
    .from("clientes_equipos")
    .select("id, nombre, telefono, created_at")
    .order("nombre");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsClientesServer />
        <Breadcrumb items={[{ label: "App Equipos de clientes", href: "/app-clientes" }, { label: "Listado de clientes" }]} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>Listado de clientes</h1>
          {puedeAgregarCliente && (
            <Link href="/app-clientes/clientes/nuevo">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Agregar cliente
              </button>
            </Link>
          )}
        </div>

        <ClientesClient clientes={clientes || []} />
      </div>
    </div>
  );
}
