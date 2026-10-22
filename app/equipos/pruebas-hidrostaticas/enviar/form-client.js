"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorBusqueda from "@/components/SelectorBusqueda";
import ConInfo from "@/components/ConInfo";
import { hoyLocalISO } from "@/lib/fechas";

// V32 -- Enviar uno o varios tanques a prueba hidrostática el mismo día.
// Los tanques que ya están afuera no salen en la lista (la base de datos
// tampoco deja tener dos envíos abiertos del mismo tanque).
export default function EnviarTanquesForm({ userId, nombreUsuario, tanques }) {
  const router = useRouter();
  const supabase = createClient();
  const [elegidos, setElegidos] = useState([]);
  const [selectorKey, setSelectorKey] = useState(0);
  const [fecha, setFecha] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFecha(hoyLocalISO());
  }, []);

  const disponibles = tanques.filter((t) => !elegidos.includes(t.id));

  function agregar(id) {
    if (!id) return;
    setElegidos((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSelectorKey((k) => k + 1);
  }

  function quitar(id) {
    setElegidos((prev) => prev.filter((x) => x !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (elegidos.length === 0) return setError("Escoge al menos un tanque.");
    if (!fecha) return setError("Pon la fecha de envío.");
    if (fecha > hoyLocalISO()) return setError("La fecha de envío no puede ser en el futuro.");

    setLoading(true);
    const registros = elegidos.map((id) => ({
      tanque_id: id,
      tanque_codigo_snapshot: tanques.find((t) => t.id === id)?.codigo || null,
      fecha_envio: fecha,
      nota: nota.trim() || null,
      user_id: userId,
      nombre_usuario_snapshot: nombreUsuario,
    }));
    const { error: err } = await supabase.from("envios_hidrostatica").insert(registros);
    setLoading(false);
    if (err) {
      setError(
        /duplicate|un_abierto/i.test(err.message || "")
          ? "Uno de esos tanques ya está afuera en prueba hidrostática."
          : "No se pudo guardar. Intenta de nuevo."
      );
      return;
    }
    router.push("/equipos/pruebas-hidrostaticas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <ConInfo
        style={{ marginBottom: 6 }}
        texto="Puedes poner varios: todos los que salen el mismo día. Los que ya están afuera no aparecen en la lista."
      >
        <label style={{ margin: 0 }}>
          Tanques que se envían <span className="req">*</span>
        </label>
      </ConInfo>
      {elegidos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {elegidos.map((id) => (
            <button
              key={id}
              type="button"
              className="badge badge-azul"
              onClick={() => quitar(id)}
              style={{ margin: 0, fontSize: 12.5, padding: "5px 10px", border: "none", cursor: "pointer" }}
              aria-label="Quitar tanque"
            >
              {tanques.find((t) => t.id === id)?.codigo} ✕
            </button>
          ))}
        </div>
      )}
      <SelectorBusqueda
        key={selectorKey}
        items={disponibles}
        valor=""
        onChange={agregar}
        placeholder="Escribe para buscar tanque por código..."
        vacio="No hay tanques disponibles para enviar"
      />

      <label htmlFor="fecha_envio">
        Fecha de envío <span className="req">*</span>
      </label>
      <input id="fecha_envio" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

      <label htmlFor="nota">Nota</label>
      <textarea
        id="nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Cualquier detalle extra (opcional)"
      />

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Guardando..." : `Registrar envío${elegidos.length > 1 ? ` (${elegidos.length} tanques)` : ""}`}
      </button>
    </form>
  );
}
