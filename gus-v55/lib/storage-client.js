// Primera vez que la app usa Supabase Storage (compresores, migración 14).
// Bucket público "compresores" -- se sube el archivo y se devuelve la URL
// pública directa (el bucket es público, no hace falta firmar la URL).
//
// `bucket` es opcional (default "compresores", para no tocar las
// llamadas ya existentes) -- App Equipos Clientes (migración 16) usa su
// propio bucket "equipos-clientes".
export async function subirFoto(supabase, file, carpeta, bucket = "compresores") {
  if (!file) return null;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const nombreArchivo = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(nombreArchivo, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(nombreArchivo);
  return data.publicUrl;
}
