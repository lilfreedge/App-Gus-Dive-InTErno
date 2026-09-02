import { redirect } from "next/navigation";

// Ruta vieja: el catálogo ahora vive en /catalogo (visible a todos los
// usuarios logueados, no solo administradores). Se deja este redirect
// para no romper enlaces/bookmarks viejos.
export default function ArticulosRedirectPage() {
  redirect("/catalogo");
}
