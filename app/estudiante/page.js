import { createServiceClient } from "@/lib/supabase/service";
import { filaACurso } from "@/lib/estudiantes/datos";
import { TIENDA } from "@/lib/viajes/servidor";
import { CUENTAS_CURSOS, TITULAR_CURSOS, RNC_CURSOS } from "@/lib/estudiantes/modelo";
import EstudiantePublico from "@/components/estudiantes/Publico";
import { fechasProximas } from "@/lib/estudiantes/fechas-servidor";

export const dynamic = "force-dynamic";
// V76 (pedido explícito: "vamos con la opcion 2" -- que este link se
// pueda "instalar" como una app aparte). El título cambió para que, al
// agregarlo a la pantalla de inicio, el nombre tenga sentido tanto para
// quien se está registrando como para quien ya está registrado y solo
// vuelve a ver "Mis documentos".
export const metadata = { title: "Mis Cursos · Gus Dive Center", manifest: "/estudiante-manifest.webmanifest" };

// Control Estudiantes -- el link de registro (público, sin cuenta). Solo se
// le manda al navegador la lista de cursos y cómo pagar.
export default async function EstudiantePage({ searchParams }) {
  const s = createServiceClient();
  const { data } = await s.from("est_cursos").select("*").eq("activo", true).order("orden").order("nombre");
  const lista = (data || []).map((r) => ({ ...filaACurso(r), grupo: r.grupo || null, info: r.info || null, en_link: r.en_link }));
  // V55: con sus fechas próximas y cuántos cupos quedan ("64", "71. B").
  const { conFechas, porCurso } = await fechasProximas(s, lista.map((c) => c.id));
  // V65 ("286"): por grupos, con la información (la "i"); los que no salen en el link, fuera.
  const cursos = lista.filter((c) => c.en_link !== false).map((c) => ({ id: c.id, nombre: c.nombre, precio: c.precio, semana: c.semana, grupo: c.grupo || null, info: c.info || null, fechas: porCurso[c.id] || [] }));
  // V54: las cuentas de los cursos, no las de los buceos (nota 1-nov).
  // V66 ("313. ok", maqueta V66): el link de cada curso (?curso=<fecha>) no
  // pide escoger curso. Si esa fecha ya no está abierta, el link sigue normal.
  const pedida = typeof searchParams?.curso === "string" ? searchParams.curso : "";
  const fijo = conFechas && pedida && cursos.some((c) => c.fechas.some((f) => f.id === pedida)) ? pedida : "";
  return <EstudiantePublico cursos={cursos} conFechas={conFechas} fijo={fijo} noAbierto={!!pedida && !fijo} tienda={{ whatsapp: TIENDA.whatsapp, titular: TITULAR_CURSOS || TIENDA.titular, rnc: RNC_CURSOS, cuentas: CUENTAS_CURSOS }} />;
}
