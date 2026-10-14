import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V31 — Eliminar una cuenta desde la app (pedido explícito: "para poder
// borrar cuentas directamente desde el app en vez de ir a supabase").
// Solo el Titular. Se borra la cuenta de acceso (no puede volver a entrar)
// y se CONSERVA todo lo que esa persona registró, con su nombre: su perfil
// queda marcado como eliminado (migration_62.sql).
export async function POST(request) {
  const supabaseSesion = createClient();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: yo } = await supabaseSesion.from("profiles").select("es_titular").eq("id", user.id).single();
  if (!yo?.es_titular) return NextResponse.json({ error: "Solo el Titular puede eliminar cuentas." }, { status: 403 });

  let id = "";
  try {
    ({ id } = await request.json());
  } catch {
    // cuerpo vacío o inválido
  }
  if (!id || typeof id !== "string") return NextResponse.json({ error: "Falta la cuenta a eliminar." }, { status: 400 });
  if (id === user.id) return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });

  const admin = createServiceClient();
  const { data: perfil } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (perfil?.es_titular) return NextResponse.json({ error: "La cuenta del Titular no se puede eliminar." }, { status: 400 });

  const { error: errAuth } = await admin.auth.admin.deleteUser(id);
  if (errAuth && !/not found/i.test(errAuth.message || "")) {
    const msg = /database error/i.test(errAuth.message || "")
      ? "Supabase no dejó borrarla porque tiene registros. Falta correr migration_62.sql en Supabase."
      : errAuth.message || "No se pudo eliminar la cuenta.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // El perfil sigue (si tenía registros) para que se vea su nombre en el
  // historial; queda sin accesos y fuera de las listas de usuarios.
  if (perfil) {
    await admin
      .from("profiles")
      .update({
        eliminado_en: new Date().toISOString(),
        aprobado: true, // no vuelve a salir en "Usuarios nuevos"
        is_admin: false,
        permisos: {},
        rol_interno_id: null,
        rol_clientes_id: null,
      })
      .eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
