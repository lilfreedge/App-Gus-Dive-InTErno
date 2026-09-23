import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import EstadoCompresor from "./estado-client";

// Ficha de un compresor: datos + acceso a su historial + registrar un
// mantenimiento (ya preseleccionado este compresor) + horómetro más
// reciente (propuesta agregada, 23-sep-2026) + Inactivar/Reactivar
// (solo Titular).
export default async function FichaCompresorPage({ params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeAdministrar = tieneAcceso(profile, "compresores");
  const esTitular = !!profile?.es_titular;

  const [{ data: compresor }, { data: ultimoMantenimiento }] = await Promise.all([
    supabase.from("compresores").select("*").eq("id", params.id).single(),
    supabase
      .from("mantenimientos_compresores")
      .select("horometro, fecha, tipo_mantenimiento")
      .eq("compresor_id", params.id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!compresor) notFound();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/compresores" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Compresores", href: "/equipos/compresores" },
            { label: compresor.codigo },
          ]}
        />
        <h1 className="page-title">{compresor.codigo}</h1>

        <div className="card">
          {compresor.foto_url && (
            <img
              src={compresor.foto_url}
              alt={compresor.codigo}
              style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 10, marginBottom: 16 }}
            />
          )}

          <div className="section-title" style={{ marginTop: 0 }}>Datos del compresor</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Campo etiqueta="Estado">
              <span className={compresor.activo ? "badge badge-verde" : "badge badge-rojo"}>
                {compresor.activo ? "Activo" : "Inactivo"}
              </span>
            </Campo>
            <Campo etiqueta="Descripción" valor={compresor.descripcion} />
            <Campo etiqueta="Marca" valor={compresor.marca} />
            <Campo etiqueta="Modelo" valor={compresor.modelo} />
            <Campo etiqueta="No. Bloque" valor={compresor.no_bloque} />
            <Campo etiqueta="Serie" valor={compresor.serie} />
            <Campo etiqueta="Horómetro más reciente">
              {ultimoMantenimiento ? (
                `${ultimoMantenimiento.horometro} h · ${formatFechaDDMMAAAADeDate(ultimoMantenimiento.fecha)}`
              ) : (
                <span className="hint-text" style={{ margin: 0 }}>Sin mantenimientos registrados aún</span>
              )}
            </Campo>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            <Link href={`/equipos/compresores/historial?compresor=${compresor.id}`}>
              <button className="btn secondary" type="button">
                Historial
              </button>
            </Link>
            {puedeAdministrar && (
              <Link href={`/equipos/compresores/mantenimiento/nueva?compresor=${compresor.id}`}>
                <button className="btn btn-primary" type="button">
                  + Registrar mantenimiento
                </button>
              </Link>
            )}
            {esTitular && <EstadoCompresor compresor={compresor} />}
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
