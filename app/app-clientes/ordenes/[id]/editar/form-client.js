"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { calcularEstadoOrden, esServicioHidrostatica, esServicioReparacion } from "@/lib/ordenes-estado";
import { hoyISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { TIPOS_HOLD, holdActivo, diasEnHold, resumenHold, crearHold, resolverHold, labelTipoHold } from "@/lib/holds";

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

export default function EditarSeguimientoForm({ orden, puedeVerificar = true, piezas = [] }) {
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

  // "Hold" (27-sep-2026, reemplaza el check "En espera" -- ver
  // lib/holds.js para el diseño completo). `holds` guarda el historial
  // completo (activo + resueltos) en un solo jsonb array, igual que
  // notificaciones_cliente -- se muta en memoria y se guarda todo junto
  // al hacer "Guardar seguimiento", como ya hacen Notificaciones y
  // Repuestos.
  const [holds, setHolds] = useState(orden.holds || []);
  const hold = holdActivo(holds);

  const [holdModalAbierto, setHoldModalAbierto] = useState(false);
  const [holdTipo, setHoldTipo] = useState("cambio_componente");
  const [holdComponente, setHoldComponente] = useState("");
  const [holdMotivo, setHoldMotivo] = useState("");
  const [holdError, setHoldError] = useState("");

  const [decisionSel, setDecisionSel] = useState("");
  const [decisionNota, setDecisionNota] = useState("");

  // Bitácora de la orden (visible a cualquiera con acceso a la app, no
  // solo Titular -- pedido explícito: "si, que la pueda ver quien sea por
  // ahora") -- un renglón por cada Hold resuelto y por cada repuesto
  // "autorizado" que se elimina.
  const [bitacora, setBitacora] = useState(orden.bitacora_orden || []);

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
  // enlistando con un "Quitar" por ítem. Cada repuesto ahora es un objeto
  // { nombre, origen } (27-sep-2026, feature Hold) -- "origen" distingue
  // los que se escribieron a mano ("manual") de los que llegaron
  // autorizados por el cliente desde un Hold ("autorizado", ver
  // resolverHoldActivo más abajo). Si la orden ya trae repuestos_usados_
  // detalle (columna nueva) se usa eso; si no, se reconstruye desde el
  // texto de siempre (repuestos_usados) asumiendo que todo lo ya guardado
  // se escribió a mano -- no hay manera de saber su origen retroactivo.
  const [repuestos, setRepuestos] = useState(() => {
    if (Array.isArray(orden.repuestos_usados_detalle) && orden.repuestos_usados_detalle.length > 0) {
      return orden.repuestos_usados_detalle;
    }
    return (orden.repuestos_usados || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((nombre) => ({ nombre, origen: "manual" }));
  });
  const [nuevoRepuesto, setNuevoRepuesto] = useState("");
  // Quitar un repuesto "autorizado" pide motivo (pedido explícito: "el
  // motivo es cuando es algo que se puso con autorizacion del cliente.
  // porque hay todo un proceso detras de eso") -- se queda anotado en la
  // Bitácora. Uno "manual" se quita libre, como siempre.
  const [repuestoAEliminar, setRepuestoAEliminar] = useState(null); // índice, o null si no hay modal abierto
  const [motivoEliminarRepuesto, setMotivoEliminarRepuesto] = useState("");
  const [motivoEliminarError, setMotivoEliminarError] = useState(false);
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

  function abrirHoldModal() {
    setHoldTipo("cambio_componente");
    setHoldComponente("");
    setHoldMotivo("");
    setHoldError("");
    setHoldModalAbierto(true);
  }

  function cerrarHoldModal() {
    setHoldModalAbierto(false);
  }

  function confirmarHold() {
    if (holdTipo === "cambio_componente" && !holdComponente.trim()) {
      setHoldError("Indica qué hay que cambiar.");
      return;
    }
    if (holdTipo === "otro" && !holdMotivo.trim()) {
      setHoldError("Indica el motivo.");
      return;
    }
    const nuevo = crearHold({ tipo: holdTipo, componente: holdComponente, motivo: holdMotivo });
    setHolds((prev) => [...prev, nuevo]);
    setHoldModalAbierto(false);
  }

  // "Decisión del cliente" (Sí/No + nota opcional) resuelve el Hold --
  // no hay un botón aparte de "Quitar de Hold" (pedido explícito: llenar
  // la decisión ya lo saca de espera solo, y la orden vuelve a figurar
  // como pendiente por trabajar según calcularEstadoOrden, como siempre).
  function resolverHoldActivo() {
    if (!hold || !decisionSel) return;

    const resuelto = resolverHold(hold, { decision: decisionSel, decisionNota });
    setHolds((prev) => prev.map((h) => (h.id === hold.id ? resuelto : h)));

    // Autorización de cambio de componente -> se agrega solo a Repuestos
    // utilizados, marcado como "autorizado" (pedido explícito: "siii,
    // buenisimo").
    if (hold.tipo === "cambio_componente" && decisionSel === "si" && hold.componente) {
      setRepuestos((prev) => [...prev, { nombre: hold.componente, origen: "autorizado", holdId: hold.id }]);
    }

    setBitacora((prev) => [
      {
        fecha: hoyISO(),
        tipo: "hold_resuelto",
        texto: `${labelTipoHold(hold.tipo)} — ${resumenHold(hold)}`,
        detalle: `Decisión del cliente: ${decisionSel === "si" ? "Sí" : "No"}${
          decisionNota.trim() ? ` — ${decisionNota.trim()}` : ""
        }`,
      },
      ...prev,
    ]);

    setDecisionSel("");
    setDecisionNota("");
  }

  function agregarRepuesto() {
    const valor = nuevoRepuesto.trim();
    if (!valor) return;
    setRepuestos((prev) => [...prev, { nombre: valor, origen: "manual" }]);
    setNuevoRepuesto("");
  }

  function quitarRepuesto(i) {
    const item = repuestos[i];
    if (item?.origen === "autorizado") {
      setRepuestoAEliminar(i);
      setMotivoEliminarRepuesto("");
      setMotivoEliminarError(false);
      return;
    }
    setRepuestos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function cancelarEliminarRepuesto() {
    setRepuestoAEliminar(null);
  }

  function confirmarEliminarRepuestoAutorizado() {
    const motivoLimpio = motivoEliminarRepuesto.trim();
    if (!motivoLimpio) {
      setMotivoEliminarError(true);
      return;
    }
    const nombre = repuestos[repuestoAEliminar]?.nombre;
    setRepuestos((prev) => prev.filter((_, idx) => idx !== repuestoAEliminar));
    setBitacora((prev) => [
      { fecha: hoyISO(), tipo: "repuesto_eliminado", texto: `Repuesto autorizado eliminado: ${nombre}`, detalle: motivoLimpio },
      ...prev,
    ]);
    setRepuestoAEliminar(null);
  }

  const repuestosUsadosFinal = repuestos.map((r) => r.nombre).join(", ");

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

    // No permitir una fecha de envío (a taller/proveedor o a prueba
    // hidrostática) anterior a la fecha de ingreso de la orden -- no tiene
    // sentido que salga de la tienda antes de haber llegado (item 6,
    // pedido explícito, 27-sep-2026: "No permitir poner fecha de envio
    // anterior a la fecha de ingreso de la orden... aplica igual" para
    // las dos fechas de envío). Comparación de texto ISO (YYYY-MM-DD)
    // funciona igual que comparar fechas reales.
    if (esReparacion && fechaEnvio && fechaEnvio < orden.fecha) {
      setError("La fecha de envío a taller o proveedor no puede ser anterior a la fecha de ingreso de la orden.");
      return;
    }
    if (esHidrostatica && fechaEnvioHidrostatica && fechaEnvioHidrostatica < orden.fecha) {
      setError("La fecha de envío a prueba hidrostática no puede ser anterior a la fecha de ingreso de la orden.");
      return;
    }

    // Repuestos utilizados: opcional mientras la orden sigue abierta,
    // pero obligatorio al momento de cerrarla (23-sep-2026, reconfirmado
    // funcionando el 25-sep-2026 -- "no permitir dar la orden por cerrada
    // si no tiene repuestos utilizados puestos").
    if (fechaEntrega && !repuestosUsadosFinal) {
      setError("Antes de cerrar la orden (fecha de entrega al cliente), indica los repuestos utilizados -- si no se usó ninguno, escribe \"Ninguno\".");
      return;
    }

    setLoading(true);

    const activo = holdActivo(holds);

    const cambios = {
      // "En espera" ya no es un check de siempre -- se deriva del Hold
      // activo (ver lib/holds.js), pero se sigue guardando en las mismas
      // columnas de siempre para que nada de lo que ya las lee (Inicio,
      // lib/notificaciones.js, la ficha) necesite cambiar.
      en_espera: !!activo,
      motivo_espera: activo ? resumenHold(activo) : null,
      holds,
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
      repuestos_usados_detalle: repuestos,
      bitacora_orden: bitacora,
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
      {/* "Hold" (27-sep-2026, reemplaza el check "En espera" -- ver
          lib/holds.js). Sin hold activo: solo el botón para abrir uno.
          Con hold activo: caja destacada con el detalle y la "Decisión
          del cliente" que lo resuelve. */}
      {!hold ? (
        <button type="button" className="btn secondary" onClick={abrirHoldModal} style={{ marginTop: 0, width: "auto" }}>
          Poner en Hold
        </button>
      ) : (
        <div
          style={{
            background: "var(--error-fondo)",
            border: "2px solid var(--rojo)",
            borderRadius: 10,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--rojo)" }}>
            EN HOLD — {labelTipoHold(hold.tipo)}
          </div>
          <div style={{ fontSize: 14.5, marginTop: 4 }}>
            {hold.tipo === "cambio_componente" ? (
              <>
                Cambiar: <strong>{hold.componente}</strong>
                {hold.motivo && ` — ${hold.motivo}`}
              </>
            ) : (
              hold.motivo
            )}
          </div>
          <div className="hint-text" style={{ marginTop: 4 }}>
            Desde el {formatFechaDDMMAAAADeDate(hold.fecha_inicio)} ({diasEnHold(hold)} día{diasEnHold(hold) === 1 ? "" : "s"} en Hold)
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ marginTop: 0 }}>
              {hold.tipo === "cambio_componente" ? "¿El cliente autoriza el cambio?" : "Decisión del cliente"}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={decisionSel === "si" ? "btn btn-primary" : "btn secondary"}
                onClick={() => setDecisionSel("si")}
                style={{ marginTop: 0, width: "auto" }}
              >
                Sí
              </button>
              <button
                type="button"
                className={decisionSel === "no" ? "btn btn-primary" : "btn secondary"}
                onClick={() => setDecisionSel("no")}
                style={{ marginTop: 0, width: "auto" }}
              >
                No
              </button>
            </div>
            <input
              type="text"
              value={decisionNota}
              onChange={(e) => setDecisionNota(e.target.value)}
              placeholder="Nota (opcional)"
              style={{ marginTop: 8 }}
            />
            <button
              type="button"
              className="btn secondary"
              disabled={!decisionSel}
              onClick={resolverHoldActivo}
              style={{ marginTop: 8, width: "auto" }}
            >
              Guardar decisión y salir de Hold
            </button>
          </div>
        </div>
      )}

      {holdModalAbierto && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarHoldModal();
          }}
        >
          <div className="modal-panel">
            <div className="modal-title">Poner en Hold</div>

            <label style={{ marginTop: 14 }}>Motivo</label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {TIPOS_HOLD.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={holdTipo === t.id ? "btn btn-primary" : "btn secondary"}
                  onClick={() => setHoldTipo(t.id)}
                  style={{ marginTop: 0, width: "auto", flex: 1, fontSize: 12.5 }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {holdTipo === "cambio_componente" ? (
              <>
                <label style={{ marginTop: 12 }}>
                  ¿Qué hay que cambiar? <span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={holdComponente}
                  onChange={(e) => setHoldComponente(e.target.value)}
                  placeholder="Ej: Kit de segunda etapa"
                  list="piezas-catalogo"
                  autoFocus
                />
                <label style={{ marginTop: 10 }}>¿Por qué? (opcional)</label>
                <textarea
                  rows={2}
                  value={holdMotivo}
                  onChange={(e) => setHoldMotivo(e.target.value)}
                  placeholder="Qué se encontró al revisar el equipo (opcional)"
                />
              </>
            ) : (
              <>
                <label style={{ marginTop: 12 }}>
                  Motivo <span className="req">*</span>
                </label>
                <textarea
                  rows={3}
                  value={holdMotivo}
                  onChange={(e) => setHoldMotivo(e.target.value)}
                  placeholder="Explica por qué queda en espera"
                  autoFocus
                />
              </>
            )}

            {holdError && <div className="error-msg">⚠ {holdError}</div>}

            <div className="modal-actions">
              <button className="btn secondary" type="button" onClick={cerrarHoldModal}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="button" onClick={confirmarHold}>
                Poner en Hold
              </button>
            </div>
          </div>
        </div>
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
          con "Quitar" por ítem. Los "autorizado" (llegaron de un Hold, ver
          arriba) muestran una etiqueta aparte y piden motivo al quitarlos). */}
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
                <span>
                  {r.nombre}
                  {r.origen === "autorizado" && (
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "var(--azul-claro)" }}>(autorizado)</span>
                  )}
                </span>
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
            list="piezas-catalogo"
          />
          <button type="button" className="btn secondary" onClick={agregarRepuesto} style={{ marginTop: 0, width: "auto" }}>
            + Agregar
          </button>
        </div>
        {/* Sugerencias desde el catálogo de Piezas y repuestos (item 4,
            pedido explícito, 27-sep-2026: "que ayude a escribir lo que
            tenemos en base de datos. Asi como texto libre no me
            funciona") -- <datalist> nativo: sugiere mientras se escribe,
            pero sigue dejando escribir algo que no esté en el catálogo. */}
        <datalist id="piezas-catalogo">
          {piezas.map((p) => (
            <option key={p.id} value={p.nombre} />
          ))}
        </datalist>
        {repuestos.length === 0 && (
          <div className="hint-text">
            Obligatorio al poner &quot;Fecha de entrega al cliente&quot; -- si no se usó ninguno, agrega &quot;Ninguno&quot;.
          </div>
        )}
      </div>

      {repuestoAEliminar !== null && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelarEliminarRepuesto();
          }}
        >
          <div className="modal-panel">
            <div className="modal-title">Quitar repuesto autorizado</div>
            <div className={motivoEliminarError ? "field-error" : ""}>
              <label style={{ marginTop: 14 }}>
                Motivo <span className="req">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Por qué se quita este repuesto autorizado"
                value={motivoEliminarRepuesto}
                onChange={(e) => {
                  setMotivoEliminarRepuesto(e.target.value);
                  if (motivoEliminarError && e.target.value.trim()) setMotivoEliminarError(false);
                }}
                autoFocus
              />
              {motivoEliminarError && <div className="error-msg">⚠ Este campo es obligatorio</div>}
            </div>
            <div className="modal-actions">
              <button className="btn secondary" onClick={cancelarEliminarRepuesto} type="button">
                Cancelar
              </button>
              <button className="btn danger" onClick={confirmarEliminarRepuestoAutorizado} type="button">
                Quitar
              </button>
            </div>
          </div>
        </div>
      )}

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
