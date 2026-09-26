import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import EditarMantenimientoCompresorForm from "./form-client";

// Editar/anular un mantenimiento de compresor ya registrado (item 8,
// pedido explícito, 26-sep-2026). La base de datos ya solo deja
// editar/borrar mantenimientos de compresores al Titular o un
// Administrador (migration_14.sql) -- este gate es el mismo, para no
// mostrar un formulario que el servidor va a rechazar.
export default async function EditarMantenimientoCompresorPage({ params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  if (!profile?.es_titular && !profile?.is_admin) {
    redirect("/equipos/compresores");
  }

  const { data: m } = await supabase
    .from("mantenimientos_compresores")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!m) notFound();

  const { data: compresores } = await supabase
    .from("compresores")
    .select("id, codigo, descripcion")
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/equipos/compresores/mantenimiento/${params.id}`} className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Compresores", href: "/equipos/compresores" },
            { label: "Historial de mantenimientos", href: "/equipos/compresores/historial" },
            { label: `#${m.folio}`, href: `/equipos/compresores/mantenimiento/${params.id}` },
            { label: "Editar" },
          ]}
        />
        <h1 className="page-title">Editar mantenimiento</h1>

        <EditarMantenimientoCompresorForm mantenimiento={m} compresores={compresores || []} />
      </div>
    </div>
  );
}
