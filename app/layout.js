import "./globals.css";

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
