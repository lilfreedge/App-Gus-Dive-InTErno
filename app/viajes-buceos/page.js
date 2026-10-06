import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import HeaderSimple from "@/components/HeaderSimple";
import { IconArrowLeft } from "@/components/icons";

// "Viajes/Buceos" (6-oct-2026, pedido explícito: "quiero agregar un boton
// para hacer un app nuevo mas adelante... Se llamará 'Viajes/Buceos'") --
// por ahora es solo un placeholder "Próximamente", mismo patrón que tuvo
// "App Equipos de clientes" antes de construirse de verdad (ver comentario
// en app/espacio/page.js). Pedido explícito sobre esta pantalla: "quiero
// ponerle alguna imagen funny como de buzos en construccion".
export default async function ViajesBuceosPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
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
        etiqueta="Viajes/Buceos"
        esTitular={!!profile?.es_titular}
        pendientesAprobacion={pendientesAprobacion}
      />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/espacio" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Viajes/Buceos</h1>

        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>🤿🚧🫧</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 18 }}>
            Nuestros buzos están construyendo esta app
          </div>
          <div style={{ fontSize: 13.5, color: "var(--texto-suave)", marginTop: 8, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
            Todavía no hay nada que ver por acá -- vuelve más adelante.
          </div>
          <div className="espacio-badge" style={{ marginTop: 16 }}>
            Próximamente
          </div>
        </div>

        <Link href="/espacio" className="btn secondary" style={{ display: "inline-flex", width: "auto", padding: "10px 16px", marginTop: 4 }}>
          <IconArrowLeft size={16} /> Volver a tus apps
        </Link>
      </div>
    </div>
  );
}
