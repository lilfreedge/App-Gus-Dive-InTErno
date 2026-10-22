// V34 -- Asignar órdenes (maqueta-v34.html, parte B; aprobado). Los
// técnicos son las personas con un rol de App Equipos de clientes cuya
// "Pantalla de inicio" es "Mis órdenes asignadas" (la base de datos les
// marca permisos.rol_tecnico, migration_66.sql). Al asignar se muestra
// cuántas órdenes abiertas tiene cada uno.
export async function tecnicosConCarga(supabase) {
  const [{ data: perfiles }, { data: abiertas }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("permisos->>rol_tecnico", "true")
      .is("eliminado_en", null)
      .order("full_name"),
    supabase
      .from("ordenes_equipos")
      .select("tecnico_asignado_id")
      .neq("estado", "Entregado")
      .not("tecnico_asignado_id", "is", null),
  ]);
  const cuenta = {};
  for (const o of abiertas || []) cuenta[o.tecnico_asignado_id] = (cuenta[o.tecnico_asignado_id] || 0) + 1;
  return (perfiles || []).map((p) => ({ id: p.id, full_name: p.full_name || "Sin nombre", abiertas: cuenta[p.id] || 0 }));
}

// Nombre corto para las listas ("Dany Acosta" -> "Dany").
export function nombreCorto(nombre) {
  return (nombre || "").trim().split(/\s+/)[0] || "—";
}
