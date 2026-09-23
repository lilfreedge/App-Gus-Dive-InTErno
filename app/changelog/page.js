import Link from "next/link";
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
export default function ChangelogPage({ searchParams }) {
  const desdeClientes = searchParams?.desde === "clientes";

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
