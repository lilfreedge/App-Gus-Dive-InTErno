// Trae TODAS las filas de una consulta, de a 1000 (el máximo por consulta
// de Supabase), para no cortar listas en silencio. `armar` recibe el query
// builder base y devuelve la consulta ya con select/filtros/orden.
export async function todasLasFilas(supabase, tabla, armar) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await armar(supabase.from(tabla)).range(desde, desde + 999);
    if (error || !data) break;
    filas.push(...data);
    if (data.length < 1000) break;
  }
  return filas;
}
