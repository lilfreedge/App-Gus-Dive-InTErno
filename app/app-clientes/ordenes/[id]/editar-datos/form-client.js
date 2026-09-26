"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import SelectorCliente from "@/components/SelectorCliente";
import SelectorEquipoCliente from "@/components/SelectorEquipoCliente";

const AUTORIZACION_OPCIONES = ["Autoriza cualquier cambio necesario", "Solo lo indicado, nada más"];

// Mismos campos que "Registrar orden" (form-client.js de
// app/app-clientes/ordenes/nueva/), pero para CORREGIR una orden ya
// creada (item 7, 26-sep-2026) -- por eso arranca con los valores ya
// guardados, y guarda con `update` en vez de `insert`. La foto y el
// resto del seguimiento no se tocan aquí.
export default function EditarDatosOrdenForm({ orden, clientes: clientesIniciales, equipos: equiposIniciales, servicios }) {
  const router = useRouter();
  const supabase = createClient();

  const [clientes, setClientes] = useState(clientesIniciales);
  const [equipos, setEquipos] = useState(equiposIniciales);
  const [noOrdenFisico, setNoOrdenFisico] = useState(orden.no_orden_fisico || "");
  const [clienteId, setClienteId] = useState(orden.cliente_id || "");
  const [equipoId, setEquipoId] = useState(orden.equipo_id || "");
  const [fecha, setFecha] = useState(orden.fecha || "");

  const servicioCatalogado = servicios.some((s) => s.nombre === orden.que_se_hara);
  const [servicio, setServicio] = useState(servicioCatalogado || !orden.que_se_hara ? orden.que_se_hara || "" : "Otro");
  const [servicioOtro, setServicioOtro] = useState(servicioCatalogado ? "" : orden.que_se_hara || "");

  const [autorizacionCliente, setAutorizacionCliente] = useState(orden.autorizacion_cliente || "");
  const [autorizacionNotas, setAutorizacionNotas] = useState(orden.autorizacion_notas || "");
  const [notas, setNotas] = useState(orden.notas || "");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onClienteCreado(nuevo) {
    setClientes((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  function onEquipoCreado(nuevo) {
    setEquipos((prev) => [...prev, nuevo]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!noOrdenFisico.trim()) return setError("Escribe el No. de orden del talonario.");
    if (!clienteId) return setError("Selecciona el cliente.");
    if (!equipoId) return setError("Selecciona el equipo.");
    if (!fecha) return setError("Selecciona la fecha de ingreso.");
    if (!servicio) return setError("Selecciona el servicio a realizar.");
    if (servicio === "Otro" && !servicioOtro.trim()) return setError("Especifica qué servicio se hará.");

    const cliente = clientes.find((c) => c.id === clienteId);
    const equipo = equipos.find((e) => e.id === equipoId);
    const servicioFinal = servicio === "Otro" ? servicioOtro.trim() : servicio;

    setLoading(true);

    await registrarCambio(supabase, {
      tabla: "ordenes_equipos",
      registroId: orden.id,
      accion: "editar",
      datosAnteriores: orden,
    });

    const { error: err } = await supabase
      .from("ordenes_equipos")
      .update({
        no_orden_fisico: noOrdenFisico.trim(),
        cliente_id: clienteId,
        cliente_nombre_snapshot: cliente?.nombre || orden.cliente_nombre_snapshot,
        equipo_id: equipoId,
        tipo_equipo: equipo?.tipo_equipo || orden.tipo_equipo,
        tipo_equipo_otro: equipo?.tipo_equipo_otro || null,
        equipo_marca_snapshot: equipo?.marca || null,
        equipo_modelo_snapshot: equipo?.modelo || null,
        que_se_hara: servicioFinal,
        autorizacion_cliente: autorizacionCliente || null,
        autorizacion_notas: autorizacionNotas.trim() || null,
        notas: notas.trim() || null,
        fecha,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orden.id);

    setLoading(false);

    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push(`/app-clientes/ordenes/${orden.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="no_orden_fisico">
        No. de orden <span className="req">*</span>
      </label>
      <input
        id="no_orden_fisico"
        type="text"
        value={noOrdenFisico}
        onChange={(e) => setNoOrdenFisico(e.target.value)}
        placeholder="Número del talonario físico"
      />

      <label htmlFor="cliente" style={{ marginTop: 14 }}>
        Cliente <span className="req">*</span>
      </label>
      <SelectorCliente clientes={clientes} valor={clienteId} onChange={setClienteId} onClienteCreado={onClienteCreado} puedeCrear />

      <label htmlFor="equipo" style={{ marginTop: 14 }}>
        Equipo <span className="req">*</span>
      </label>
      <SelectorEquipoCliente
        equipos={equipos}
        clienteId={clienteId}
        valor={equipoId}
        onChange={setEquipoId}
        onEquipoCreado={onEquipoCreado}
        puedeAgregarEquipo
      />

      <label htmlFor="fecha" style={{ marginTop: 14 }}>
        Fecha de ingreso <span className="req">*</span>
      </label>
      <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

      <label htmlFor="servicio">
        Servicio a realizar <span className="req">*</span>
      </label>
      <select id="servicio" value={servicio} onChange={(e) => setServicio(e.target.value)}>
        <option value="">Selecciona...</option>
        {servicios.map((s) => (
          <option key={s.id} value={s.nombre}>{s.nombre}</option>
        ))}
        <option value="Otro">Otro</option>
      </select>
      {servicio === "Otro" && (
        <>
          <label htmlFor="servicio_otro">
            ¿Qué servicio se hará? <span className="req">*</span>
          </label>
          <input
            id="servicio_otro"
            type="text"
            value={servicioOtro}
            onChange={(e) => setServicioOtro(e.target.value)}
            placeholder="Especifica el servicio"
          />
        </>
      )}

      <label htmlFor="autorizacion_cliente">Autorización del cliente</label>
      <select id="autorizacion_cliente" value={autorizacionCliente} onChange={(e) => setAutorizacionCliente(e.target.value)}>
        <option value="">Selecciona... (opcional)</option>
        {AUTORIZACION_OPCIONES.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <input
        type="text"
        value={autorizacionNotas}
        onChange={(e) => setAutorizacionNotas(e.target.value)}
        placeholder="Detalles o excepciones (opcional)"
        style={{ marginTop: 6 }}
      />

      <label htmlFor="notas">Notas</label>
      <textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Cualquier detalle extra (opcional)" />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
