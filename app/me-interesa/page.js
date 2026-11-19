import { createServiceClient } from "@/lib/supabase/service";
import MeInteresa from "@/components/estudiantes/MeInteresa";
import { metaClientes, APP_CLIENTES } from "@/lib/metadata-clientes";

export const dynamic = "force-dynamic";
// V81: se instala como "App Gus".
export const metadata = metaClientes("Registro de interesado · Gus Dive Center", "Déjanos tus datos y te avisamos cuando haya un curso.", APP_CLIENTES);

// Control Estudiantes -- el link de interesados (para Instagram o la página
// web). Cae en Interesados como "Nuevo".
// V84: desde el app Gus Dive ("Avísame cuando haya fecha") llega con
// ?curso=<nombre> y ese curso sale ya escogido.
export default async function MeInteresaPage({ searchParams }) {
  const s = createServiceClient();
  // V74 (pedido explícito, con foto: "Borre OWD + nitrox y aun sigue
  // apareciendo en el form de interesados") -- faltaba este filtro. "OWD +
  // Nitrox" y "BLS + OXY" no están borrados: desde la V65 (migration_93)
  // tienen en_link=false para que no salgan en el link del estudiante
  // (app/estudiante/page.js ya lo respeta); a este link ("Me interesa") se
  // le había quedado pendiente el mismo filtro.
  const { data } = await s.from("est_cursos").select("nombre, info").eq("activo", true).neq("en_link", false).order("orden").order("nombre");
  const cursos = (data || []).map((c) => c.nombre);
  // V105 (con foto: "aún no se ve lo que te pedí de la descripción aquí"): la
  // descripción corta de cada curso (Catálogo › Editar curso) junto al nombre.
  const niveles = Object.fromEntries((data || []).map((c) => [c.nombre, String(c.info?.nivel || "").trim()]).filter(([, n]) => n));
  const pedido = String(searchParams?.curso || "");
  return <MeInteresa cursos={cursos} niveles={niveles} cursoInicial={cursos.includes(pedido) ? pedido : null} />;
}
