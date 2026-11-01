import { createServiceClient } from "@/lib/supabase/service";
import { filaACurso } from "@/lib/estudiantes/datos";
import { TIENDA } from "@/lib/viajes/servidor";
import { CUENTAS_CURSOS, TITULAR_CURSOS, RNC_CURSOS } from "@/lib/estudiantes/modelo";
import EstudiantePublico from "@/components/estudiantes/Publico";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registro de estudiante · Gus Dive Center" };

// Control Estudiantes -- el link de registro (público, sin cuenta). Solo se
// le manda al navegador la lista de cursos y cómo pagar.
export default async function EstudiantePage() {
  const s = createServiceClient();
  const { data } = await s.from("est_cursos").select("*").eq("activo", true).order("orden").order("nombre");
  const cursos = (data || []).map(filaACurso).map((c) => ({ id: c.id, nombre: c.nombre, precio: c.precio }));
  // V54: las cuentas de los cursos, no las de los buceos (nota 1-nov).
  return <EstudiantePublico cursos={cursos} tienda={{ whatsapp: TIENDA.whatsapp, titular: TITULAR_CURSOS || TIENDA.titular, rnc: RNC_CURSOS, cuentas: CUENTAS_CURSOS }} />;
}
