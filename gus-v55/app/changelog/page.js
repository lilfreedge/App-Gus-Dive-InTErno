import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import ChangelogClient from "./changelog-client";

// Bug reportado en vivo (23-sep-2026): el link "Changelog" del menú de
// ajustes de App Clientes caía siempre en el header y el "← Volver" de
// App Interno, porque esta página tenía <AppHeader /> (App Interno) fijo
// sin importar desde dónde se abriera. TopbarClientes.js ahora manda acá
// con "?desde=clientes" -- con eso se muestra el header y el "← Volver"
// de App Clientes en vez de los de App Interno. El contenido del
// changelog (ChangelogClient) sigue siendo el mismo para las dos apps,
// solo cambia el marco alrededor.
// V30 ("corrige todos los accesos"): la página revisa el permiso
// "changelog" -- antes solo lo revisaba el botón del menú ⚙, y
// cualquiera con el enlace la podía abrir.
export default async function ChangelogPage({ searchParams }) {
  const desdeClientes = searchParams?.desde === "clientes";
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  if (!tieneAcceso(profile, "changelog")) {
    redirect(desdeClientes ? "/app-clientes" : "/dashboard");
  }

  return (
    <div>
      {desdeClientes ? <AppHeaderClientes /> : <AppHeader />}
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={desdeClientes ? "/app-clientes" : "/dashboard"} className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Changelog" }]} />

        <ChangelogClient />
      </div>
    </div>
  );
}
