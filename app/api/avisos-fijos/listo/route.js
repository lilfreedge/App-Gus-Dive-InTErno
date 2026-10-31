import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { avisarLeido } from "@/lib/avisos-fijos-avisar";

// V51 -- "Listo" en un aviso fijo: lo marca como leído (para esa vez) y le
// avisa al que lo creó por celular y correo.
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Tienes que entrar al app." }, { status: 401 });

  const { avisoId, vez } = await request.json().catch(() => ({}));
  if (!avisoId || !/^\d{4}-\d{2}-\d{2}$/.test(String(vez || ""))) {
    return NextResponse.json({ ok: false, error: "Falta el aviso." }, { status: 400 });
  }

  const { data: perfil } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const nombre = perfil?.full_name || user.email || "";
  const { error } = await supabase
    .from("avisos_fijos_leidos")
    .insert({ aviso_id: avisoId, user_id: user.id, ocurrencia: vez, nombre });
  if (error && error.code !== "23505") {
    return NextResponse.json({ ok: false, error: "No se pudo marcar. Intenta de nuevo." }, { status: 500 });
  }
  // Solo la primera vez que lo marca (si toca dos veces, no le llega dos veces).
  if (!error) {
    try {
      await avisarLeido(createServiceClient(), { avisoId, vez, quienId: user.id, quien: nombre, origen: new URL(request.url).origin });
    } catch (e) {
      console.error("Avisos fijos (Listo):", e);
    }
  }
  return NextResponse.json({ ok: true });
}
