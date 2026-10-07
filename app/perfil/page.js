import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import PreferenciasApariencia from "@/components/PreferenciasApariencia";
import PersonalizarMenu from "@/components/PersonalizarMenu";
import { atajosPermitidos } from "@/lib/nav";
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

        <PerfilForm userId={user.id} nombreActual={profile?.full_name || ""} correo={user.email} />

        <div style={{ marginTop: 16 }}>
          <MiActividad actividad={actividad} />
        </div>

        <div style={{ marginTop: 26 }}>
          <PreferenciasApariencia />
        </div>

        {/* "Personalizar mi menú", de vuelta (6-oct-2026, V29, pedido
            explícito: "no se ven los shortcut para uno poder quitarlo o
            ponerlo del menu principal... quiero que lo pongas como estaba
            antes") -- se había quitado el 29-sep (v47). Mismo formato que
            en Mi Perfil de App Equipos de clientes. Si la persona no tiene
            ningún atajo permitido, la sección no se muestra. */}
        {atajosPermitidos({ esTitular: !!profile?.es_titular, permisos: profile?.permisos }).length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 26 }}>
              Personalizar mi menú
            </div>
            <div className="card">
              <PersonalizarMenu
                menuInicial={profile?.menu_personalizado}
                esTitular={!!profile?.es_titular}
                permisos={profile?.permisos || {}}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
