import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { permisosViajes } from "@/lib/viajes/modelo";
import { tokenCalendario } from "@/lib/viajes/servidor";
import ViajesApp from "@/components/viajes/ViajesApp";

export const dynamic = "force-dynamic";

// V42 -- App Viajes/Buceos (antes era solo "Próximamente"). Todas las
// pantallas de /viajes-buceos/... las dibuja ViajesApp; aquí solo se revisa
// el acceso y se arman los permisos de quien entra.
export default async function ViajesLayout({ children }) {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);
  if (!profile) redirect("/login");
  if (!tieneAcceso(profile, "acceso_viajes")) redirect("/espacio?elegir=1");

  const p = permisosViajes(profile);
  const { data: perfiles } = await supabase.from("profiles").select("id, full_name, es_titular, permisos, eliminado_en").order("full_name");
  const personas = (perfiles || [])
    .filter((x) => !x.eliminado_en && (x.es_titular || x.permisos?.acceso_viajes))
    .map((x) => ({ id: x.id, nombre: (x.full_name || "").trim().split(/\s+/)[0] || "—" }));

  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  const calUrl = `${proto}://${host}/api/viajes/calendario?t=${tokenCalendario()}`;

  const nombre = profile.full_name || "";
  const yo = {
    id: user.id,
    nombre,
    corto: nombre.trim().split(/\s+/)[0] || "Yo",
    correo: user.email || "",
    esTitular: !!profile.es_titular,
    verChangelog: tieneAcceso(profile, "changelog"),
  };

  return (
    <ViajesApp p={p} yo={yo} personas={personas} calUrl={calUrl}>
      {children}
    </ViajesApp>
  );
}
