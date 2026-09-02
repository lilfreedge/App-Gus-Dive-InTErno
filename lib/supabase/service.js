import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con permisos elevados, solo para usarlo en el servidor (nunca en el navegador).
// Se usa en el reporte semanal automático, que corre sin que haya una sesión de usuario.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
