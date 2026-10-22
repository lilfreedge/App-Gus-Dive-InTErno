import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { idsTanquesAfuera } from "@/lib/envios-hidrostatica";
import EnviarTanquesForm from "./form-client";

// V32 -- "Enviar tanques a PH": uno o varios tanques en un mismo envío
// (los que salen el mismo día). Sin "a dónde se envían" (pedido explícito:
// "descarta poner esto. lo enviamos a un sitio que trabaja de la mano con
// nosotros"). Permiso: hidrostatica_registrar.
export default async function EnviarTanquesPage() {
  const supabase = createClient();
  const { user, profile } = await requireInterno(supabase, "registrar_hidrostatica");
  if (!tieneAcceso(profile, "hidrostatica_registrar")) redirect("/equipos/pruebas-hidrostaticas");

  const [{ data: tanques }, afuera] = await Promise.all([
    supabase.from("tanques_alquiler").select("id, codigo, descripcion").eq("activo", true).order("codigo"),
    idsTanquesAfuera(supabase),
  ]);
  const idsAfuera = new Set(afuera);
  const disponibles = (tanques || []).filter((t) => !idsAfuera.has(t.id));

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/pruebas-hidrostaticas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Pruebas hidrostáticas", href: "/equipos/pruebas-hidrostaticas" },
            { label: "Enviar tanques a PH" },
          ]}
        />
        <h1 className="page-title">Enviar tanques a PH</h1>
        <EnviarTanquesForm
          userId={user.id}
          nombreUsuario={profile?.full_name || user.email}
          tanques={disponibles}
        />
      </div>
    </div>
  );
}
