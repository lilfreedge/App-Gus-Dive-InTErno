import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import PreferenciasApariencia from "@/components/PreferenciasApariencia";
import PersonalizarMenu from "@/components/PersonalizarMenu";
import MiActividad from "@/components/MiActividad";
import PerfilForm from "./form-client";

export default async function PerfilPage() {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);

  // Mi actividad: solo lo que este usuario ha registrado (auth.uid()), no
  // el listado completo de Salidas/Tanques.
  const [{ data: misSalidas }, { data: misLlenados }] = await Promise.all([
    supabase
      .from("salidas")
      .select("id, folio, articulo, motivo, cantidad, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("llenados_tanques")
      .select("id, folio, tipo_gas, cantidad, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const actividad = [
    ...(misSalidas || []).map((s) => ({ ...s, tipo: "salida" })),
    ...(misLlenados || []).map((l) => ({ ...l, tipo: "llenado" })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Mi Perfil" }]} />

        <div className="section-title" style={{ marginTop: 0 }}>
          Mi actividad
        </div>
        <p className="hint-text" style={{ marginTop: 0, marginBottom: 10 }}>
          Tus propias salidas y llenados registrados, sin tener que buscarlos en Salidas/Tanques.
        </p>
        <MiActividad actividad={actividad} />

        <PerfilForm userId={user.id} nombreActual={profile?.full_name || ""} correo={user.email} />

        <div style={{ marginTop: 26 }}>
          <PreferenciasApariencia />
        </div>

        <div className="section-title" style={{ marginTop: 26 }}>
          Personalizar mi menú
        </div>
        <PersonalizarMenu
          menuInicial={profile?.menu_personalizado}
          puedeCompresores={tieneAcceso(profile, "compresores")}
        />
      </div>
    </div>
  );
}
