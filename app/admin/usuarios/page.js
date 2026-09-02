import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import ListaUsuarios from "./lista-client";

// Administración: solo el Titular puede entrar (ni siquiera los
// administradores comunes). No está en el nav de arriba, solo en el
// menú de ajustes (ver TopbarClient).
export default async function UsuariosPage() {
  const supabase = createClient();
  const { user } = await requireTitular(supabase);

  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin, es_titular, permisos")
    .order("full_name");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Administración</h1>

        <div className="card">
          <ListaUsuarios perfiles={perfiles || []} miId={user.id} />
        </div>
      </div>
    </div>
  );
}
