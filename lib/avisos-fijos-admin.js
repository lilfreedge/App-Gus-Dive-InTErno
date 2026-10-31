// V51 -- Lo que necesita la pantalla de Administración › Avisos fijos.
export async function datosAdminAvisos(supabase, app) {
  const [{ data: avisos, error }, { data: perfilesTodos }] = await Promise.all([
    supabase.from("avisos_fijos").select("*").eq("app", app).order("creado_en", { ascending: false }),
    supabase.from("profiles").select("id, full_name, es_titular, is_admin, permisos, eliminado_en").order("full_name"),
  ]);
  const ids = (avisos || []).map((a) => a.id);
  const { data: leidos } = ids.length
    ? await supabase.from("avisos_fijos_leidos").select("*").in("aviso_id", ids)
    : { data: [] };
  return {
    falta: !!error, // sin migration_76.sql
    avisos: avisos || [],
    leidos: leidos || [],
    perfiles: (perfilesTodos || []).filter((p) => !p.eliminado_en),
  };
}
