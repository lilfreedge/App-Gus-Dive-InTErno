import { redirect } from "next/navigation";

// Consolidado dentro de /app-clientes/administracion/historial (item 31,
// 27-sep-2026) -- esta ruta se deja como redirect por si algo la tenía
// guardada como enlace directo, en vez de borrarla sin más.
export default function HistorialEquiposRedirectPage() {
  redirect("/app-clientes/administracion/historial");
}
