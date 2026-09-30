import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import EditarPiezaForm from "./form-client";

// Gateado por equipos_clientes_editar_codigo (feedback en vivo,
// 30-sep-2026, pedido explícito: permiso propio, exclusivo de
// Administradores, para EDITAR/borrar códigos ya existentes -- separado
// de equipos_clientes_catalogo que solo deja ver la pantalla).
export default async function EditarPiezaPage({ params }) {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_editar_codigo", "/app-clientes/catalogo/piezas");

  const { data: pieza } = await supabase
    .from("piezas_catalogo")
    .select("id, nombre, codigo, descripcion, activo")
    .eq("id", params.id)
    .maybeSingle();

  if (!pieza) notFound();

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/catalogo/piezas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Base de datos", href: "/app-clientes/catalogo" },
            { label: "Códigos a cobrar", href: "/app-clientes/catalogo/piezas" },
            { label: pieza.nombre },
          ]}
        />
        <h1 className="page-title">Editar código</h1>

        <EditarPiezaForm pieza={pieza} />
      </div>
    </div>
  );
}
