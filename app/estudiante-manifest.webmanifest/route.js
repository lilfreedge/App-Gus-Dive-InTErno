// V76 (pedido explícito: "quiero poder crear algo que el cliente pueda
// acceder... ver su progreso en su curso, su historial, su foto", y
// después "vamos con la opcion 2") -- que el link /estudiante se pueda
// "instalar" como una app aparte (ícono y nombre propios), sin mandar al
// estudiante para el selector de apps del personal (/espacio).
//
// Next 14 solo genera el manifest.js de la raíz del proyecto como ruta
// especial (no uno por carpeta como sí pasa con icon.png), así que este
// es un manifest aparte servido a mano; app/estudiante/page.js lo conecta
// con metadata.manifest.
const MANIFEST = {
  name: "Mis Cursos · Gus Dive Center",
  short_name: "Mis Cursos",
  description: "Tus datos, tus cursos, tu progreso, tu pago y tu foto",
  start_url: "/estudiante",
  scope: "/estudiante",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#f6ce46",
  icons: [
    { src: "/icono-app-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icono-app-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icono-app-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return new Response(JSON.stringify(MANIFEST), { headers: { "Content-Type": "application/manifest+json" } });
}
