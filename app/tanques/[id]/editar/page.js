import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import EditarLlenadoForm from "./form-client";

export default async function EditarLlenadoPage({ params }) {
  const supabase = createClient();
  await requireAdmin(supabase);

  const { data: registro } = await supabase
    .from("llenados_tanques")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!registro) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/tanques" className="back-link">
          ← Volver a Tanques
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Llenados de tanque", href: "/tanques" },
            { label: "Editar llenado" },
          ]}
        />
        <h1 className="page-title">Editar llenado</h1>
        {/* V68 ("27. ok"): sin la frase debajo del título (grupo 2 de las letras pequeñas). */}

        <EditarLlenadoForm registro={registro} />
      </div>
    </div>
  );
}
