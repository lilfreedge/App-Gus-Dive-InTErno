"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoClienteForm() {
  const router = useRouter();
  const supabase = createClient();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) return setError("Escribe el nombre del cliente.");

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const { data, error: err } = await supabase
      .from("clientes_equipos")
      .insert({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        user_id: user?.id || null,
        nombre_usuario_snapshot: perfil?.full_name || null,
      })
      .select("id")
      .single();

    setLoading(false);

    if (err || !data) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push(`/app-clientes/clientes/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre">
        Nombre <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <label htmlFor="telefono">Teléfono</label>
      <input id="telefono" type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
        {loading ? "Guardando..." : "Registrar cliente"}
      </button>
    </form>
  );
}
