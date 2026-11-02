import { createServiceClient } from "@/lib/supabase/service";
import { filaACurso } from "@/lib/estudiantes/datos";
import { TIENDA } from "@/lib/viajes/servidor";
import { CUENTAS_CURSOS, TITULAR_CURSOS, RNC_CURSOS } from "@/lib/estudiantes/modelo";
import EstudiantePublico from "@/components/estudiantes/Publico";
import { fechasProximas } from "@/lib/estudiantes/fechas-servidor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registro de estudiante · Gus Dive Center" };

// Control Estudiantes -- el link de registro (público, sin cuenta). Solo se
// le manda al navegador la lista de cursos y cómo pagar.
export default async function EstudiantePage() {
  const s = createServiceClient();
  const { data } = await s.from("est_cursos").select("*").eq("activo", true).order("orden").order("nombre");
  const lista = (data || []).map(filaACurso);
  // V55: con sus fechas próximas y cuántos cupos quedan ("64", "71. B").
  const { conFechas, porCurso } = await fechasProximas(s, lista.map((c) => c.id));
  const cursos = lista.map((c) => ({ id: c.id, nombre: c.nombre, precio: c.precio, semana: c.semana, fechas: porCurso[c.id] || [] }));
  // V54: las cuentas de los cursos, no las de los buceos (nota 1-nov).
  return <EstudiantePublico cursos={cursos} conFechas={conFechas} tienda={{ whatsapp: TIENDA.whatsapp, titular: TITULAR_CURSOS || TIENDA.titular, rnc: RNC_CURSOS, cuentas: CUENTAS_CURSOS }} />;
}
