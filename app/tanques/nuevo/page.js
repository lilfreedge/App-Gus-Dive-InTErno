import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NuevoLlenadoForm from "./form-client";

export default async function NuevoLlenadoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <Link href="/dashboard" className="back-link">
        ← Volver
      </Link>
      <h1 className="page-title">Registrar llenado de tanque</h1>
      <p className="page-subtitle">Para llevar el conteo de llenados internos.</p>

      <NuevoLlenadoForm userId={user.id} />
    </div>
  );
}
