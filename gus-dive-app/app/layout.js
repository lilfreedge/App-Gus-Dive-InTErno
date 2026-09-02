import "./globals.css";

export const metadata = {
  title: "Gus Dive - Control Interno",
  description: "Control interno de piezas, uso de tienda y llenados de tanques",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
