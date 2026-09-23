import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import { IconEdit } from "@/components/icons";

// Mi Perfil de App Clientes (23-sep-2026, pedido explícito): antes "Mi
// Perfil" en el menú de ajustes llevaba al de App Interno (/perfil) --
// ahora es una pantalla propia, independiente. Todavía no tiene
// contenido definido (el usuario dijo "luego te ire diciendo que vamos
// a poner ahi") -- por ahora solo el nombre, mismo criterio que el
// placeholder que tuvo App Clientes completo hasta v24.
export default async function PerfilClientesPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <h1 className="page-title">Mi Perfil</h1>

        <div className="card" style={{ textAlign: "center", padding: "40px 20px", marginTop: 16 }}>
          <div className="espacio-icon" style={{ margin: "0 auto 16px" }}>
            <IconEdit size={22} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--azul-texto)", marginBottom: 6 }}>
            {profile?.full_name || "Mi Perfil"}
          </div>
          <p style={{ fontSize: 13, color: "var(--texto-suave)", maxWidth: 360, margin: "0 auto" }}>
            Esta pantalla todavía no tiene contenido -- pronto va a tener sus propias opciones, separadas de Mi Perfil de App Interno.
          </p>
        </div>
      </div>
    </div>
  );
}
