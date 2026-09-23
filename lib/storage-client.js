// Primera vez que la app usa Supabase Storage (compresores, migración 14).
// Bucket público "compresores" -- se sube el archivo y se devuelve la URL
// pública directa (el bucket es público, no hace falta firmar la URL).
export async function subirFoto(supabase, file, carpeta) {
  if (!file) return null;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const nombreArchivo = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("compresores").upload(nombreArchivo, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from("compresores").getPublicUrl(nombreArchivo);
  return data.publicUrl;
}
