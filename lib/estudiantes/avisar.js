import { permisosEst } from "./modelo";

// V54 -- La campanita de Control Estudiantes ("62. si": aviso cuando alguien
// se registra por el link, sube un comprobante o llega un interesado nuevo).
// Solo servidor (llave de servicio). Le llega a quien entra a Control
// Estudiantes y tiene el permiso de eso (el Titular y los administradores,
// siempre). Nunca hace fallar lo que hizo el estudiante: si algo falla (por
// ejemplo, si falta migration_79.sql), se anota en la consola del servidor.
//   permiso: "estudiantes" | "pagos" | "interesados" (ver PERMISOS_EST)
export async function avisarEquipoEst(s, { permiso, titulo, texto = "", url = "/control-estudiantes" }) {
  try {
    const { data: perfiles } = await s.from("profiles").select("id, es_titular, is_admin, permisos, eliminado_en, aprobado");
    const para = (perfiles || []).filter(
      (p) => !p.eliminado_en && p.aprobado !== false && (p.es_titular || p.is_admin || p.permisos?.acceso_estudiantes) && (!permiso || permisosEst(p)[permiso])
    );
    if (!para.length) return;
    const { error } = await s
      .from("notificaciones")
      .insert(para.map((p) => ({ user_id: p.id, app: "estudiantes", titulo, texto: String(texto).slice(0, 160), url })));
    if (error) console.error("[avisarEquipoEst]", error.message);
  } catch (e) {
    console.error("[avisarEquipoEst]", e?.message || e);
  }
}
