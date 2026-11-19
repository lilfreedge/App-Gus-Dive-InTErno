// V81 -- "App Gus" (maqueta V82): la app de los clientes, una sola para
// cursos, buceos e interesados. La instalan desde /gus, /estudiante,
// /me-interesa o el link de un buceo; siempre abre en /gus. El scope es "/"
// para que los links de cursos y buceos se abran adentro de la app; el "id"
// la separa de la app del personal (app/manifest.js, "Gus Dive").
// (El manifest viejo de "Mis Cursos", /estudiante-manifest.webmanifest, se
// deja como estaba; ya no lo usa ninguna página.)
// V83 (pedido explícito, con foto del ícono instalado: "quiero cambiar el
// nombre... digo, Gus Dive") -- el nombre debajo del ícono pasa de "App Gus"
// a "Gus Dive" (el mismo de la app del personal; el "id" las sigue separando).
const MANIFEST = {
  id: "/gus",
  name: "Gus Dive",
  short_name: "Gus Dive",
  description: "Tus cursos y buceos con Gus Dive Center",
  start_url: "/gus",
  scope: "/",
  display: "standalone",
  // V106 ("138. sí"): que los links de cursos, interesados y buceos se abran
  // dentro del app instalada cuando el celular lo permite (Android/Chrome).
  // En iPhone no cambia nada: Apple siempre los abre en Safari.
  handle_links: "preferred",
  launch_handler: { client_mode: ["navigate-existing", "auto"] },
  background_color: "#ffffff",
  theme_color: "#06324f",
  icons: [
    { src: "/icono-app-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icono-app-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icono-app-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return new Response(JSON.stringify(MANIFEST), { headers: { "Content-Type": "application/manifest+json" } });
}
