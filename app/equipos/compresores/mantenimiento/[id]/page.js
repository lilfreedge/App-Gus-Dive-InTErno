import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";

// Ficha de un mantenimiento de compresor: el Historial (botón, no
// acordeón -- pedido del usuario, 23-sep-2026) lleva aquí. Todo lo que
// antes se desplegaba inline (compresor, horómetro, campos según tipo,
// notas, fotos) vive ahora en esta pantalla dedicada.
export default async function FichaMantenimientoCompresorPage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "compresores");

  const { data: m } = await supabase
    .from("mantenimientos_compresores_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!m) notFound();

  const fotos = [
    { label: "Foto de horómetro", url: m.foto_horometro_url },
    { label: "Foto de espacio", url: m.foto_espacio_url },
    { label: "Foto otra inspección", url: m.foto_otra_inspeccion_url },
    { label: "Foto de reparación", url: m.foto_reparacion_url },
  ].filter((f) => f.url);

  const esInspeccion = m.tipo_mantenimiento === "Inspección";
  const esPreventivoCorrectivo =
    m.tipo_mantenimiento === "Mantenimiento preventivo" || m.tipo_mantenimiento === "Mantenimiento correctivo";

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/equipos/compresores/historial?compresor=${m.compresor_id}`} className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Compresores", href: "/equipos/compresores" },
            { label: "Historial de mantenimientos", href: "/equipos/compresores/historial" },
            { label: `#${m.folio}` },
          ]}
        />
        <h1 className="page-title">
          #{m.folio} — {m.tipo_mantenimiento}
        </h1>

        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Campo etiqueta="Compresor">
              <Link href={`/equipos/compresores/${m.compresor_id}`} className="breadcrumb-crumb">
                {m.compresor_codigo_snapshot}
              </Link>
            </Campo>
            <Campo etiqueta="Responsable" valor={m.responsable} />
            <Campo etiqueta="Fecha del mantenimiento" valor={formatFechaDDMMAAAADeDate(m.fecha)} />
            <Campo etiqueta="Horómetro" valor={`${m.horometro} h`} />

            {esInspeccion && (
              <>
                <Campo etiqueta="Nivel de aceite" valor={m.nivel_aceite || "—"} />
                <Campo etiqueta="Limpieza compresor" valor={m.limpieza_compresor || "—"} />
                <Campo etiqueta="Estado de manguera" valor={m.estado_manguera || "—"} />
                <Campo etiqueta="Estado de filtro principal" valor={m.estado_filtro_principal || "—"} />
                <Campo etiqueta="Estado de filtro final" valor={m.estado_filtro_final || "—"} />
                <Campo etiqueta="Limpieza de espacio" valor={m.limpieza_espacio || "—"} />
                {m.otra_inspeccion && <Campo etiqueta="Otra inspección" valor={m.otra_inspeccion} />}
              </>
            )}

            {esPreventivoCorrectivo && (
              <Campo etiqueta="Proceso y piezas utilizadas" valor={m.proceso_piezas || "—"} />
            )}

            {m.notas && <Campo etiqueta="Notas" valor={m.notas} />}

            <Campo etiqueta="Registrado por">
              {m.full_name} · {formatFecha(m.created_at)}
            </Campo>
          </div>

          {fotos.length > 0 && (
            <>
              <div className="section-title">Fotos</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {fotos.map((f) => (
                  <a href={f.url} target="_blank" rel="noreferrer" key={f.url} style={{ textAlign: "center", textDecoration: "none" }}>
                    <img
                      src={f.url}
                      alt={f.label}
                      style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid var(--borde)", display: "block" }}
                    />
                    <div className="hint-text" style={{ marginTop: 4 }}>{f.label}</div>
                  </a>
                ))}
              </div>
            </>
          )}
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
