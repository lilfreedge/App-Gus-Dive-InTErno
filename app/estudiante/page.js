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
// V79 (recordatorio: "que la gente lo pueda tener en su cel"): en iPhone,
// al "Agregar a pantalla de inicio" sale con su ícono y su nombre.
export const metadata = {
  title: "Mis Cursos · Gus Dive Center",
  // V81: se instala como "App Gus" (una sola app para los clientes, maqueta V82).
  manifest: "/app-gus.webmanifest",
  icons: { apple: "/icono-app-192.png" },
  appleWebApp: { capable: true, title: "Gus Dive", statusBarStyle: "default" },
};

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
  // V87 (16-nov, con foto: el link que la tienda mandó por correo a un
  // interesado abrió "Tus datos" en blanco): algunos correos entregan el link
  // con "&amp;" en vez de "&", y entonces la marca llega como "amp;i" y se
  // perdía. Se aceptan las dos formas.
  const param = (k) => {
    const v = searchParams?.[k] ?? searchParams?.[`amp;${k}`];
    return typeof v === "string" ? v : "";
  };
  const pedida = param("curso");
  const fijo = conFechas && pedida && cursos.some((c) => c.fechas.some((f) => f.id === pedida)) ? pedida : "";
  // V79: la marca del interesado al que se le mandó este link (?i=<id>).
  const marcaInteresado = param("i");
  // V87 (16-nov: él probó su link -- en la computadora "Tus datos" salía
  // lleno, pero en un celular salió en blanco): los datos del interesado ya
  // no dependen de un pedido aparte que hace la página al abrir (si ese
  // pedido fallaba o tardaba, el formulario salía vacío). Ahora vienen
  // puestos desde el servidor con la página misma.
  let preInicial = null;
  if (/^[0-9a-f-]{20,40}$/i.test(marcaInteresado)) {
    try {
      const { data: x } = await s.from("est_interesados").select("*").eq("id", marcaInteresado).maybeSingle();
      if (x) preInicial = { nombre: x.nombre || "", cel: x.celular || "", correo: x.correo || "", curso: x.curso || "" };
    } catch {}
  }
  // V81: desde App Gus ("Ver mis documentos"), entra directo a Mis documentos.
  const mis = searchParams?.mis === "1";
  return <EstudiantePublico cursos={cursos} conFechas={conFechas} fijo={fijo} noAbierto={!!pedida && !fijo} marcaInteresado={marcaInteresado} preInicial={preInicial} mis={mis} tienda={{ whatsapp: TIENDA.whatsapp, titular: TITULAR_CURSOS || TIENDA.titular, rnc: RNC_CURSOS, cuentas: CUENTAS_CURSOS }} />;
}
