"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { calcularEstadoOrden, esServicioHidrostatica, esServicioReparacion } from "@/lib/ordenes-estado";
import { hoyISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

const VERIFICADO_POR = ["Pipe", "Gugi"];
const MEDIOS_NOTIFICACION = ["Llamada", "WhatsApp", "Correo", "Otro"];

// Botón "?" que revela un mensaje de validación al hacer click (item 3,
// pedido explícito, 26-sep-2026: "pon que no salga el mensaje y que solo
// salga si le hacen click, asi la seccion se ve mas limpia") -- antes esos
// mensajes ("Aún no puedes X porque falta Y") se mostraban siempre que el
// campo estaba deshabilitado.
function HintToggle({ mensaje }) {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ display: "inline-flex", flexDirection: "column" }}>
      <button
        type="button"
        className="hint-toggle-btn"
        onClick={() => setVisible((v) => !v)}
        aria-label="Por qué está deshabilitado"
        title="Por qué está deshabilitado"
      >
        ?
      </button>
      {visible && <span className="hint-text" style={{ marginTop: 4 }}>{mensaje}</span>}
    </span>
  );
}

export default function EditarSeguimientoForm({ orden, puedeVerificar = true }) {
  const supabase = createClient();

  // Prueba hidrostática y Reparación (26-sep-2026: "en cuanto al status,
  // quita esa seccion. quiero probar si sin eso podemos trabajar" -- el
  // selector manual "Status" desapareció por completo. Reparación pasa a
  // detectarse sola según el servicio (que_se_hara), exactamente igual a
  // como ya funcionaba Prueba hidrostática desde el 23-sep) -- las dos
  // tienen su propia fecha de envío, independiente entre sí, y comparten
  // "Fecha de retorno a tienda".
  //
  // BUG corregido (item 27, 27-sep-2026): esto comparaba con
  // `.toLowerCase().includes("hidrostat")` directo -- se rompía con el
  // nombre EXACTO del Catálogo de servicios, "Prueba Hidrostática" (con
  // tilde), porque toLowerCase() no le quita el acento a la "á". Ver
  // lib/ordenes-estado.js.
  const esHidrostatica = esServicioHidrostatica(orden.que_se_hara);
  const esReparacion = esServicioReparacion(orden.que_se_hara);
  const muestraRetorno = esReparacion || esHidrostatica;

  // "En espera" vuelve a ser un check independiente, separado de
  // Reparación (26-sep-2026, pedido explícito, tras quitar "Status": "con
  // relacion a lo que me dijiste de 'en espera' ok si ponle el check otra
  // vez") -- mismas columnas de siempre (en_espera/motivo_espera), antes
  // de que "Status" las uniera con Reparación en un solo control.
  const [enEspera, setEnEspera] = useState(!!orden.en_espera);
  const [motivoEspera, setMotivoEspera] = useState(orden.motivo_espera || "");
  // Fecha de envío a taller o proveedor (26-sep-2026, renombrado de
  // "Fecha de envío" -- pedido explícito: "cambiar fecha de envio por
  // 'fecha de envio a taller o proveedor'" -- mismo campo de siempre,
  // fecha_envio, solo cambió la etiqueta).
  const [fechaEnvio, setFechaEnvio] = useState(orden.fecha_envio || "");
  const [fechaEnvioHidrostatica, setFechaEnvioHidrostatica] = useState(orden.fecha_envio_hidrostatica || "");
  const [fechaRetorno, setFechaRetorno] = useState(orden.fecha_retorno_tienda || "");
  const [inspeccionVisual, setInspeccionVisual] = useState(!!orden.inspeccion_visual_realizada);
  const [fechaListo, setFechaListo] = useState(orden.fecha_listo_entrega || "");
  const [verificadoPor, setVerificadoPor] = useState(orden.verificado_por || "");
  const [notificaciones, setNotificaciones] = useState(orden.notificaciones_cliente || []);
  const [agregandoNotif, setAgregandoNotif] = useState(false);
  const [notifFecha, setNotifFecha] = useState(hoyISO());
  const [notifMedio, setNotifMedio] = useState(MEDIOS_NOTIFICACION[0]);
  const [notifNotas, setNotifNotas] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState(orden.fecha_entrega_cliente || "");
  const [nombreRecibe, setNombreRecibe] = useState(orden.nombre_recibe || "");
  const [factura, setFactura] = useState(orden.factura || "");
  // Repuestos utilizados (item 4, pedido explícito, 27-sep-2026: "No me
  // gusta [el selector del catálogo]. Ponlo que sea una seccion para
  // escribir los repuestos y que se vayan enlistando" -- mismo patrón que
  // "Notificaciones al cliente": se escribe uno, se agrega, y se va
  // enlistando con un "Quitar" por ítem. Se sigue guardando como el mismo
  // texto separado por comas de siempre (repuestos_usados), para no
  // necesitar una migración ni perder nada de lo ya guardado -- solo
  // cambia cómo se arma ese texto en pantalla.
  const [repuestos, setRepuestos] = useState(() =>
    (orden.repuestos_usados || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
  );
  const [nuevoRepuesto, setNuevoRepuesto] = useState("");
  // Notas del técnico sobre el regulador (item 12, pedido explícito:
  // "abajo de lo repuestos, agrega una seccion para que el tecnico ponga
  // notas del regulador, asi el tecnico puede poner alguna recomendacion
  // o nota para que el buzo lo tenga pendiente" -- visible al cliente,
  // en la ficha de la orden y en el reporte. Columna nueva,
  // notas_tecnico_regulador, ver migration_28.sql).
  const [notasTecnico, setNotasTecnico] = useState(orden.notas_tecnico_regulador || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Orden en que se va alimentando el seguimiento (pedido explícito,
  // 23-sep-2026: cada paso se habilita solo cuando el anterior ya está
  // lleno). Mensajes estandarizados (item 3, pedido explícito, 25-sep-2026:
  // "pon que aparezca algo como 'aun no puedes verificar porque no tiene
  // fecha de entrega' algo asi. para todo donde aplique").
  const puedeEditarVerificado = puedeVerificar && !!fechaListo;
  const puedeAgregarNotif = !!verificadoPor;
  const puedeEditarEntrega = notificaciones.length > 0;
  const puedeEditarRecibe = !!fechaEntrega;

  function agregarRepuesto() {
    const valor = nuevoRepuesto.trim();
    if (!valor) return;
    setRepuestos((prev) => [...prev, valor]);
    setNuevoRepuesto("");
  }

  function quitarRepuesto(i) {
    setRepuestos((prev) => prev.filter((_, idx) => idx !== i));
  }

  const repuestosUsadosFinal = repuestos.join(", ");

  function agregarNotificacion() {
    if (!notifFecha) return;
    setNotificaciones((prev) => [...prev, { fecha: notifFecha, medio: notifMedio, notas: notifNotas.trim() || null }]);
    setAgregandoNotif(false);
    setNotifFecha(hoyISO());
    setNotifMedio(MEDIOS_NOTIFICACION[0]);
    setNotifNotas("");
  }

  function quitarNotificacion(i) {
    setNotificaciones((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Repuestos utilizados: opcional mientras la orden sigue abierta,
    // pero obligatorio al momento de cerrarla (23-sep-2026, reconfirmado
    // funcionando el 25-sep-2026 -- "no permitir dar la orden por cerrada
    // si no tiene repuestos utilizados puestos").
    if (fechaEntrega && !repuestosUsadosFinal) {
      setError("Antes de cerrar la orden (fecha de entrega al cliente), indica los repuestos utilizados -- si no se usó ninguno, escribe \"Ninguno\".");
      return;
    }

    setLoading(true);

    const cambios = {
      en_espera: enEspera,
      motivo_espera: enEspera ? motivoEspera.trim() || null : null,
      envio_a: esReparacion ? "Reparación" : null,
      fecha_envio: esReparacion ? fechaEnvio || null : null,
      fecha_envio_hidrostatica: esHidrostatica ? fechaEnvioHidrostatica || null : null,
      fecha_retorno_tienda: muestraRetorno ? fechaRetorno || null : null,
      inspeccion_visual_realizada: esHidrostatica ? inspeccionVisual : false,
      fecha_listo_entrega: fechaListo || null,
      verificado_por: puedeEditarVerificado ? verificadoPor || null : orden.verificado_por || null,
      notificaciones_cliente: notificaciones,
      fecha_notificacion_cliente: notificaciones.length > 0 ? notificaciones[notificaciones.length - 1].fecha : null,
      fecha_entrega_cliente: puedeEditarEntrega ? fechaEntrega || null : null,
      nombre_recibe: puedeEditarRecibe ? nombreRecibe.trim() || null : orden.nombre_recibe || null,
      factura: factura.trim() || null,
      repuestos_usados: repuestosUsadosFinal || null,
      notas_tecnico_regulador: notasTecnico.trim() || null,
    };

    const nuevoEstado = calcularEstadoOrden({ ...orden, ...cambios });

    // datosNuevos (item 20): antes Y después, en el mismo registro del
    // historial.
    await registrarCambio(supabase, {
      tabla: "ordenes_equipos",
      registroId: orden.id,
      accion: "editar",
      datosAnteriores: orden,
      datosNuevos: { ...cambios, estado: nuevoEstado },
    });

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
      <label className="check-label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
        <input
          type="checkbox"
          checked={enEspera}
          onChange={(e) => setEnEspera(e.target.checked)}
          style={{ width: "auto" }}
        />
        En espera
      </label>
      {enEspera && (
        <input
          type="text"
          value={motivoEspera}
          onChange={(e) => setMotivoEspera(e.target.value)}
          placeholder="Motivo -- ej: esperando que lleguen piezas"
          style={{ marginTop: 6 }}
        />
      )}

      {esReparacion && (
        <>
          <label htmlFor="fecha_envio" style={{ marginTop: 14 }}>Fecha de envío a taller o proveedor</label>
          <input id="fecha_envio" type="date" value={fechaEnvio} onChange={(e) => setFechaEnvio(e.target.value)} />
        </>
      )}

      {esHidrostatica && (
        <>
          <label htmlFor="fecha_envio_hidrostatica" style={{ marginTop: 14 }}>Fecha de envío a prueba hidrostática</label>
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
          <label htmlFor="fecha_retorno" style={{ marginTop: 14 }}>Fecha de retorno a tienda</label>
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

      <label htmlFor="fecha_listo" style={{ marginTop: 14 }}>Fecha de listo para entrega</label>
      <input id="fecha_listo" type="date" value={fechaListo} onChange={(e) => setFechaListo(e.target.value)} />

      <label htmlFor="verificado_por" style={{ display: "flex", alignItems: "center" }}>
        Verificado por
        {!puedeEditarVerificado && (
          <HintToggle
            mensaje={
              !fechaListo
                ? "Aún no puedes verificar porque falta la fecha de listo para entrega."
                : "Solo el Titular o un Administrador puede llenar esto."
            }
          />
        )}
      </label>
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

      <label style={{ marginTop: 14 }}>Notificaciones al cliente</label>
      {notificaciones.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
          {notificaciones.map((n, i) => (
            <div key={i} style={{ fontSize: 13.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{formatFechaDDMMAAAADeDate(n.fecha)} — {n.medio}</span>
                <button
                  type="button"
                  onClick={() => quitarNotificacion(i)}
                  style={{ background: "none", border: "none", color: "var(--rojo)", cursor: "pointer", fontSize: 12.5, padding: 0 }}
                >
                  Quitar
                </button>
              </div>
              {n.notas && <div className="hint-text" style={{ marginTop: 0 }}>{n.notas}</div>}
            </div>
          ))}
        </div>
      )}
      {!agregandoNotif ? (
        <span style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            className="btn secondary"
            disabled={!puedeAgregarNotif}
            onClick={() => setAgregandoNotif(true)}
            style={{ marginTop: 0, width: "auto" }}
          >
            + Agregar notificación
          </button>
          {!puedeAgregarNotif && (
            <HintToggle mensaje="Aún no puedes agregar una notificación porque falta verificar la orden." />
          )}
        </span>
      ) : (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
          <input
            type="text"
            value={notifNotas}
            onChange={(e) => setNotifNotas(e.target.value)}
            placeholder="Notas (opcional)"
            style={{ marginTop: 8 }}
          />
        </div>
      )}

      <label htmlFor="fecha_entrega" style={{ marginTop: 14, display: "flex", alignItems: "center" }}>
        Fecha de entrega al cliente
        {!puedeEditarEntrega && (
          <HintToggle mensaje="Aún no puedes poner la fecha de entrega porque falta registrar una notificación al cliente." />
        )}
      </label>
      <input
        id="fecha_entrega"
        type="date"
        value={fechaEntrega}
        onChange={(e) => setFechaEntrega(e.target.value)}
        disabled={!puedeEditarEntrega}
      />

      <label htmlFor="nombre_recibe" style={{ display: "flex", alignItems: "center" }}>
        Nombre de quien recibe
        {!puedeEditarRecibe && (
          <HintToggle mensaje="Aún no puedes anotar quién recibe porque falta la fecha de entrega al cliente." />
        )}
      </label>
      <input
        id="nombre_recibe"
        type="text"
        value={nombreRecibe}
        onChange={(e) => setNombreRecibe(e.target.value)}
        placeholder="Opcional"
        disabled={!puedeEditarRecibe}
      />

      <label htmlFor="factura">Factura de repuesto o servicio</label>
      <input id="factura" type="text" value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Opcional" />

      {/* Repuestos utilizados, destacado (23-sep-2026: caja propia; 27-sep-2026,
          item 4, pedido explícito tras probar el selector del catálogo en
          vivo: "No me gusta. Ponlo que sea una seccion para escribir los
          repuestos y que se vayan enlistando" -- mismo patrón que
          Notificaciones al cliente: se escribe uno, se agrega, se enlista
          con "Quitar" por ítem). */}
      <div
        style={{
          marginTop: 20,
          background: "var(--superficie-suave)",
          border: "2px solid var(--azul-claro)",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <label style={{ marginTop: 0, fontWeight: 700, color: "var(--azul-claro)" }}>
          REPUESTOS UTILIZADOS
        </label>
        {repuestos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, marginBottom: 10 }}>
            {repuestos.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                <span>{r}</span>
                <button
                  type="button"
                  onClick={() => quitarRepuesto(i)}
                  style={{ background: "none", border: "none", color: "var(--rojo)", cursor: "pointer", fontSize: 12.5, padding: 0 }}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            type="text"
            value={nuevoRepuesto}
            onChange={(e) => setNuevoRepuesto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarRepuesto();
              }
            }}
            placeholder="Nombre del repuesto"
            style={{ marginTop: 0 }}
          />
          <button type="button" className="btn secondary" onClick={agregarRepuesto} style={{ marginTop: 0, width: "auto" }}>
            + Agregar
          </button>
        </div>
        {repuestos.length === 0 && (
          <div className="hint-text">
            Obligatorio al poner &quot;Fecha de entrega al cliente&quot; -- si no se usó ninguno, agrega &quot;Ninguno&quot;.
          </div>
        )}
      </div>

      {/* Notas del técnico sobre el regulador (item 12, pedido explícito
          25-sep-2026): recomendación o pendiente para el buzo, visible en
          la ficha de la orden y en el reporte. */}
      <div style={{ marginTop: 14 }}>
        <label htmlFor="notas_tecnico">Notas del técnico sobre el regulador</label>
        <textarea
          id="notas_tecnico"
          rows={2}
          value={notasTecnico}
          onChange={(e) => setNotasTecnico(e.target.value)}
          placeholder="Opcional -- alguna recomendación o pendiente para que el buzo lo tenga en cuenta"
        />
      </div>

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
        {loading ? "Guardando..." : "Guardar seguimiento"}
      </button>
    </form>
  );
}
