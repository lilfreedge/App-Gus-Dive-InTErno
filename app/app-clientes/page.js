import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import HeaderSimple from "@/components/HeaderSimple";
import { IconUsers } from "@/components/icons";

// Placeholder de "App Clientes" (ítem 7 del backlog, 22-sep-2026) -- el
// proyecto real para los buzos/clientes de Gus Dive todavía no tiene spec,
// se define más adelante. Por ahora solo existe el botón en /espacio que
// lleva hasta aquí, con un mensaje de "próximamente".
export default async function AppClientesPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const nombreCompleto = profile?.full_name || "";
  const nombre = nombreCompleto.split(" ")[0] || "";

  return (
    <div>
      <HeaderSimple nombre={nombre} etiqueta="App Clientes" />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/espacio" className="back-link">
          ← Cambiar de app
        </Link>

        <div className="card" style={{ textAlign: "center", padding: "40px 20px", marginTop: 16 }}>
          <div className="espacio-icon" style={{ margin: "0 auto 16px" }}>
            <IconUsers size={24} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--azul-texto)", marginBottom: 6 }}>
            App Clientes está en camino
          </div>
          <p style={{ fontSize: 13, color: "var(--texto-suave)", maxWidth: 360, margin: "0 auto" }}>
            Este va a ser el espacio para los buzos/clientes de Gus Dive. Todavía no tiene funciones -- vuelve más adelante.
          </p>
        </div>
      </div>
    </div>
  );
}
