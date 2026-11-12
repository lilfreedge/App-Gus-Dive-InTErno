import { createServiceClient } from "@/lib/supabase/service";
import MeInteresa from "@/components/estudiantes/MeInteresa";
import { TIENDA } from "@/lib/viajes/servidor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registro de interesado · Gus Dive Center" };

// Control Estudiantes -- el link "Me interesa" (para Instagram o la página
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
  return <MeInteresa cursos={(data || []).map((c) => c.nombre)} whatsapp={TIENDA.whatsapp} />;
}
