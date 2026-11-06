// V61 (nota del 2-nov: "si un tanque o regulador está alquilado, que en App
// Interno aparezca 'alquilado', tipo un label en el artículo"): los códigos
// que están afuera ahora mismo (migration_87, función equipos_alquilados).
// Sin el SQL todavía, devuelve {} y no sale nada.
export async function codigosAlquilados(supabase) {
  const { data, error } = await supabase.rpc("equipos_alquilados");
  if (error || !data) return {};
  const m = {};
  for (const r of data) m[String(r.codigo || "").toUpperCase()] = { numero: r.numero, devolver: r.devolver };
  return m;
}

export function textoAlquilado(info) {
  if (!info) return "";
  const [a, mm, d] = String(info.devolver || "").split("-");
  return `Alquilado${info.numero ? ` (No. ${info.numero})` : ""}${d ? ` · devuelve el ${Number(d)}/${Number(mm)}/${a}` : ""}`;
}
