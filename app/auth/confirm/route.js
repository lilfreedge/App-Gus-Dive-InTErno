import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Callback de confirmación de Supabase Auth (patrón oficial de
// @supabase/ssr para App Router): tanto el correo de "confirma tu
// cuenta" como el de "restablecer contraseña" deben apuntar aquí.
//
// IMPORTANTE (configuración externa, no solo código): para que los
// enlaces del correo lleguen a esta ruta con los parámetros correctos
// (token_hash y type), hay que editar los templates de correo en el
// dashboard de Supabase (Authentication → Email Templates) y cambiar el
// link de "Confirm signup" y "Reset Password" para que usen:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/espacio
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/login/actualizar-password
// (si el template de Supabase todavía dice "next=/dashboard" a mano, el
// valor de aquí abajo -- "/espacio" -- no se usa: gana lo que diga el
// template. Hay que actualizarlo ahí para que una cuenta nueva también
// caiga en la pantalla selectora en vez de ir directo a App Interno.)
// (por defecto Supabase usa {{ .ConfirmationURL }}, que apunta directo
// al redirectTo sin pasar por una ruta de la app — eso es lo que hoy
// hace que el enlace aterrice en una página que no existe). También hay
// que agregar la URL del sitio en Authentication → URL Configuration
// (Site URL y Redirect URLs), incluyendo el dominio real de producción.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") || "/espacio";

  if (token_hash && type) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "El enlace no es válido o ya venció. Pide uno nuevo."
    )}`
  );
}
