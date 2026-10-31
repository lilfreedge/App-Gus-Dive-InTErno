// V51 -- Los manuales (si falta migration_76.sql, lista vacía).
export async function cargarManuales(supabase) {
  try {
    const { data, error } = await supabase.from("manuales").select("*").order("marca").order("modelos");
    return error ? [] : data || [];
  } catch {
    return [];
  }
}
