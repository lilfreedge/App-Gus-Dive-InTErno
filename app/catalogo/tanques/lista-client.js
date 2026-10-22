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
export default function ListaTanques({ tanques, puedeAdministrar, esTitular }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [errores, setErrores] = useState({});

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
            {esTitular && (
              <button
                type="button"
                onClick={() => toggleActivo(t)}
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
    </div>
  );
}
