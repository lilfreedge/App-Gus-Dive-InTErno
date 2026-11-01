"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// V54 -- Borrar un cliente desde su ficha (1-nov: "quita esta opción de
// seleccionar todo en app equipos clientes > listado de clientes. Pon que en
// caso de que quiera borrar un cliente sea dentro del cliente"). Mismo
// permiso que antes tenía "Borrar seleccionados" (Titular o "Editar
// cliente"). Pide confirmar en la misma pantalla. Si tiene equipos u órdenes
// no se puede (la base no lo deja): primero hay que borrar esos.
export default function BorrarCliente({ id, nombre, equipos = 0, ordenes = 0 }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const tiene = [equipos ? `${equipos} equipo${equipos === 1 ? "" : "s"}` : "", ordenes ? `${ordenes} orden${ordenes === 1 ? "" : "es"}` : ""].filter(Boolean).join(" y ");

  async function borrar() {
    setCargando(true);
    setError("");
    const { data, error: e } = await createClient().from("clientes_equipos").delete().eq("id", id).select("id");
    setCargando(false);
    if (e) {
      setError(e.code === "23503" ? "No se puede borrar: tiene equipos u órdenes registradas. Borra esos primero." : `No se pudo borrar: ${e.message}`);
      return;
    }
    if (!data?.length) {
      setError("No se pudo borrar (no tienes permiso para borrar clientes).");
      return;
    }
    router.push("/app-clientes/clientes");
    router.refresh();
  }

  return (
    <>
      <div className="section-title" style={{ marginTop: 28 }}>
        Borrar el cliente
      </div>
      {tiene ? (
        <div className="hint-text">
          No se puede borrar porque tiene {tiene}. Para borrarlo, primero hay que borrar {equipos && ordenes ? "esos" : equipos ? "sus equipos" : "sus órdenes"}.
        </div>
      ) : !confirmando ? (
        <button type="button" className="btn secondary" onClick={() => setConfirmando(true)} style={{ marginTop: 0, width: "auto", color: "var(--rojo)", borderColor: "var(--rojo)" }}>
          Borrar este cliente
        </button>
      ) : (
        <div className="error-box" style={{ marginTop: 0 }}>
          ¿Borrar a <b>{nombre}</b>? No se puede deshacer.
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={borrar} disabled={cargando} style={{ marginTop: 0, width: "auto", background: "var(--rojo)", borderColor: "var(--rojo)" }}>
              {cargando ? "Borrando..." : "Sí, borrar"}
            </button>
            <button type="button" className="btn secondary" onClick={() => setConfirmando(false)} disabled={cargando} style={{ marginTop: 0, width: "auto" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <div className="error-box" style={{ marginTop: 8 }}>{error}</div>}
    </>
  );
}
