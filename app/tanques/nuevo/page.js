import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import NuevoLlenadoForm from "./form-client";

export default async function NuevoLlenadoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/tanques" className="back-link">
          ← Regresar
        </Link>
        <h1 className="page-title">Registrar llenados de tanque</h1>
        <p className="page-subtitle">Para llevar el conteo de llenados internos.</p>

        <NuevoLlenadoForm userId={user.id} nombreUsuario={perfil?.full_name || user.email} />
      </div>
    </div>
  );
}
