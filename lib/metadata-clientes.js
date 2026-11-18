// V101 (con foto del link del app Gus Dive mandado por WhatsApp: "no debe
// de salir eso de control interno de piezas... el cliente no debe de ver
// eso"): lo que sale en la vista previa del link (WhatsApp, Instagram,
// mensajes) en las páginas de los clientes. Sin esto heredaban la
// descripción del app del personal (app/layout.js).
export const APP_CLIENTES = {
  manifest: "/app-gus.webmanifest",
  icons: { apple: "/icono-app-192.png" },
  appleWebApp: { capable: true, title: "Gus Dive", statusBarStyle: "default" },
};

export function metaClientes(titulo, descripcion, extra = {}) {
  return {
    title: titulo,
    description: descripcion,
    openGraph: { title: titulo, description: descripcion, siteName: "Gus Dive Center", type: "website", locale: "es_DO" },
    twitter: { card: "summary", title: titulo, description: descripcion },
    ...extra,
  };
}
