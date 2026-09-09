import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NuevoCodigoForm from "./form-client";

// Pantalla dedicada para agregar un código al catálogo (V4: antes era un
// formulario inline arriba de la lista). Igual que editar/inactivar, solo
// Titular y Administrador pueden entrar aquí.
export default async function NuevoCodigoPage() {
  const supabase = createClient();
  await requireAdmin(supabase);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/catalogo" className="back-link">
          ← Regresar
        </Link>
        <h1 className="page-title">Nuevo código</h1>

        <NuevoCodigoForm />
      </div>
    </div>
  );
}
