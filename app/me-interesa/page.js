import { createServiceClient } from "@/lib/supabase/service";
import MeInteresa from "@/components/estudiantes/MeInteresa";

export const dynamic = "force-dynamic";
// V81: se instala como "App Gus".
export const metadata = { title: "Registro de interesado · Gus Dive Center", manifest: "/app-gus.webmanifest", icons: { apple: "/icono-app-192.png" }, appleWebApp: { capable: true, title: "App Gus", statusBarStyle: "default" } };

// Control Estudiantes -- el link de interesados (para Instagram o la página
// web). Cae en Interesados como "Nuevo".
export default async function MeInteresaPage() {
  const s = createServiceClient();
  // V74 (pedido explícito, con foto: "Borre OWD + nitrox y aun sigue
  // apareciendo en el form de interesados") -- faltaba este filtro. "OWD +
  // Nitrox" y "BLS + OXY" no están borrados: desde la V65 (migration_93)
  // tienen en_link=false para que no salgan en el link del estudiante
  // (app/estudiante/page.js ya lo respeta); a este link ("Me interesa") se
  // le había quedado pendiente el mismo filtro.
  const { data } = await s.from("est_cursos").select("nombre").eq("activo", true).neq("en_link", false).order("orden").order("nombre");
  return <MeInteresa cursos={(data || []).map((c) => c.nombre)} />;
}
