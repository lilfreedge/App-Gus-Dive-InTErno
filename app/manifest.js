// V44 -- Para poder agregar el app a la pantalla de inicio del celular
// (en iPhone hace falta para que lleguen las notificaciones de Viajes).
export default function manifest() {
  return {
    name: "Gus Dive",
    short_name: "Gus Dive",
    description: "App interno de Gus Dive Center",
    start_url: "/espacio",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icono-app-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-app-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-app-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
