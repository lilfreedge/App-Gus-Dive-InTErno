import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con permisos elevados, solo para usarlo en el servidor (nunca en el navegador).
// Se usa en el reporte semanal automático, que corre sin que haya una sesión de usuario.
// V104 (18-nov-2026, 97: "borré Freediving y Refresh OWD del catálogo y siguen
// saliendo en el link"): Next.js 14 guardaba la respuesta de estas consultas en
// su caché de datos (en Vercel dura aunque se vuelva a subir el app), aunque la
// página tenga `dynamic = "force-dynamic"`. Probado: el link de registro y el
// app Gus Dive enseñaban la lista de cursos vieja. Ahora cada consulta va
// directo a la base, siempre.
export const fetchSinCache = (url, opciones = {}) => fetch(url, { ...opciones, cache: "no-store" });

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false }, global: { fetch: fetchSinCache } }
  );
}
