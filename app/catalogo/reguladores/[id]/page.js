import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import Breadcrumb from "@/components/Breadcrumb";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

// Ficha de un regulador de alquiler: todos sus datos de solo lectura, más
// accesos a su historial de mantenimiento y (si hay permiso) a editarlo.
export default async function FichaReguladorPage({ params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeAdministrar = tieneAcceso(profile, "catalogo_regulador");

  const { data: regulador } = await supabase
    .from("reguladores_alquiler")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!regulador) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <Breadcrumb
          items={[
            { label: "Códigos", href: "/catalogo" },
            { label: "Reguladores de alquiler", href: "/catalogo/reguladores" },
            { label: regulador.codigo },
          ]}
        />
        <h1 className="page-title">{regulador.codigo}</h1>

        <div className="card">
          <div className="section-title">Datos del regulador</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Campo etiqueta="Código" valor={regulador.codigo} />
            <Campo etiqueta="Estado">
              <span className={regulador.activo ? "badge badge-verde" : "badge badge-rojo"}>
                {regulador.activo ? "Activo" : "Inactivo"}
              </span>
            </Campo>
            <Campo etiqueta="Serie" valor={regulador.serie || "—"} />
            <Campo etiqueta="1ra etapa" valor={regulador.primera_etapa || "—"} />
            <Campo etiqueta="2da etapa" valor={regulador.segunda_etapa || "—"} />
            <Campo etiqueta="Octopus" valor={regulador.octopus || "—"} />
            <Campo etiqueta="Manómetro" valor={regulador.manometro || "—"} />
            <Campo etiqueta="Próximo mantenimiento">
              {regulador.proximo_mantenimiento ? (
                formatFechaDDMMAAAADeDate(regulador.proximo_mantenimiento)
              ) : (
                <span className="hint-text" style={{ margin: 0 }}>
                  Sin mantenimientos registrados aún
                </span>
              )}
            </Campo>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            <Link href={`/equipos/mantenimiento-reguladores?regulador=${regulador.id}`}>
              <button className="btn secondary" type="button">
                Ver historial de mantenimiento
              </button>
            </Link>
            {puedeAdministrar && (
              <Link href={`/catalogo/reguladores/${regulador.id}/editar`}>
                <button className="btn btn-primary" type="button">
                  Editar regulador
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ etiqueta, valor, children }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--texto-suave)", marginBottom: 2 }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: 14.5 }}>{children !== undefined ? children : valor}</div>
    </div>
  );
}

