import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { IconEdit } from "@/components/icons";
import { formatFecha, formatFechaDDMMAAAADeDate, formatMesAnio } from "@/lib/format";
import { hoyISO } from "@/lib/fechas";
import { diasEntreFechas } from "@/lib/envios-hidrostatica";

// V32 -- Ficha de un tanque de Base de datos con su récord (pedido
// explícito: "Cada tanque debe de llevar su récord de prueba hidrostáticas
// al igual que inspección visual"). Muestra sus datos, las próximas
// fechas, si está afuera en PH o inactivo, y su historial de pruebas
// hidrostáticas (con los envíos) e inspecciones visuales.
// Si el código lo usó antes otro tanque (dado de baja), un enlace chico
// lleva a la ficha de ese otro (opción B, "puede ser algo sutil").
function Campo({ etiqueta, valor }) {
  return (
    <div>
      <div className="hint-text" style={{ marginTop: 0 }}>{etiqueta}</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--azul-texto)" }}>{valor}</div>
    </div>
  );
}

export default async function FichaTanquePage({ params }) {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "catalogo");
  const puedeAdministrar = tieneAcceso(profile, "catalogo_tanque");

  const { data: tanque } = await supabase.from("tanques_alquiler").select("*").eq("id", params.id).maybeSingle();
  if (!tanque) notFound();

  const [{ data: pruebas }, { data: inspecciones }, envios, { data: mismoCodigo }] = await Promise.all([
    supabase
      .from("pruebas_hidrostaticas_con_nombre")
      .select("*")
      .eq("tanque_id", tanque.id)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("inspecciones_con_nombre")
      .select("*")
      .eq("tanque_id", tanque.id)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("envios_hidrostatica")
      .select("id, prueba_id, fecha_envio, fecha_regreso, nota")
      .eq("tanque_id", tanque.id)
      .order("fecha_envio", { ascending: false })
      .then((r) => (r.error ? [] : r.data || [])),
    supabase
      .from("tanques_alquiler")
      .select("id, codigo, activo, inactivado_en, created_at")
      .eq("codigo", tanque.codigo)
      .neq("id", tanque.id),
  ]);

  const hoy = hoyISO();
  const envioAbierto = envios.find((e) => !e.fecha_regreso);
  const envioPorPrueba = new Map(envios.filter((e) => e.prueba_id).map((e) => [e.prueba_id, e]));
  const anteriores = (mismoCodigo || []).filter((t) => !t.activo);
  const actualConEseCodigo = !tanque.activo ? (mismoCodigo || []).find((t) => t.activo) : null;

  const inspeccionesOrdenadas = [...(inspecciones || [])].sort((a, b) => {
    const fa = a.fecha_inspeccion || a.created_at;
    const fb = b.fecha_inspeccion || b.created_at;
    return fa < fb ? 1 : -1;
  });

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/catalogo/tanques" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "Base de datos", href: "/catalogo" },
            { label: "Tanques de alquiler", href: "/catalogo/tanques" },
            { label: tanque.activo ? tanque.codigo : `${tanque.codigo} (inactivo)` },
          ]}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0, opacity: tanque.activo ? 1 : 0.6 }}>
            {tanque.codigo}
          </h1>
          {puedeAdministrar && (
            <Link
              href={`/catalogo/tanques/${tanque.id}/editar`}
              className="icon-btn"
              aria-label="Editar tanque"
              title="Editar tanque"
            >
              <IconEdit size={15} />
            </Link>
          )}
        </div>

        {!tanque.activo && (
          <div className="error-box" style={{ marginTop: 12 }}>
            Inactivo
            {tanque.inactivado_en ? ` desde ${formatFechaDDMMAAAADeDate(tanque.inactivado_en.slice(0, 10))}` : ""}
            {tanque.motivo_inactivo ? ` · ${tanque.motivo_inactivo}` : ""}.
            {actualConEseCodigo && (
              <>
                {" "}
                <Link href={`/catalogo/tanques/${actualConEseCodigo.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                  Hoy este código lo tiene otro tanque ›
                </Link>
              </>
            )}
          </div>
        )}

        <div className="card" style={{ marginTop: 12 }}>
          <div className="campos-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Campo etiqueta="Descripción" valor={tanque.descripcion || "—"} />
            <Campo etiqueta="No. de serie" valor={tanque.serie || "—"} />
            {tanque.activo && (
              <>
                <Campo
                  etiqueta="Próxima inspección visual"
                  valor={tanque.proxima_inspeccion ? formatFechaDDMMAAAADeDate(tanque.proxima_inspeccion) : "—"}
                />
                <Campo
                  etiqueta="Próxima hidrostática"
                  valor={tanque.proxima_hidrostatica ? formatFechaDDMMAAAADeDate(tanque.proxima_hidrostatica) : "—"}
                />
              </>
            )}
          </div>
          {envioAbierto && (
            <div className="aviso-box" style={{ marginTop: 12 }}>
              Afuera en prueba hidrostática desde el {formatFechaDDMMAAAADeDate(envioAbierto.fecha_envio)} (hace{" "}
              {diasEntreFechas(envioAbierto.fecha_envio, hoy)} días).
            </div>
          )}
        </div>

        <div className="section-title">Pruebas hidrostáticas</div>
        <div className="card">
          {(pruebas || []).length === 0 ? (
            <div className="empty">Todavía no tiene pruebas registradas.</div>
          ) : (
            pruebas.map((p) => {
              const envio = envioPorPrueba.get(p.id);
              return (
                <div className="list-item" key={p.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <span className="folio-tag">#{p.folio}</span>
                      Prueba hidrostática
                      <span className={p.resultado === "Aprobado" ? "badge badge-verde" : "badge badge-rojo"}>
                        {p.resultado}
                      </span>
                    </span>
                  </div>
                  <div className="list-item-meta">
                    Fecha de la prueba: <b>{formatMesAnio(p.fecha_prueba)}</b>
                  </div>
                  {envio && (
                    <div className="list-item-meta">
                      Enviado el {formatFechaDDMMAAAADeDate(envio.fecha_envio)} · regresó el{" "}
                      {formatFechaDDMMAAAADeDate(envio.fecha_regreso)} (
                      {diasEntreFechas(envio.fecha_envio, envio.fecha_regreso)} días afuera)
                    </div>
                  )}
                  <div className="list-item-meta">
                    Registrada por {p.full_name || "—"} · {formatFecha(p.created_at)}
                  </div>
                  {p.nota && <div className="list-item-note">{p.nota}</div>}
                </div>
              );
            })
          )}
        </div>

        <div className="section-title">Inspecciones visuales</div>
        <div className="card">
          {inspeccionesOrdenadas.length === 0 ? (
            <div className="empty">Todavía no tiene inspecciones registradas.</div>
          ) : (
            inspeccionesOrdenadas.map((i) => (
              <div className="list-item" key={i.id}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    <span className="folio-tag">#{i.folio}</span>
                    Inspección visual
                    <span className={i.resultado === "Aprobado" ? "badge badge-verde" : "badge badge-rojo"}>
                      {i.resultado}
                    </span>
                  </span>
                </div>
                <div className="list-item-meta">
                  Fecha:{" "}
                  <b>
                    {i.fecha_inspeccion
                      ? formatFechaDDMMAAAADeDate(i.fecha_inspeccion)
                      : formatFechaDDMMAAAADeDate(String(i.created_at).slice(0, 10))}
                  </b>
                </div>
                <div className="list-item-meta">Registrada por {i.full_name || "—"}</div>
                {i.nota && <div className="list-item-note">{i.nota}</div>}
              </div>
            ))
          )}
        </div>

        {anteriores.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 4 }}>
            {anteriores.map((t) => (
              <div key={t.id}>
                <Link
                  href={`/catalogo/tanques/${t.id}`}
                  style={{ fontSize: 12.5, fontWeight: 600, color: "var(--azul-claro)" }}
                >
                  Este código lo usó antes otro tanque
                  {t.inactivado_en ? ` (dado de baja ${formatMesAnio(t.inactivado_en.slice(0, 10))})` : ""} ›
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
