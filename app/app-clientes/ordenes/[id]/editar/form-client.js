"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { calcularEstadoOrden } from "@/lib/ordenes-estado";

const ENVIO_A = ["Prueba hidrostática", "Reparación"];
const VERIFICADO_POR = ["Pipe", "Gugi"];

export default function EditarSeguimientoForm({ orden }) {
  const router = useRouter();
  const supabase = createClient();

  const [envioA, setEnvioA] = useState(orden.envio_a || "");
  const [fechaRetorno, setFechaRetorno] = useState(orden.fecha_retorno_tienda || "");
  const [fechaListo, setFechaListo] = useState(orden.fecha_listo_entrega || "");
  const [verificadoPor, setVerificadoPor] = useState(orden.verificado_por || "");
  const [fechaNotificacion, setFechaNotificacion] = useState(orden.fecha_notificacion_cliente || "");
  const [fechaEntrega, setFechaEntrega] = useState(orden.fecha_entrega_cliente || "");
  const [nombreRecibe, setNombreRecibe] = useState(orden.nombre_recibe || "");
  const [factura, setFactura] = useState(orden.factura || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await registrarCambio(supabase, {
      tabla: "ordenes_equipos",
      registroId: orden.id,
      accion: "editar",
      datosAnteriores: orden,
    });

    const cambios = {
      envio_a: envioA || null,
      fecha_retorno_tienda: fechaRetorno || null,
      fecha_listo_entrega: fechaListo || null,
      verificado_por: verificadoPor || null,
      fecha_notificacion_cliente: fechaNotificacion || null,
      fecha_entrega_cliente: fechaEntrega || null,
      nombre_recibe: nombreRecibe.trim() || null,
      factura: factura.trim() || null,
    };

    const nuevoEstado = calcularEstadoOrden({ ...orden, ...cambios });

    const { error: err } = await supabase
      .from("ordenes_equipos")
      .update({ ...cambios, estado: nuevoEstado, updated_at: new Date().toISOString() })
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
      <label htmlFor="envio_a">Envío a</label>
      <select id="envio_a" value={envioA} onChange={(e) => setEnvioA(e.target.value)}>
        <option value="">Sin enviar / no aplica</option>
        {ENVIO_A.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      <label htmlFor="fecha_retorno">Fecha de retorno a tienda</label>
      <input id="fecha_retorno" type="date" value={fechaRetorno} onChange={(e) => setFechaRetorno(e.target.value)} />

      <label htmlFor="fecha_listo">Fecha de listo para entrega</label>
      <input id="fecha_listo" type="date" value={fechaListo} onChange={(e) => setFechaListo(e.target.value)} />

      <label htmlFor="verificado_por">Verificado por</label>
      <select id="verificado_por" value={verificadoPor} onChange={(e) => setVerificadoPor(e.target.value)}>
        <option value="">Sin verificar</option>
        {VERIFICADO_POR.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      <label htmlFor="fecha_notificacion">Fecha de notificación al cliente</label>
      <input id="fecha_notificacion" type="date" value={fechaNotificacion} onChange={(e) => setFechaNotificacion(e.target.value)} />

      <label htmlFor="fecha_entrega">Fecha de entrega al cliente</label>
      <input id="fecha_entrega" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />

      <label htmlFor="nombre_recibe">Nombre de quien recibe</label>
      <input id="nombre_recibe" type="text" value={nombreRecibe} onChange={(e) => setNombreRecibe(e.target.value)} placeholder="Opcional" />

      <label htmlFor="factura">Factura de repuesto o servicio</label>
      <input id="factura" type="text" value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Opcional" />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
        {loading ? "Guardando..." : "Guardar seguimiento"}
      </button>
    </form>
  );
}
