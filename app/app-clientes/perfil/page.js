import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import PreferenciasApariencia from "@/components/PreferenciasApariencia";
import MiActividadClientes from "@/components/MiActividadClientes";
import PersonalizarMenuClientes from "@/components/PersonalizarMenuClientes";
import PerfilForm from "@/app/perfil/form-client";

// Mi Perfil de App Clientes (23-sep-2026, pedido explícito: "agrega 'mi
// actividad' a 'mi perfil'. agrega preferiencia de apareicnai y
// personaliza menu. que esté conectado con el app interno para cosas
// que aplique"):
// - PerfilForm (nombre + contraseña) se reutiliza tal cual de App
//   Interno (app/perfil/form-client.js) -- es genérico, no tiene nada
//   específico de esa app.
// - "Mi actividad" es propia de App Clientes (MiActividadClientes),
//   análoga a MiActividad de App Interno pero con órdenes/clientes/
//   equipos en vez de salidas/llenados.
// - "Preferencias de apariencia" es el mismo componente que usa App
//   Interno -- el tema y tamaño de letra son de la cuenta completa
//   (localStorage), no algo separado por app, así que aquí sí está
//   literalmente conectado con App Interno.
// - "Personalizar menú" (23-sep-2026, pedido explícito: "agrega boton
//   opcional (asi como esta en app interno) para que la gente puedan
//   ver shortcut de reportes en su menú") ya usa PersonalizarMenuClientes
//   -- mismo mecanismo que PersonalizarMenu de App Interno
//   (ATAJOS_MENU_CLIENTES en lib/nav-clientes.js), en su propia columna
//   (menu_personalizado_clientes) para no pisar la de App Interno.
export default async function PerfilClientesPage() {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);

  const [{ data: misOrdenes }, { data: misClientes }, { data: misEquipos }] = await Promise.all([
    supabase
      .from("ordenes_equipos")
      .select("id, folio, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("clientes_equipos")
      .select("id, nombre, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("equipos_del_cliente")
      .select("id, tipo_equipo, tipo_equipo_otro, marca, modelo, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const actividad = [
    ...(misOrdenes || []).map((o) => ({ ...o, tipo: "orden" })),
    ...(misClientes || []).map((c) => ({ ...c, tipo: "cliente" })),
    ...(misEquipos || []).map((e) => ({ ...e, tipo: "equipo" })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <h1 className="page-title">Mi Perfil</h1>

        <PerfilForm userId={user.id} nombreActual={profile?.full_name || ""} correo={user.email} />

        <div style={{ marginTop: 16 }}>
          <MiActividadClientes actividad={actividad} />
        </div>

        <div style={{ marginTop: 26 }}>
          <PreferenciasApariencia />
        </div>

        <div className="section-title" style={{ marginTop: 26 }}>
          Personalizar mi menú
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: "var(--texto-suave)", margin: 0 }}>
            Mantén presionado y arrastra los botones del menú de arriba para ordenarlos a tu gusto. Inicio y Más siempre quedan fijos en su lugar.
          </p>
        </div>
        <div className="card">
          <PersonalizarMenuClientes menuInicial={profile?.menu_personalizado_clientes} />
        </div>
      </div>
    </div>
  );
}
