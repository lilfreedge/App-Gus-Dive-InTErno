import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// V51 -- Abre un manual: el enlace que se pegó, o el PDF de la carpeta
// privada "manuales" (con un enlace que vence en 1 hora).
export async function GET(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: m } = await supabase.from("manuales").select("url, archivo_path").eq("id", params.id).maybeSingle();
  if (!m) return new NextResponse("Ese manual ya no está.", { status: 404 });
  if (m.url) return NextResponse.redirect(m.url);
  if (m.archivo_path) {
    const { data, error } = await supabase.storage.from("manuales").createSignedUrl(m.archivo_path, 60 * 60);
    if (!error && data?.signedUrl) return NextResponse.redirect(data.signedUrl);
  }
  return new NextResponse("No se pudo abrir el manual.", { status: 500 });
}
