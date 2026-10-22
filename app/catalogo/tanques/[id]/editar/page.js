import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireInterno, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import EditarTanqueForm from "./form-client";

// Editar un tanque de alquiler del catálogo. Gateado por el permiso
// granular catalogo_tanque (el Titular siempre tiene acceso).
//
// V33 -- ?reactivar=1: "Reactivar este mismo tanque" para un tanque que se
// inactivó por rechazo en prueba hidrostática (pedido explícito: "debería de
// pedir para modificar los datos"; maqueta V33 sección 6). Pide revisar los
// datos y al guardar lo reactiva. Solo Titular y Administradores.
export default async function EditarTanquePage({ params, searchParams }) {
  const supabase = createClient();
  const reactivar = searchParams?.reactivar === "1";
  const { profile } = await requireInterno(supabase, reactivar ? ["catalogo", "catalogo_tanque"] : "catalogo_tanque");
  if (reactivar ? !(profile?.es_titular || profile?.is_admin) : !tieneAcceso(profile, "catalogo_tanque")) {
    redirect("/catalogo/tanques");
  }

  const { data: tanque } = await supabase
    .from("tanques_alquiler")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!tanque) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/catalogo/tanques" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Base de datos", href: "/catalogo" },
            { label: "Tanques de alquiler", href: "/catalogo/tanques" },
            { label: reactivar && !tanque.activo ? "Reactivar tanque" : "Editar tanque" },
          ]}
        />
        <h1 className="page-title">{reactivar && !tanque.activo ? `Reactivar ${tanque.codigo}` : "Editar tanque"}</h1>

        <EditarTanqueForm tanque={tanque} reactivar={reactivar && !tanque.activo} />
      </div>
    </div>
  );
}
