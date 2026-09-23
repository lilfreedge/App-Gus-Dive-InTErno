"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorCliente from "@/components/SelectorCliente";
import SelectorEquipoCliente from "@/components/SelectorEquipoCliente";
import CampoFoto from "@/components/CampoFoto";
import { subirFoto } from "@/lib/storage-client";
import { hoyISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

// Registrar orden (App Equipos Clientes, rediseñado 23-sep-2026 tras
// definir "Equipo del cliente"): cliente, equipo de ese cliente (con
// marca/modelo -- se elige uno ya existente o se crea ahí mismo),
// servicio a realizar, fecha de ingreso. Todo lo demás (envío a,
// fechas de retorno/listo/entrega, verificado por, factura) se llena
// después, en la ficha de la orden, a medida que vaya pasando --
// pedido explícito del usuario ("cada orden como serán diferentes no se
// de que manera es que vamos alimentar las demas cosas").
export default function NuevaOrdenForm({ clientes: clientesIniciales, equipos: equiposIniciales, clientePreseleccionado }) {
  const router = useRouter();
  const supabase = createClient();

  const [clientes, setClientes] = useState(clientesIniciales);
  const [equipos, setEquipos] = useState(equiposIniciales);
  const [clienteId, setClienteId] = useState(clientePreseleccionado || "");
  const [equipoId, setEquipoId] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [servicio, setServicio] = useState("");
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
    setEquipoId("");
  }

  function onClienteChange(id) {
    setClienteId(id);
    setEquipoId("");
  }

  function onEquipoCreado(nuevo) {
    setEquipos((prev) => [...prev, nuevo]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!clienteId) return setError("Selecciona o crea un cliente.");
    if (!equipoId) return setError("Selecciona o crea el equipo.");
    if (!fecha) return setError("Selecciona la fecha de ingreso.");
    if (!servicio.trim()) return setError("Completa el servicio a realizar.");

    const cliente = clientes.find((c) => c.id === clienteId);
    const equipo = equipos.find((e) => e.id === equipoId);

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
        equipo_id: equipoId,
        tipo_equipo: equipo?.tipo_equipo || null,
        tipo_equipo_otro: equipo?.tipo_equipo_otro || null,
        equipo_marca_snapshot: equipo?.marca || null,
        equipo_modelo_snapshot: equipo?.modelo || null,
        que_se_hara: servicio.trim(),
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
        onChange={onClienteChange}
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

      <label htmlFor="equipo" style={{ marginTop: 14 }}>
        Equipo <span className="req">*</span>
      </label>
      <SelectorEquipoCliente
        equipos={equipos}
        clienteId={clienteId}
        valor={equipoId}
        onChange={setEquipoId}
        onEquipoCreado={onEquipoCreado}
      />

      <label htmlFor="fecha" style={{ marginTop: 14 }}>
        Fecha de ingreso <span className="req">*</span>
      </label>
      <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

      <label htmlFor="servicio">
        Servicio a realizar <span className="req">*</span>
      </label>
      <textarea
        id="servicio"
        value={servicio}
        onChange={(e) => setServicio(e.target.value)}
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
