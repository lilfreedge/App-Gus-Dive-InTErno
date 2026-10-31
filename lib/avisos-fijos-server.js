import { avisosQueSalen } from "./avisos-fijos";
import { hoyISO } from "./fechas";

// V51 -- Los avisos fijos que le salen hoy a esta persona en el Inicio de
// `apps` (["interno"], ["clientes"] o las dos para el técnico). Si las
// tablas todavía no existen (falta migration_76.sql), no sale nada.
export async function avisosParaMi(supabase, { apps, persona }) {
  if (!persona?.id) return [];
  try {
    const [{ data: avisos, error }, { data: leidos }] = await Promise.all([
      supabase.from("avisos_fijos").select("*").in("app", apps).eq("activo", true),
      supabase.from("avisos_fijos_leidos").select("aviso_id, ocurrencia").eq("user_id", persona.id),
    ]);
    if (error) return [];
    const tecnico = !persona.es_titular && !persona.is_admin && !!persona.permisos?.rol_tecnico;
    return avisosQueSalen(avisos, { hoy: hoyISO(), yoId: persona.id, tecnico, leidos: leidos || [] });
  } catch {
    return [];
  }
}
