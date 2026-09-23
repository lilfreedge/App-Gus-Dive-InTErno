"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorCliente from "@/components/SelectorCliente";
import CampoFoto from "@/components/CampoFoto";
import { subirFoto } from "@/lib/storage-client";
import { hoyISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

const TIPOS = ["Tanques", "Reguladores", "BC", "Computadora", "Otro"];

// Registrar orden (App Equipos Clientes, 23-sep-2026). Pedido del
// usuario: cliente (con opción de crearlo ahí mismo si no existe), fecha
// con default hoy pero editable, tipo de equipo, qué se hará, y "datos
// que apareceran automaticamente... arrastrados con el nombre del
// cliente" -- se implementó como un historial reciente del cliente
// elegido, visible ahí mismo (no hay otro campo que tenga sentido
// autocompletar: lo que se hará cambia cada vez). Además, en este mismo
// mensaje: notas opcional, foto opcional, y arranca siempre en estado
// "Pendiente por trabajar" (no es un campo del formulario).
export default function NuevaOrdenForm({ clientes: clientesIniciales, clientePreseleccionado }) {
  const router = useRouter();
  const supabase = createClient();

  const [clientes, setClientes] = useState(clientesIniciales);
  const [clienteId, setClienteId] = useState(clientePreseleccionado || "");
  const [fecha, setFecha] = useState(hoyISO());
  const [tipoEquipo, setTipoEquipo] = useState("");
  const [tipoEquipoOtro, setTipoEquipoOtro] = useState("");
  const [queSeHara, setQueSeHara] = useState("");
  const [notas, setNotas] = useState("");
  const [foto, setFoto] = useState(null);

  const [historialCliente, setHistorialCliente] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clienteId) {
      setHistorialCliente([]);
      return;
    }
    let cancelado = false;
    supabase
      .from("ordenes_equipos")
      .select("id, tipo_equipo, tipo_equipo_otro, fecha, estado")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!cancelado) setHistorialCliente(data || []);
      });
    return () => {
      cancelado = true;
    };
  }, [clienteId, supabase]);

  function onClienteCreado(nuevo) {
    setClientes((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!clienteId) return setError("Selecciona o crea un cliente.");
    if (!fecha) return setError("Selecciona la fecha.");
    if (!tipoEquipo) return setError("Selecciona el tipo de equipo.");
    if (tipoEquipo === "Otro" && !tipoEquipoOtro.trim()) return setError("Especifica qué tipo de equipo es.");
    if (!queSeHara.trim()) return setError("Completa qué se le hará al equipo.");

    const cliente = clientes.find((c) => c.id === clienteId);

    setLoading(true);

    let fotoUrl = null;
    try {
      if (foto) fotoUrl = await subirFoto(supabase, foto, `ordenes/${clienteId}`, "equipos-clientes");
    } catch (err) {
      setLoading(false);
      setError("No se pudo subir la foto. Intenta de nuevo.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const { data, error: err } = await supabase
      .from("ordenes_equipos")
      .insert({
        user_id: user?.id,
        nombre_usuario_snapshot: perfil?.full_name || null,
        cliente_id: clienteId,
        cliente_nombre_snapshot: cliente?.nombre || null,
        tipo_equipo: tipoEquipo,
        tipo_equipo_otro: tipoEquipo === "Otro" ? tipoEquipoOtro.trim() : null,
        que_se_hara: queSeHara.trim(),
        notas: notas.trim() || null,
        foto_url: fotoUrl,
        fecha,
        estado: "Pendiente por trabajar",
      })
      .select("id")
      .single();

    setLoading(false);

    if (err || !data) {
      setError("No se pudo guardar la orden. Intenta de nuevo.");
      return;
    }

    router.push(`/app-clientes/ordenes/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="cliente">
        Cliente <span className="req">*</span>
      </label>
      <SelectorCliente
        clientes={clientes}
        valor={clienteId}
        onChange={setClienteId}
        onClienteCreado={onClienteCreado}
      />

      {historialCliente.length > 0 && (
        <div style={{ marginTop: 10, marginBottom: 4 }}>
          <div className="hint-text" style={{ marginBottom: 4 }}>Historial reciente de este cliente:</div>
          {historialCliente.map((o) => (
            <div key={o.id} className="hint-text" style={{ marginBottom: 2 }}>
              · {o.tipo_equipo === "Otro" ? o.tipo_equipo_otro : o.tipo_equipo} — {formatFechaDDMMAAAADeDate(o.fecha)} ({o.estado})
            </div>
          ))}
        </div>
      )}

      <label htmlFor="fecha" style={{ marginTop: 14 }}>
        Fecha <span className="req">*</span>
      </label>
      <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

      <label htmlFor="tipo_equipo">
        Tipo de equipo <span className="req">*</span>
      </label>
      <select id="tipo_equipo" value={tipoEquipo} onChange={(e) => setTipoEquipo(e.target.value)}>
        <option value="">Selecciona...</option>
        {TIPOS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {tipoEquipo === "Otro" && (
        <>
          <label htmlFor="tipo_equipo_otro">
            ¿Qué tipo de equipo? <span className="req">*</span>
          </label>
          <input
            id="tipo_equipo_otro"
            type="text"
            value={tipoEquipoOtro}
            onChange={(e) => setTipoEquipoOtro(e.target.value)}
            placeholder="Ej: Aleta, careta, traje..."
          />
        </>
      )}

      <label htmlFor="que_se_hara">
        Qué se le hará <span className="req">*</span>
      </label>
      <textarea
        id="que_se_hara"
        value={queSeHara}
        onChange={(e) => setQueSeHara(e.target.value)}
        placeholder="Ej: Revisión y mantenimiento general"
      />

      <label htmlFor="notas">Notas</label>
      <textarea
        id="notas"
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Cualquier detalle extra (opcional)"
      />

      <div style={{ marginTop: 14 }}>
        <CampoFoto id="foto" label="Foto del equipo" file={foto} onChange={setFoto} />
      </div>

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
        {loading ? "Guardando..." : "Registrar orden"}
      </button>
    </form>
  );
}
