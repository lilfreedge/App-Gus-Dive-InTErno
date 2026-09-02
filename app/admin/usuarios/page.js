import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import ListaUsuarios from "./lista-client";

export default async function UsuariosPage() {
  const supabase = createClient();
  const { user } = await requireAdmin(supabase);

  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin")
    .order("full_name");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Administradores</h1>
        <p className="page-subtitle">
          Los administradores pueden ver reportes, editar/borrar registros y manejar
          el catálogo. Dale ese acceso solo a quien confíes.
        </p>

        <div className="card">
          <ListaUsuarios perfiles={perfiles || []} miId={user.id} />
        </div>
      </div>
    </div>
  );
}
