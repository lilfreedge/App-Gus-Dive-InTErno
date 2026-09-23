"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { calcularEstadoOrden } from "@/lib/ordenes-estado";
import { hoyISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

// "Status" (23-sep-2026, pedido explícito: "boton de 'en espera' ponerlo
// dentro de 'envio a'... 'envio a' cambiar por 'status' y dentro estará:
// 'En espera', 'Reparación'") -- reemplaza los dos controles separados
// que había antes (checkbox "En espera" + select "Envío a", que incluía
// "Prueba hidrostática" como opción manual). Por dentro sigue usando las
// mismas columnas de siempre -- en_espera/motivo_espera para "En
// espera", envio_a="Reparación" para el otro valor -- solo se unificó el
// control en pantalla.
const STATUS_OPCIONES = ["En espera", "Reparación"];
const VERIFICADO_POR = ["Pipe", "Gugi"];
const MEDIOS_NOTIFICACION = ["Llamada", "WhatsApp", "Correo", "Otro"];

export default function EditarSeguimientoForm({ orden, puedeVerificar = true }) {
  const supabase = createClient();

  // Prueba hidrostática (23-sep-2026, pedido explícito: "prueba
  // hidrostatica no debe de estar [en Status]... si al momento de
  // registrar equipo se le pone prueba hidrostatica pues por default
  // cuando se abra el seguimiento debe de aparecer 'fecha de envio'") --
  // ya no es un valor de Status: se activa sola según el servicio
  // elegido al registrar la orden (que_se_hara contiene "hidrostát"),
  // con su propia fecha de envío, independiente de la de Reparación.
  const esHidrostatica = (orden.que_se_hara || "").toLowerCase().includes("hidrostat");

  const statusInicial = orden.en_espera ? "En espera" : orden.envio_a === "Reparación" ? "Reparación" : "";
  const [status, setStatus] = useState(statusInicial);
  const [motivoEspera, setMotivoEspera] = useState(orden.motivo_espera || "");
  const [fechaEnvio, setFechaEnvio] = useState(orden.fecha_envio || "");
  const [fechaEnvioHidrostatica, setFechaEnvioHidrostatica] = useState(orden.fecha_envio_hidrostatica || "");
  const [fechaRetorno, setFechaRetorno] = useState(orden.fecha_retorno_tienda || "");
  // Inspección visual (23-sep-2026, pedido explícito) -- solo aplica a
  // órdenes de prueba hidrostática.
  const [inspeccionVisual, setInspeccionVisual] = useState(!!orden.inspeccion_visual_realizada);
  const [fechaListo, setFechaListo] = useState(orden.fecha_listo_entrega || "");
  const [verificadoPor, setVerificadoPor] = useState(orden.verificado_por || "");
  // Notificaciones al cliente (23-sep-2026, pedido explícito: "que se
  // ocurre para cuando por ejemplo notifiquemos a un mismo cliente 2
  // veces? agrega también via de notificacion" -- respuesta del usuario:
  // lista de notificaciones, cada una con fecha + medio) -- reemplaza el
  // campo de una sola fecha; se guarda como arreglo en
  // ordenes_equipos.notificaciones_cliente.
  const [notificaciones, setNotificaciones] = useState(orden.notificaciones_cliente || []);
  const [agregandoNotif, setAgregandoNotif] = useState(false);
  const [notifFecha, setNotifFecha] = useState(hoyISO());
  const [notifMedio, setNotifMedio] = useState(MEDIOS_NOTIFICACION[0]);
  const [fechaEntrega, setFechaEntrega] = useState(orden.fecha_entrega_cliente || "");
  const [nombreRecibe, setNombreRecibe] = useState(orden.nombre_recibe || "");
  const [factura, setFactura] = useState(orden.factura || "");
  const [repuestosUsados, setRepuestosUsados] = useState(orden.repuestos_usados || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onStatusChange(v) {
    setStatus(v);
    if (v !== "En espera") setMotivoEspera("");
    if (v !== "Reparación") setFechaEnvio("");
  }

  const muestraRetorno = status === "Reparación" || esHidrostatica;

  // Orden en que se va alimentando el seguimiento (pedido explícito,
  // 23-sep-2026: "no permitir escribir en verificado por si todavia no
  // hay fecha de entrega [de listo]. no permitir notificar cliente en
  // caso de que no se haya verificado aun la orden. no poner fecha de
  // entrega a cliente si todavia no se le ha puesto fecha de
  // notificacion. y asi sucesivamente") -- cada paso se habilita solo
  // cuando el anterior ya está lleno. Los campos ya guardados no se
  // borran si falta un paso anterior -- solo no se pueden EDITAR hasta
  // que se complete.
  const puedeEditarVerificado = puedeVerificar && !!fechaListo;
  const puedeAgregarNotif = !!verificadoPor;
  const puedeEditarEntrega = notificaciones.length > 0;
  const puedeEditarRecibe = !!fechaEntrega;

  function agregarNotificacion() {
    if (!notifFecha) return;
    setNotificaciones((prev) => [...prev, { fecha: notifFecha, medio: notifMedio }]);
    setAgregandoNotif(false);
    setNotifFecha(hoyISO());
    setNotifMedio(MEDIOS_NOTIFICACION[0]);
  }

  function quitarNotificacion(i) {
    setNotificaciones((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Repuestos utilizados: opcional mientras la orden sigue abierta,
    // pero obligatorio al momento de cerrarla (pedido explícito,
    // 23-sep-2026: "que este sea opcional llenarlo durante todo el
    // seguimiento pero que al momento de cerrar la orden, sea
    // mandatorio tener este espacio alimentado"). "Cerrar la orden" es
    // poner la fecha de entrega al cliente.
    if (fechaEntrega && !repuestosUsados.trim()) {
      setError("Antes de cerrar la orden (fecha de entrega al cliente), indica los repuestos utilizados -- si no se usó ninguno, escribe \"Ninguno\".");
      return;
    }

    setLoading(true);

    await registrarCambio(supabase, {
      tabla: "ordenes_equipos",
      registroId: orden.id,
      accion: "editar",
      datosAnteriores: orden,
    });

    const cambios = {
      en_espera: status === "En espera",
      motivo_espera: status === "En espera" ? motivoEspera.trim() || null : null,
      envio_a: status === "Reparación" ? "Reparación" : null,
      fecha_envio: status === "Reparación" ? fechaEnvio || null : null,
      fecha_envio_hidrostatica: esHidrostatica ? fechaEnvioHidrostatica || null : null,
      fecha_retorno_tienda: muestraRetorno ? fechaRetorno || null : null,
      inspeccion_visual_realizada: esHidrostatica ? inspeccionVisual : false,
      fecha_listo_entrega: fechaListo || null,
      verificado_por: puedeEditarVerificado ? verificadoPor || null : orden.verificado_por || null,
      notificaciones_cliente: notificaciones,
      // Se mantiene actualizada por compatibilidad con lo que ya hubiera
      // leído fecha_notificacion_cliente -- la fuente real ahora es la
      // lista de arriba.
      fecha_notificacion_cliente: notificaciones.length > 0 ? notificaciones[notificaciones.length - 1].fecha : null,
      fecha_entrega_cliente: puedeEditarEntrega ? fechaEntrega || null : null,
      nombre_recibe: puedeEditarRecibe ? nombreRecibe.trim() || null : orden.nombre_recibe || null,
      factura: factura.trim() || null,
      repuestos_usados: repuestosUsados.trim() || null,
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

    // Navegación dura (no router.push/refresh): la ficha es la misma
    // ruta de la que se vino hace un momento, y quedaba mostrando datos
    // viejos por el caché de rutas de Next -- esto fuerza a traerla
    // de nuevo del servidor, ya actualizada.
    window.location.href = `/app-clientes/ordenes/${orden.id}`;
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="status">Status</label>
      <select id="status" value={status} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="">Normal</option>
        {STATUS_OPCIONES.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      {status === "En espera" && (
        <>
          <label htmlFor="motivo_espera">Motivo</label>
          <input
            id="motivo_espera"
            type="text"
            value={motivoEspera}
            onChange={(e) => setMotivoEspera(e.target.value)}
            placeholder="Ej: esperando que lleguen piezas"
          />
        </>
      )}

      {status === "Reparación" && (
        <>
          <label htmlFor="fecha_envio">Fecha de envío</label>
          <input id="fecha_envio" type="date" value={fechaEnvio} onChange={(e) => setFechaEnvio(e.target.value)} />
        </>
      )}

      {esHidrostatica && (
        <>
          <label htmlFor="fecha_envio_hidrostatica">Fecha de envío a prueba hidrostática</label>
          <input
            id="fecha_envio_hidrostatica"
            type="date"
            value={fechaEnvioHidrostatica}
            onChange={(e) => setFechaEnvioHidrostatica(e.target.value)}
          />
        </>
      )}

      {muestraRetorno && (
        <>
          <label htmlFor="fecha_retorno">Fecha de retorno a tienda</label>
          <input id="fecha_retorno" type="date" value={fechaRetorno} onChange={(e) => setFechaRetorno(e.target.value)} />
        </>
      )}

      {esHidrostatica && (
        <>
          <div className="section-title" style={{ marginTop: 12, marginBottom: 4 }}>Inspección visual realizada</div>
          <label className="check-label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={inspeccionVisual}
              onChange={(e) => setInspeccionVisual(e.target.checked)}
              style={{ width: "auto" }}
            />
            Listo
          </label>
        </>
      )}

      <label htmlFor="fecha_listo">Fecha de listo para entrega</label>
      <input id="fecha_listo" type="date" value={fechaListo} onChange={(e) => setFechaListo(e.target.value)} />

      <label htmlFor="verificado_por">Verificado por</label>
      <select
        id="verificado_por"
        value={verificadoPor}
        onChange={(e) => setVerificadoPor(e.target.value)}
        disabled={!puedeEditarVerificado}
      >
        <option value="">Sin verificar</option>
        {VERIFICADO_POR.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
      {!puedeEditarVerificado && (
        <div className="hint-text">
          {!fechaListo
            ? "Completa primero \"Fecha de listo para entrega\"."
            : "Solo el Titular o un Administrador puede llenar esto."}
        </div>
      )}

      <label style={{ marginTop: 14 }}>Notificaciones al cliente</label>
      {notificaciones.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
          {notificaciones.map((n, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <span>{formatFechaDDMMAAAADeDate(n.fecha)} — {n.medio}</span>
              <button
                type="button"
                onClick={() => quitarNotificacion(i)}
                style={{ background: "none", border: "none", color: "var(--rojo)", cursor: "pointer", fontSize: 12.5, padding: 0 }}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
      {!agregandoNotif ? (
        <button
          type="button"
          className="btn secondary"
          disabled={!puedeAgregarNotif}
          onClick={() => setAgregandoNotif(true)}
          style={{ marginTop: 0, width: "auto" }}
        >
          + Agregar notificación
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
          <input type="date" value={notifFecha} onChange={(e) => setNotifFecha(e.target.value)} style={{ marginTop: 0, width: "auto" }} />
          <select value={notifMedio} onChange={(e) => setNotifMedio(e.target.value)} style={{ marginTop: 0, width: "auto" }}>
            {MEDIOS_NOTIFICACION.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={agregarNotificacion} style={{ marginTop: 0, width: "auto" }}>
            Agregar
          </button>
          <button type="button" className="btn secondary" onClick={() => setAgregandoNotif(false)} style={{ marginTop: 0, width: "auto" }}>
            Cancelar
          </button>
        </div>
      )}
      {!puedeAgregarNotif && <div className="hint-text">Completa primero &quot;Verificado por&quot;.</div>}

      <label htmlFor="fecha_entrega" style={{ marginTop: 14 }}>Fecha de entrega al cliente</label>
      <input
        id="fecha_entrega"
        type="date"
        value={fechaEntrega}
        onChange={(e) => setFechaEntrega(e.target.value)}
        disabled={!puedeEditarEntrega}
      />
      {!puedeEditarEntrega && <div className="hint-text">Registra primero una notificación al cliente.</div>}

      <label htmlFor="nombre_recibe">Nombre de quien recibe</label>
      <input
        id="nombre_recibe"
        type="text"
        value={nombreRecibe}
        onChange={(e) => setNombreRecibe(e.target.value)}
        placeholder="Opcional"
        disabled={!puedeEditarRecibe}
      />
      {!puedeEditarRecibe && <div className="hint-text">Completa primero &quot;Fecha de entrega al cliente&quot;.</div>}

      <label htmlFor="factura">Factura de repuesto o servicio</label>
      <input id="factura" type="text" value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Opcional" />

      {/* Repuestos utilizados, destacado (23-sep-2026, pedido explícito:
          "que se vea que es algo aparte, que llame la atención... que
          este sea opcional llenarlo durante todo el seguimiento pero
          que al momento de cerrar la orden, sea mandatorio") -- caja
          propia en vez de un campo más de la lista, justo antes de
          guardar. */}
      <div
        style={{
          marginTop: 20,
          background: "var(--superficie-suave)",
          border: "2px solid var(--azul-claro)",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <label htmlFor="repuestos_usados" style={{ marginTop: 0, fontWeight: 700, color: "var(--azul-claro)" }}>
          REPUESTOS UTILIZADOS
        </label>
        <textarea
          id="repuestos_usados"
          rows={3}
          value={repuestosUsados}
          onChange={(e) => setRepuestosUsados(e.target.value)}
          placeholder='Para que en tienda sepan qué cobrar al entregar. Opcional por ahora -- obligatorio al poner "Fecha de entrega al cliente" (escribe "Ninguno" si no se usó ninguno).'
        />
      </div>

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
        {loading ? "Guardando..." : "Guardar seguimiento"}
      </button>
    </form>
  );
}
