"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconEdit } from "@/components/icons";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

// puedeAdministrar (permiso catalogo_tanque, o Titular): ve el lápiz de
// editar. esTitular: además ve "Inactivar/Reactivar" (mismo patrón que
// app/catalogo/lista-client.js para Códigos).
//
// V32 (aprobado en maqueta):
// - Tocar el código abre la FICHA del tanque, con su récord de pruebas
//   hidrostáticas e inspecciones visuales ("Cada tanque debe de llevar su
//   récord de prueba hidrostáticas al igual que inspección visual").
// - Los inactivos van plegados al final ("Inactivos (N) ▸"); al buscar un
//   código salen todos, el inactivo marcado. Pasa poco ("puede ser algo
//   sutil").
// - Un código se puede repetir si el otro tanque está inactivo (opción B):
//   al reactivar, si ya hay uno activo con ese código, avisa.
//
// V33 (pedido explícito, maqueta V33 sección 6, "ok"): en un tanque que se
// inactivó por rechazo en prueba hidrostática, "Reactivar" pregunta qué
// hacer: usar su código en OTRO tanque (recomendado: se crea uno nuevo y el
// viejo se queda con su historial) o reactivar este mismo (pide revisar sus
// datos). Lo pueden hacer el Titular y los Administradores ("esto solo lo
// podré hacer yo y el administrador"). Inactivar/Reactivar los demás sigue
// siendo solo del Titular.
function rechazadoEnPH(t) {
  return !t.activo && (t.motivo_inactivo || "").startsWith("Rechazado en prueba hidrostática");
}

export default function ListaTanques({ tanques, puedeAdministrar, esTitular, esAdmin = false }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [errores, setErrores] = useState({});
  const [preguntando, setPreguntando] = useState(null); // tanque rechazado en PH a reactivar

  async function toggleActivo(tanque) {
    setLoadingId(tanque.id);
    setErrores((e) => ({ ...e, [tanque.id]: "" }));
    const cambios = tanque.activo
      ? { activo: false, inactivado_en: new Date().toISOString(), motivo_inactivo: null }
      : { activo: true, inactivado_en: null, motivo_inactivo: null };
    const { error } = await supabase.from("tanques_alquiler").update(cambios).eq("id", tanque.id);
    setLoadingId(null);
    if (error) {
      setErrores((e) => ({
        ...e,
        [tanque.id]: /duplicate|unico/i.test(error.message || "")
          ? `Ya hay otro tanque activo con el código ${tanque.codigo}. Cámbiale el código a uno de los dos antes de reactivarlo.`
          : "No se pudo cambiar. Intenta de nuevo.",
      }));
      return;
    }
    router.refresh();
  }

  const q = busqueda.trim().toLowerCase();
  const { activos, inactivos } = useMemo(() => {
    const coinciden = q ? tanques.filter((t) => t.codigo.toLowerCase().includes(q)) : tanques;
    return {
      activos: coinciden.filter((t) => t.activo),
      inactivos: coinciden.filter((t) => !t.activo),
    };
  }, [tanques, q]);

  function fila(t) {
    return (
      <div className="list-item" key={t.id}>
        <div className="list-item-top">
          <Link
            href={`/catalogo/tanques/${t.id}`}
            className="list-item-title"
            style={{ opacity: t.activo ? 1 : 0.55, textDecoration: "none", color: "inherit" }}
          >
            {t.codigo}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!t.activo && (
              <span className="badge badge-rojo">
                Inactivo{t.motivo_inactivo ? ` · ${t.motivo_inactivo.replace("Rechazado en prueba hidrostática", "rechazado en PH")}` : ""}
              </span>
            )}
            {puedeAdministrar && (
              <Link
                href={`/catalogo/tanques/${t.id}/editar`}
                className="icon-btn"
                aria-label="Editar"
                title="Editar"
              >
                <IconEdit size={15} />
              </Link>
            )}
            {(esTitular || (esAdmin && rechazadoEnPH(t))) && (
              <button
                type="button"
                onClick={() => (rechazadoEnPH(t) ? setPreguntando(t) : toggleActivo(t))}
                disabled={loadingId === t.id}
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: "none",
                  background: "none",
                  color: t.activo ? "var(--rojo)" : "var(--azul-claro)",
                  cursor: "pointer",
                }}
              >
                {t.activo ? "Inactivar" : "Reactivar"}
              </button>
            )}
          </div>
        </div>
        {t.descripcion && <div className="list-item-note">{t.descripcion}</div>}
        {t.serie && <div className="list-item-note">Serie: {t.serie}</div>}
        {t.activo && (
          <>
            <div className="list-item-meta">
              {t.proxima_inspeccion
                ? `Próxima inspección: ${formatFechaDDMMAAAADeDate(t.proxima_inspeccion)}`
                : "Sin inspecciones registradas"}
            </div>
            <div className="list-item-meta">
              {t.proxima_hidrostatica
                ? `Próxima hidrostática: ${formatFechaDDMMAAAADeDate(t.proxima_hidrostatica)}`
                : "Sin prueba hidrostática registrada"}
            </div>
          </>
        )}
        {errores[t.id] && <div className="error-msg">⚠ {errores[t.id]}</div>}
      </div>
    );
  }

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar tanque por código..."
        />
      </div>

      {activos.length === 0 && (q ? inactivos.length === 0 : true) ? (
        <div className="empty">
          {tanques.length === 0
            ? "Aún no hay tanques de alquiler en el catálogo."
            : q
            ? "Ningún tanque coincide con esa búsqueda."
            : "No hay tanques activos."}
        </div>
      ) : (
        activos.map(fila)
      )}

      {/* Al buscar, los inactivos que coinciden salen directo (marcados). */}
      {q && inactivos.map(fila)}

      {!q && inactivos.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setVerInactivos((v) => !v)}
            className="section-title"
            style={{
              justifyContent: "flex-start",
              gap: 8,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              width: "100%",
              marginBottom: verInactivos ? 4 : 0,
            }}
            aria-expanded={verInactivos}
          >
            <span style={{ color: "var(--texto-suave)", width: 14 }}>{verInactivos ? "▾" : "▸"}</span>
            Inactivos ({inactivos.length})
          </button>
          {verInactivos && inactivos.map(fila)}
        </>
      )}

      {preguntando && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreguntando(null);
          }}
        >
          <div className="modal-panel">
            <div className="modal-title">
              {preguntando.codigo} fue {preguntando.motivo_inactivo.replace("Rechazado", "rechazado")}
            </div>
            <div style={{ fontSize: 13, marginTop: 6, color: "var(--texto-suave)" }}>¿Qué quieres hacer?</div>
            <button
              type="button"
              onClick={() => router.push(`/catalogo/tanques/nuevo?de=${preguntando.id}`)}
              className="card"
              style={{ display: "block", width: "100%", textAlign: "left", margin: "12px 0 8px", padding: "12px 14px", border: "2px solid var(--azul-claro)", cursor: "pointer", font: "inherit", color: "inherit" }}
            >
              <b style={{ color: "var(--azul-texto)" }}>Usar el código {preguntando.codigo} en otro tanque</b>
              <span className="badge" style={{ marginLeft: 6 }}>Recomendado</span>
              <div className="hint-text">
                Se crea un tanque nuevo {preguntando.codigo} con sus datos. El {preguntando.codigo} viejo se queda inactivo con su
                historial (el rechazo incluido), y la ficha del nuevo tiene el enlace para verlo.
              </div>
            </button>
            <button
              type="button"
              onClick={() => router.push(`/catalogo/tanques/${preguntando.id}/editar?reactivar=1`)}
              className="card"
              style={{ display: "block", width: "100%", textAlign: "left", margin: 0, padding: "12px 14px", cursor: "pointer", font: "inherit", color: "inherit" }}
            >
              <b style={{ color: "var(--azul-texto)" }}>Reactivar este mismo tanque</b>
              <div className="hint-text">
                Solo si el rechazo fue un error. Pide revisar sus datos antes de reactivarlo, y su historial sigue con el rechazo.
              </div>
            </button>
            <div className="modal-actions">
              <button className="btn secondary" type="button" onClick={() => setPreguntando(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
