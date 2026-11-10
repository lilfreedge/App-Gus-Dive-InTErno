import { redirect } from "next/navigation";
import { requireInterno } from "@/lib/roles";

// V37 -- Recordatorios: solo el Titular y los administradores los crean,
// cambian y borran (migration_70.sql también lo exige).
// V63 ("230"): la sección es de Equipos (no solo de compresores).
export async function requireAdminRecordatorios(supabase) {
  const { user, profile } = await requireInterno(supabase);
  if (!profile?.es_titular && !profile?.is_admin) redirect("/equipos/recordatorios");
  return { user, profile };
}

// Compresores y personas para el formulario.
export async function datosFormulario(supabase) {
  const [{ data: compresores }, { data: perfiles }] = await Promise.all([
    supabase.from("compresores").select("id, codigo, descripcion, activo").order("codigo"),
    supabase.from("profiles").select("id, full_name, es_titular, is_admin, permisos, aprobado, eliminado_en, telefono").order("full_name"),
  ]);
  const usuarios = (perfiles || [])
    .filter((p) => !p.eliminado_en && p.aprobado !== false)
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      veCompresores: !!p.es_titular || !!p.permisos?.compresores,
      // V63: para "Mandarle por WhatsApp".
      telefono: p.telefono || "",
    }));
  return { compresores: compresores || [], usuarios };
}
