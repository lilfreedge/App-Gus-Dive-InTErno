"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { subirFoto } from "@/lib/storage-client";
import CampoFoto from "@/components/CampoFoto";

export default function NuevoCompresorForm() {
  const router = useRouter();
  const supabase = createClient();

  const [descripcion, setDescripcion] = useState("");
  const [codigo, setCodigo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [noBloque, setNoBloque] = useState("");
  const [serie, setSerie] = useState("");
  const [foto, setFoto] = useState(null);
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

    let fotoUrl = null;
    try {
      if (foto) fotoUrl = await subirFoto(supabase, foto, "compresores");
    } catch (err) {
      setLoading(false);
      setError("No se pudo subir la foto. Intenta de nuevo.");
      return;
    }

    const { error } = await supabase.from("compresores").insert({ ...datos, foto_url: fotoUrl });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setError("Ese código ya existe en el catálogo de compresores.");
      } else {
        setError("No se pudo agregar. Intenta de nuevo.");
      }
      return;
    }

    router.push("/equipos/compresores");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
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
        <CampoFoto id="foto" label="Foto del compresor" file={foto} onChange={setFoto} />
      </div>

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar compresor"}
      </button>
    </form>
  );
}
