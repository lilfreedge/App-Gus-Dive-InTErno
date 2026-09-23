"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { subirFoto } from "@/lib/storage-client";
import CampoFoto from "@/components/CampoFoto";

export default function EditarCompresorForm({ compresor }) {
  const router = useRouter();
  const supabase = createClient();

  const [descripcion, setDescripcion] = useState(compresor.descripcion || "");
  const [codigo, setCodigo] = useState(compresor.codigo || "");
  const [marca, setMarca] = useState(compresor.marca || "");
  const [modelo, setModelo] = useState(compresor.modelo || "");
  const [noBloque, setNoBloque] = useState(compresor.no_bloque || "");
  const [serie, setSerie] = useState(compresor.serie || "");
  const [fotoNueva, setFotoNueva] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const datos = {
      descripcion: descripcion.trim(),
      codigo: codigo.trim(),
      marca: marca.trim(),
      modelo: modelo.trim(),
      no_bloque: noBloque.trim(),
      serie: serie.trim(),
    };

    if (!datos.descripcion || !datos.codigo || !datos.marca || !datos.modelo || !datos.no_bloque || !datos.serie) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);

    let fotoUrl = compresor.foto_url;
    if (fotoNueva) {
      try {
        fotoUrl = await subirFoto(supabase, fotoNueva, "compresores");
      } catch (err) {
        setLoading(false);
        setError("No se pudo subir la foto nueva. Intenta de nuevo.");
        return;
      }
    }

    // Queda en Administración > Historial > Ediciones, con los datos de
    // ANTES de este cambio (pedido explícito del usuario, 23-sep-2026).
    await registrarCambio(supabase, {
      tabla: "compresores",
      registroId: compresor.id,
      accion: "editar",
      datosAnteriores: compresor,
    });

    const { error } = await supabase
      .from("compresores")
      .update({ ...datos, foto_url: fotoUrl })
      .eq("id", compresor.id);

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setError("Ya existe otro compresor con ese código.");
      } else {
        setError("No se pudo guardar. Intenta de nuevo.");
      }
      return;
    }

    router.push(`/equipos/compresores/${compresor.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      {compresor.foto_url && !fotoNueva && (
        <img
          src={compresor.foto_url}
          alt={compresor.codigo}
          style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 10, marginBottom: 16 }}
        />
      )}

      <label htmlFor="descripcion" style={{ marginTop: 0 }}>
        Descripción <span className="req">*</span>
      </label>
      <input
        id="descripcion"
        type="text"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: Compresor de llenado principal"
      />

      <label htmlFor="codigo">
        Código <span className="req">*</span>
      </label>
      <input
        id="codigo"
        type="text"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Ej: COMP-01"
      />

      <label htmlFor="marca">
        Marca <span className="req">*</span>
      </label>
      <input id="marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej: Bauer" />

      <label htmlFor="modelo">
        Modelo <span className="req">*</span>
      </label>
      <input id="modelo" type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ej: Junior II" />

      <label htmlFor="no_bloque">
        No. Bloque <span className="req">*</span>
      </label>
      <input
        id="no_bloque"
        type="text"
        value={noBloque}
        onChange={(e) => setNoBloque(e.target.value)}
        placeholder="Ej: B-4521"
      />

      <label htmlFor="serie">
        Serie <span className="req">*</span>
      </label>
      <input id="serie" type="text" value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="Ej: SN-2021-089" />

      <div style={{ marginTop: 14 }}>
        <CampoFoto id="foto" label="Foto del compresor" file={fotoNueva} onChange={setFotoNueva} />
      </div>

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
