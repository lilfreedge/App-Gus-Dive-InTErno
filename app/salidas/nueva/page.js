import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import NuevaSalidaForm from "./form-client";

export default async function NuevaSalidaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: articulos }, { data: perfil }] = await Promise.all([
    supabase.from("articulos").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/salidas" className="back-link">
          ← Regresar
        </Link>
        <h1 className="page-title">Registrar salida</h1>
        <p className="page-subtitle">
          Pieza, ring o artículo que se saca para uso interno de la tienda.
        </p>

        <NuevaSalidaForm
          userId={user.id}
          nombreUsuario={perfil?.full_name || user.email}
          articulos={articulos || []}
        />
      </div>
    </div>
  );
}
