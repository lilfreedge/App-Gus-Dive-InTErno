import "./globals.css";

// FUERZA que toda la app se renderice dinámicamente en cada request, sin
// cachear las respuestas de Supabase (fetch) entre despliegues. Sin esto,
// Next.js puede cachear las consultas hechas dentro de Server Components
// aunque la página se re-renderice por request (usar cookies() solo evita
// el caché de la RUTA/HTML, no el de cada fetch individual) -- causando
// que cambios reales en la base de datos (ej. es_titular, permisos,
// estadísticas del dashboard) no se reflejen en producción hasta que el
// caché expire por sí solo, algo que puede tardar indefinidamente en el
// caché de datos de Vercel, que persiste incluso entre despliegues nuevos.
// Agregado 2026-09-22 tras diagnosticar que el menú de Administración
// ("Más") no aparecía para el Titular pese a que el dato en Supabase era
// correcto, en cualquier despliegue/sesión/navegador probado.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gus Dive - Control Interno",
  description: "Control interno de piezas, uso de tienda y llenados de tanques",
};

// Aplica el modo oscuro y el tamaño de letra guardados en este dispositivo
// ANTES del primer paint, para que no haya un "flash" del tema claro al
// cargar la página. Son preferencias por dispositivo (localStorage), no se
// guardan en Supabase.
const INIT_APARIENCIA = `
(function () {
  try {
    var raiz = document.documentElement;
    var tema = localStorage.getItem("gus-tema");
    if (tema === "dark") raiz.setAttribute("data-theme", "dark");
    var letra = localStorage.getItem("gus-tamano-letra");
    if (letra) raiz.setAttribute("data-tamano-letra", letra);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: INIT_APARIENCIA }} />
        {children}
      </body>
    </html>
  );
}
