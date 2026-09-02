"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ArticuloCombobox from "../ArticuloCombobox";
import { AUTORIZADO_POR_OPCIONES, MOTIVO_OPCIONES } from "@/lib/constantes";

export default function NuevaSalidaForm({ userId, nombreUsuario, articulos }) {
  const router = useRouter();
  const supabase = createClient();

  const [articuloId, setArticuloId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [motivoSelect, setMotivoSelect] = useState(MOTIVO_OPCIONES[0]);
  const [motivoOtro, setMotivoOtro] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [nota, setNota] = useState("");
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [loading, setLoading] = useState(false);

  const esOtroMotivo = motivoSelect === "otro";
  const motivoFinal = esOtroMotivo ? motivoOtro.trim() : motivoSelect;

  function validar() {
    const e = {};
    if (!articuloId) e.articulo = "Elige un artículo válido del catálogo.";
    if (!cantidad || Number(cantidad) <= 0) e.cantidad = "Este campo es obligatorio.";
    if (!motivoFinal) e.motivo = "Este campo es obligatorio.";
    if (!autorizadoPor) e.autorizado = "Este campo es obligatorio.";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setErrorGeneral("");

    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    const articulo = articulos.find((a) => a.id === articuloId);

    setLoading(true);

    const { error } = await supabase.from("salidas").insert({
      user_id: userId,
      articulo_id: articuloId,
      articulo: articulo?.nombre || "",
      cantidad: Number(cantidad),
      motivo: motivoFinal,
      autorizado_por: autorizadoPor,
      nota: nota.trim() || null,
      nombre_usuario_snapshot: nombreUsuario,
    });

    setLoading(false);

    if (error) {
      setErrorGeneral("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push("/salidas");
    router.refresh();
  }

  if (articulos.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          Todavía no hay artículos en el catálogo. Pídele a un administrador que
          agregue artículos en "Catálogo" antes de registrar salidas.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" noValidate>
      <label htmlFor="articulo">
        Artículo / pieza <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <ArticuloCombobox
        articulos={articulos}
        articuloId={articuloId}
        onChange={setArticuloId}
        hasError={!!errores.articulo}
      />
      {errores.articulo && <div className="error-msg">⚠ {errores.articulo}</div>}

      <label htmlFor="cantidad">
        Cantidad <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <input
        id="cantidad"
        type="number"
        min="1"
        step="1"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />
      {errores.cantidad && <div className="error-msg">⚠ {errores.cantidad}</div>}

      <label htmlFor="motivo">
        Motivo <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <select
        id="motivo"
        value={motivoSelect}
        onChange={(e) => setMotivoSelect(e.target.value)}
      >
        {MOTIVO_OPCIONES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
        <option value="otro">Otro (escribir)</option>
      </select>
      {esOtroMotivo && (
        <input
          type="text"
          value={motivoOtro}
          onChange={(e) => setMotivoOtro(e.target.value)}
          placeholder="Escribe el motivo..."
          style={{ marginTop: 8 }}
        />
      )}
      {errores.motivo && <div className="error-msg">⚠ {errores.motivo}</div>}

      <label htmlFor="autorizadoPor">
        Autorizado por <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <select
        id="autorizadoPor"
        value={autorizadoPor}
        onChange={(e) => setAutorizadoPor(e.target.value)}
      >
        <option value="">Selecciona...</option>
        {AUTORIZADO_POR_OPCIONES.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      {errores.autorizado && <div className="error-msg">⚠ {errores.autorizado}</div>}

      <label htmlFor="nota">Nota</label>
      <textarea
        id="nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Cualquier detalle extra (opcional)"
      />

      {errorGeneral && <div className="error-box">{errorGeneral}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Registrar salida"}
      </button>
    </form>
  );
}
