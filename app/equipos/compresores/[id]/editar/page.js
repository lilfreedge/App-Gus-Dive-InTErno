import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import EditarCompresorForm from "./form-client";

// Editar un compresor del catálogo. Gateado por el permiso "compresores"
// (el mismo que gatea toda la sección). El cambio queda en el historial
// de ediciones (Administración > Historial), pedido explícito del
// usuario, 23-sep-2026.
export default async function EditarCompresorPage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "compresores");

  const { data: compresor } = await supabase.from("compresores").select("*").eq("id", params.id).single();

  if (!compresor) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/equipos/compresores/${params.id}`} className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Compresores", href: "/equipos/compresores" },
            { label: compresor.codigo, href: `/equipos/compresores/${params.id}` },
            { label: "Editar" },
          ]}
        />
        <h1 className="page-title">Editar compresor</h1>

        <EditarCompresorForm compresor={compresor} />
      </div>
    </div>
  );
}
