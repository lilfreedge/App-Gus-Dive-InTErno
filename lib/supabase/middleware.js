import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // El callback de confirmación de correo / recuperación de contraseña
  // (Supabase Auth) se maneja completamente en su propia ruta — nunca lo
  // bloqueamos ni lo rebotamos aquí, sin importar si hay sesión o no.
  if (path.startsWith("/auth/confirm")) {
    return supabaseResponse;
  }

  const isPublic =
    path === "/login" ||
    path === "/registro" ||
    path === "/login/recuperar";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/espacio";
    return NextResponse.redirect(url);
  }

  // Aprobación del Titular para cuentas nuevas (item 10, 1-oct-2026,
  // pedido explícito: "quiero que los usuarios nuevos sean confirmados
  // solo por mi, no que se confirmen ellos mismos por correo") -- un
  // perfil nuevo nace con aprobado=false (migration_48.sql) y no puede
  // entrar a NINGUNA pantalla (ni /espacio, ni /dashboard, ni App
  // Clientes) hasta que el Titular lo apruebe desde /espacio/aprobaciones.
  // Se revisa acá, en el middleware, para que quede bloqueado de verdad
  // en toda la app de una sola vez, en vez de tener que acordarse de
  // repetir el chequeo en cada página nueva que se agregue a futuro.
  // Si por algo la fila de profiles todavía no existe (carrera rarísima
  // justo tras el signUp, antes de que corra el trigger) se deja pasar
  // en vez de bloquear -- mismo criterio conservador que el resto de la
  // app usa para no trabar a nadie por un dato que todavía no llegó.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("aprobado, es_titular")
      .eq("id", user.id)
      .maybeSingle();

    const aprobado = !profile || profile.es_titular || profile.aprobado;

    if (!aprobado && path !== "/pendiente-aprobacion") {
      const url = request.nextUrl.clone();
      url.pathname = "/pendiente-aprobacion";
      return NextResponse.redirect(url);
    }
    if (aprobado && path === "/pendiente-aprobacion") {
      const url = request.nextUrl.clone();
      url.pathname = "/espacio";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
