import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import HeaderSimple from "@/components/HeaderSimple";
import { IconArrowLeft } from "@/components/icons";

// V37 -- "Alquiler" (pedido explícito, 23-oct-2026: "debajo de app interno.
// vamos a crear un app de alquiler. todavía no alimentaremos nada, ponlo
// coming soon"). Igual que Viajes/Buceos: solo un "Próximamente", y solo
// con el acceso a Alquiler (Accesos a apps; migration_70.sql).
export default async function AlquilerPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
    if (!profile) redirect("/login");
  if (!tieneAcceso(profile, "acceso_alquiler")) redirect("/espacio?elegir=1");
  const nombreCompleto = profile?.full_name || "";
  const nombre = nombreCompleto.split(" ")[0] || "";

  let pendientesAprobacion = 0;
  if (profile?.es_titular) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("aprobado", false);
    pendientesAprobacion = count || 0;
  }

  return (
    <div>
      <HeaderSimple
        nombre={nombre}
        etiqueta="Alquiler"
        esTitular={!!profile?.es_titular}
        pendientesAprobacion={pendientesAprobacion}
      />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/espacio?elegir=1" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Alquiler</h1>

        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>🤿🚧</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 18 }}>
            Estamos preparando esta app
          </div>
          <div style={{ fontSize: 13.5, color: "var(--texto-suave)", marginTop: 8, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
            Todavía no hay nada que ver por acá -- vuelve más adelante.
          </div>
          <div className="espacio-badge" style={{ marginTop: 16 }}>
            Próximamente
          </div>
        </div>

        <Link href="/espacio?elegir=1" className="btn secondary" style={{ display: "inline-flex", width: "auto", padding: "10px 16px", marginTop: 4 }}>
          <IconArrowLeft size={16} /> Volver a tus apps
        </Link>
      </div>
    </div>
  );
}
