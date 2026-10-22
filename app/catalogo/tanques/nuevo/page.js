import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireInterno, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoTanqueForm from "./form-client";

// Agregar un tanque de alquiler al catálogo. Gateado por el permiso
// granular catalogo_tanque (el Titular siempre tiene acceso).
//
// V33 -- ?de=<id>: "Usar el código en otro tanque" (pedido explícito, maqueta
// V33 sección 6, "ok"). Cuando un tanque se rechazó en prueba hidrostática y
// su código se le va a poner a otro tanque físico, se crea un tanque NUEVO con
// ese código (el viejo se queda inactivo con su historial). Lo pueden hacer
// el Titular y los Administradores ("esto solo lo podré hacer yo y el
// administrador").
export default async function NuevoTanquePage({ searchParams }) {
  const supabase = createClient();
  const deId = typeof searchParams?.de === "string" ? searchParams.de : null;
  const { profile } = await requireInterno(supabase, deId ? ["catalogo", "catalogo_tanque"] : "catalogo_tanque");

  let anterior = null;
  if (deId) {
    if (!(profile?.es_titular || profile?.is_admin)) redirect("/catalogo/tanques");
    const { data } = await supabase
      .from("tanques_alquiler")
      .select("id, codigo, activo, motivo_inactivo")
      .eq("id", deId)
      .maybeSingle();
    if (!data || data.activo) redirect("/catalogo/tanques");
    anterior = data;
  } else if (!tieneAcceso(profile, "catalogo_tanque")) {
    redirect("/catalogo/tanques");
  }

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
            { label: anterior ? `Tanque nuevo con el código ${anterior.codigo}` : "Nuevo tanque" },
          ]}
        />
        <h1 className="page-title">{anterior ? `Tanque nuevo con el código ${anterior.codigo}` : "Nuevo tanque"}</h1>

        <NuevoTanqueForm anterior={anterior} />
      </div>
    </div>
  );
}
