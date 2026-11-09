import { createServiceClient } from "@/lib/supabase/service";
import MeInteresa from "@/components/estudiantes/MeInteresa";
import { TIENDA } from "@/lib/viajes/servidor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Información de cursos · Gus Dive Center" };

// Control Estudiantes -- el link "Me interesa" (para Instagram o la página
// web). Cae en Interesados como "Nuevo".
export default async function MeInteresaPage() {
  const s = createServiceClient();
  const { data } = await s.from("est_cursos").select("nombre").eq("activo", true).order("orden").order("nombre");
  return <MeInteresa cursos={(data || []).map((c) => c.nombre)} whatsapp={TIENDA.whatsapp} />;
}
