import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// V104: cada consulta va directo a la base (sin la caché de datos de Next.js;
// ver lib/supabase/service.js).
const fetchSinCache = (url, opciones = {}) => fetch(url, { ...opciones, cache: "no-store" });

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { fetch: fetchSinCache },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se puede ignorar si se llama desde un Server Component.
            // El middleware se encarga de refrescar la sesión.
          }
        },
      },
    }
  );
}
