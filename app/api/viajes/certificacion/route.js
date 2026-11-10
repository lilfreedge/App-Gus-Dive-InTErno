import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V64 ("281"): la imagen de la certificación que el buzo subió por el link.
// Vive en el almacenamiento de los estudiantes; aquí se abre para quien
// entra a Buceos (o a Control Estudiantes), con un permiso de 10 minutos.
export async function GET(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entra de nuevo." }, { status: 401 });
  const { data: yo } = await supabase.from("profiles").select("es_titular, is_admin, permisos").eq("id", user.id).maybeSingle();
  if (!yo?.es_titular && !yo?.is_admin && !yo?.permisos?.acceso_viajes && !yo?.permisos?.acceso_estudiantes) return NextResponse.json({ error: "No tienes acceso." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("buzo") || "";
  const s = createServiceClient();
  const { data: b } = await s.from("viajes_buzos").select("cert_foto").eq("id", id).maybeSingle();
  if (!b?.cert_foto) return NextResponse.json({ error: "No ha subido su certificación." }, { status: 404 });
  const { data, error } = await s.storage.from("estudiantes-docs").createSignedUrl(b.cert_foto, 600);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "No se pudo abrir." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, pdf: /\.pdf$/i.test(b.cert_foto) });
}
