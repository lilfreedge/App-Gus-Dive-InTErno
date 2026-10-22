import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import ConInfo from "@/components/ConInfo";
import { idsTanquesAfuera } from "@/lib/envios-hidrostatica";
import NuevaPruebaHidrostaticaForm from "./form-client";

// Registrar prueba(s) hidrostática(s) -- ver app/equipos/pruebas-hidrostaticas/page.js.
// V32: pasa a ser "Anotar una prueba ya hecha (sin envío)" -- para cargar
// pruebas de antes de usar el app (lo normal ahora es Enviar -> Registrar
// regreso). Permiso nuevo para registrar: hidrostatica_registrar. Cada
// prueba se guarda con registrar_prueba_hidrostatica() (migration_63):
// si sale aprobada anota también la inspección visual; si sale rechazada
// el tanque se inactiva solo.
export default async function NuevaPruebaHidrostaticaPage() {
  const supabase = createClient();
  await requireInterno(supabase, "registrar_hidrostatica");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "hidrostatica_registrar")) {
    redirect("/equipos/pruebas-hidrostaticas");
  }

  const [{ data: todos }, afuera] = await Promise.all([
    supabase.from("tanques_alquiler").select("id, codigo, descripcion").eq("activo", true).order("codigo"),
    idsTanquesAfuera(supabase),
  ]);
  const idsAfuera = new Set(afuera);
  const tanques = (todos || []).filter((t) => !idsAfuera.has(t.id));

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/pruebas-hidrostaticas" className="back-link">
          ← Regresar
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Pruebas hidrostáticas", href: "/equipos/pruebas-hidrostaticas" },
            { label: "Anotar prueba ya hecha" },
          ]}
        />
        <ConInfo
          style={{ marginBottom: 14 }}
          texto="Para anotar pruebas que ya se hicieron, de antes de usar el app. Lo normal es &quot;Enviar tanques a PH&quot; y, cuando vuelven, &quot;Registrar regreso&quot;. La próxima prueba (cada 5 años) se calcula sola. Si sale aprobada se anota también la inspección visual; si sale rechazada el tanque se inactiva solo."
        >
          <h1 className="page-title" style={{ margin: 0 }}>Anotar una prueba ya hecha</h1>
        </ConInfo>

        <NuevaPruebaHidrostaticaForm
          userId={user.id}
          nombreUsuario={profile?.full_name || user.email}
          tanques={tanques}
        />
      </div>
    </div>
  );
}
