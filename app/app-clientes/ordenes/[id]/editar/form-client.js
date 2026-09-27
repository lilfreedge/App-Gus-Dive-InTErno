"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { calcularEstadoOrden, esServicioHidrostatica, esServicioReparacion } from "@/lib/ordenes-estado";
import { hoyISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import {
  holdActivo,
  diasEnHold,
  resumenHold,
  detalleHold,
  crearHold,
  resolverHold,
  labelTipoHold,
  textoAutorizacionHold,
} from "@/lib/holds";
import { useDenegado } from "@/lib/useDenegado";
import { IconLock, IconCheck } from "@/components/icons";

const VERIFICADO_POR = ["Pipe", "Gugi"];
const MEDIOS_NOTIFICACION = ["Llamada", "WhatsApp", "Correo", "Otro"];

// Rediseño completo de "Actualizar estado de orden" (wizard, ronda grande
// de feedback, 27-sep-2026) -- mockup aprobado ("nítido") en
// Main.dc.html. Reemplaza el formulario de un solo bloque con un botón
// "Guardar seguimiento" al final por una cadena de pasos que se van
// desbloqueando uno a uno, cada uno con su propio "Guardar y continuar"
// que graba en la base de datos DE INMEDIATO (no hay un botón maestro de
// guardar -- así lo mostraba el mockup aprobado). Reúne, todo en esta
// misma pantalla:
//   - Item 34: validación en cadena (cada paso se habilita solo cuando el
//     anterior ya está guardado).
//   - Item 32: "Fecha de entrega al cliente" depende de "Verificado por",
//     ya no de las notificaciones.
//   - Item 43 (pedido explícito, mid-flow): "Nombre de quien recibe" y
//     "Factura de repuesto o servicio" pasan de opcionales a obligatorios
//     antes de cerrar la orden -- por eso quedan unidos con "Fecha de
//     entrega al cliente" en un solo paso ("Cierre de la orden"): no se
//     puede guardar la fecha de entrega sin los tres datos completos.
//   - Item 33: modal de Hold unificado (una sola pregunta obligatoria +
//     código de pieza opcional, ver lib/holds.js).
//   - Item 31: con un Hold activo, todo el Seguimiento queda bloqueado
//     EXCEPTO Repuestos utilizados (siempre disponible, como en el
//     mockup).
//   - Item 45: los pasos bloqueados no usan el atributo `disabled`
//     nativo -- son clickeables, y el click muestra el motivo + una
//     sacudida ("click denegado", ver lib/useDenegado.js) en vez de no
//     hacer nada.
export default function EditarSeguimientoForm({ orden, puedeVerificar = true, piezas = [] }) {
  const supabase = createClient();
  const denegado = useDenegado();

  const esHidrostatica = esServicioHidrostatica(orden.que_se_hara);
  const esReparacion = esServicioReparacion(orden.que_se_hara);
  const muestraRetorno = esReparacion || esHidrostatica;

  // `ordenLocal` es la única fuente de verdad de lo que YA está guardado
  // en la base de datos -- se actualiza justo después de cada guardado
  // exitoso (ver guardarCampos). De ahí salen tanto los valores mostrados
  // como si cada paso está "hecho" o no.
  const [ordenLocal, setOrdenLocal] = useState(() => ({
    ...orden,
    holds: orden.holds || [],
    bitacora_orden: orden.bitacora_orden || [],
    notificaciones_cliente: orden.notificaciones_cliente || [],
    repuestos_usados_detalle:
      Array.isArray(orden.repuestos_usados_detalle) && orden.repuestos_usados_detalle.length > 0
        ? orden.repuestos_usados_detalle
        : (orden.repuestos_usados || "")
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean)
            .map((nombre) => ({ nombre, origen: "manual" })),
  }));

  const hold = holdActivo(ordenLocal.holds);

  // Valores en edición de cada paso simple (fecha/select/checkbox), por
  // id de paso -- separados de ordenLocal para que escribir en un campo
  // no "adelante" la cadena hasta que de verdad se guarde (item 34).
  const [drafts, setDrafts] = useState({});
  const [editando, setEditando] = useState(null); // id del paso "Hecho" reabierto para editar, o null
  const [explicado, setExplicado] = useState(null); // id del paso bloqueado cuya explicación está visible
  const [guardandoPaso, setGuardandoPaso] = useState(null);
  const [erroresPaso, setErroresPaso] = useState({});

  function draftDe(id, actual) {
    return drafts[id] !== undefined ? drafts[id] : actual ?? "";
  }
  function setDraft(id, valor) {
    setDrafts((d) => ({ ...d, [id]: valor }));
  }
  function abrirEdicion(id, valorActual) {
    setDrafts((d) => ({ ...d, [id]: valorActual }));
    setErroresPaso((e) => ({ ...e, [id]: "" }));
    setEditando(id);
  }
  function clickBloqueado(id) {
    denegado.denegar(id);
    setExplicado((cur) => (cur === id ? null : id));
  }

  // Guarda cambios de inmediato (item 35: auto-guardado por paso) --
  // recalcula el estado solo, según lib/ordenes-estado.js, y deja anotado
  // el cambio en el historial con antes/después (item 20).
  async function guardarCampos(cambiosParciales) {
    const datosAnteriores = ordenLocal;
    const combinado = { ...ordenLocal, ...cambiosParciales };
    const nuevoEstado = calcularEstadoOrden(combinado);
    const cambiosFinal = { ...cambiosParciales, estado: nuevoEstado, updated_at: new Date().toISOString() };

    await registrarCambio(supabase, {
      tabla: "ordenes_equipos",
      registroId: orden.id,
      accion: "editar",
      datosAnteriores,
      datosNuevos: { ...combinado, estado: nuevoEstado },
    });

    const { error: err } = await supabase.from("ordenes_equipos").update(cambiosFinal).eq("id", orden.id);
    if (err) throw err;

    setOrdenLocal((prev) => ({ ...prev, ...cambiosFinal }));
  }

  async function guardarPasoSimple(id, campos) {
    setGuardandoPaso(id);
    setErroresPaso((e) => ({ ...e, [id]: "" }));
    try {
      await guardarCampos(campos);
      setEditando(null);
      setDrafts((d) => {
        const nuevo = { ...d };
        delete nuevo[id];
        return nuevo;
      });
    } catch (e) {
      setErroresPaso((er) => ({ ...er, [id]: "No se pudo guardar. Intenta de nuevo." }));
    } finally {
      setGuardandoPaso(null);
    }
  }

  // ---------------------------------------------------------------
  // Hold (item 33: modal unificado -- una consulta obligatoria + código
  // de pieza opcional; ver lib/holds.js para la retrocompatibilidad con
  // Holds guardados antes de este cambio).
  // ---------------------------------------------------------------
  const [holdModalAbierto, setHoldModalAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [codigo, setCodigo] = useState("");
  const [holdError, setHoldError] = useState("");
  const [guardandoHold, setGuardandoHold] = useState(false);

  const [decisionSel, setDecisionSel] = useState("");
  const [decisionNota, setDecisionNota] = useState("");

  function abrirHoldModal() {
    setConsulta("");
    setCodigo("");
    setHoldError("");
    setHoldModalAbierto(true);
  }

  function cerrarHoldModal() {
    setHoldModalAbierto(false);
  }

  async function confirmarHold() {
    if (!consulta.trim()) {
      setHoldError("Escribe la consulta para el cliente.");
      return;
    }
    const nuevo = crearHold({ consulta, codigo });
    setGuardandoHold(true);
    setHoldError("");
    try {
      await guardarCampos({
        holds: [...ordenLocal.holds, nuevo],
        en_espera: true,
        motivo_espera: resumenHold(nuevo),
      });
      setHoldModalAbierto(false);
    } catch (e) {
      setHoldError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardandoHold(false);
    }
  }

  // "Decisión del cliente" (Sí/No + nota opcional) resuelve el Hold y
  // saca la orden de espera sola -- no hay un botón aparte de "Quitar de
  // Hold".
  async function resolverHoldActivo() {
    if (!hold || !decisionSel) {
      denegado.denegar("resolverHold");
      return;
    }
    setGuardandoHold(true);
    setHoldError("");
    try {
      const resuelto = resolverHold(hold, { decision: decisionSel, decisionNota });
      const holdsNuevo = ordenLocal.holds.map((h) => (h.id === hold.id ? resuelto : h));

      // Autorización -> se agrega solo a Repuestos utilizados, marcado
      // "autorizado" (pedido explícito: "siii, buenisimo"). Funciona con
      // Holds viejos y nuevos (textoAutorizacionHold es shape-aware).
      const repuestosNuevo =
        decisionSel === "si"
          ? [...ordenLocal.repuestos_usados_detalle, { nombre: textoAutorizacionHold(hold), origen: "autorizado", holdId: hold.id }]
          : ordenLocal.repuestos_usados_detalle;

      const bitacoraNuevo = [
        {
          fecha: hoyISO(),
          tipo: "hold_resuelto",
          // detalleHold() en vez de resumenHold() (pedido explícito,
          // mid-flow, con captura de pantalla de la Bitácora: "que
          // aparezca todo el detalle") -- resumenHold() es a propósito
          // corto (para el badge) y se comía el código/motivo opcional.
          texto: `${labelTipoHold(hold)} — ${detalleHold(hold)}`,
          detalle: `Decisión del cliente: ${decisionSel === "si" ? "Sí" : "No"}${
            decisionNota.trim() ? ` — ${decisionNota.trim()}` : ""
          }`,
          fecha_inicio_hold: hold.fecha_inicio,
        },
        ...ordenLocal.bitacora_orden,
      ];

      await guardarCampos({
        holds: holdsNuevo,
        en_espera: false,
        motivo_espera: null,
        repuestos_usados_detalle: repuestosNuevo,
        repuestos_usados: repuestosNuevo.map((r) => r.nombre).join(", ") || null,
        bitacora_orden: bitacoraNuevo,
      });

      setDecisionSel("");
      setDecisionNota("");
    } catch (e) {
      setHoldError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardandoHold(false);
    }
  }

  // ---------------------------------------------------------------
  // Repuestos utilizados -- siempre disponible, con o sin Hold activo
  // (item 31). Cada Agregar/Quitar se guarda de inmediato.
  // ---------------------------------------------------------------
  const repuestos = ordenLocal.repuestos_usados_detalle;
  const [nuevoRepuesto, setNuevoRepuesto] = useState("");
  const [guardandoRepuestos, setGuardandoRepuestos] = useState(false);
  const [repuestoAEliminar, setRepuestoAEliminar] = useState(null);
  const [motivoEliminarRepuesto, setMotivoEliminarRepuesto] = useState("");
  const [motivoEliminarError, setMotivoEliminarError] = useState(false);

  async function guardarRepuestos(listaNueva, cambiosExtra = {}) {
    setGuardandoRepuestos(true);
    try {
      await guardarCampos({
        repuestos_usados_detalle: listaNueva,
        repuestos_usados: listaNueva.map((r) => r.nombre).join(", ") || null,
        ...cambiosExtra,
      });
    } finally {
      setGuardandoRepuestos(false);
    }
  }

  async function agregarRepuesto() {
    const valor = nuevoRepuesto.trim();
    if (!valor) return;
    setNuevoRepuesto("");
    await guardarRepuestos([...repuestos, { nombre: valor, origen: "manual" }]);
  }

  function quitarRepuesto(i) {
    const item = repuestos[i];
    if (item?.origen === "autorizado") {
      setRepuestoAEliminar(i);
      setMotivoEliminarRepuesto("");
      setMotivoEliminarError(false);
      return;
    }
    guardarRepuestos(repuestos.filter((_, idx) => idx !== i));
  }

  function cancelarEliminarRepuesto() {
    setRepuestoAEliminar(null);
  }

  async function confirmarEliminarRepuestoAutorizado() {
    const motivoLimpio = motivoEliminarRepuesto.trim();
    if (!motivoLimpio) {
      setMotivoEliminarError(true);
      return;
    }
    const nombre = repuestos[repuestoAEliminar]?.nombre;
    const listaNueva = repuestos.filter((_, idx) => idx !== repuestoAEliminar);
    const bitacoraNuevo = [
      { fecha: hoyISO(), tipo: "repuesto_eliminado", texto: `Repuesto autorizado eliminado: ${nombre}`, detalle: motivoLimpio },
      ...ordenLocal.bitacora_orden,
    ];
    setRepuestoAEliminar(null);
    await guardarRepuestos(listaNueva, { bitacora_orden: bitacoraNuevo });
  }

  // ---------------------------------------------------------------
  // Cadena de pasos (item 34). "Hecho" se lee directo de ordenLocal --
  // no hace falta una bandera aparte: si el campo tiene valor, el paso
  // ya está guardado.
  // ---------------------------------------------------------------
  const envioReparacionHecho = !!ordenLocal.fecha_envio;
  const envioHidrostaticaHecho = !!ordenLocal.fecha_envio_hidrostatica;

  let retornoDesbloqueado = true;
  if (esReparacion && esHidrostatica) retornoDesbloqueado = envioReparacionHecho && envioHidrostaticaHecho;
  else if (esReparacion) retornoDesbloqueado = envioReparacionHecho;
  else if (esHidrostatica) retornoDesbloqueado = envioHidrostaticaHecho;
  const retornoHecho = !!ordenLocal.fecha_retorno_tienda;

  const listoDesbloqueado = muestraRetorno ? retornoHecho : true;
  const listoHecho = !!ordenLocal.fecha_listo_entrega;

  const verificadoDesbloqueado = listoHecho;
  const verificadoHecho = !!ordenLocal.verificado_por;

  const notifCierreDesbloqueado = verificadoHecho;

  const cierreHecho = !!ordenLocal.fecha_entrega_cliente;

  function guardarEnvioReparacion() {
    const valor = draftDe("envio_reparacion", "").trim();
    if (!valor) {
      setErroresPaso((e) => ({ ...e, envio_reparacion: "Indica la fecha de envío." }));
      return;
    }
    if (valor < orden.fecha) {
      setErroresPaso((e) => ({ ...e, envio_reparacion: "No puede ser anterior a la fecha de ingreso de la orden." }));
      return;
    }
    guardarPasoSimple("envio_reparacion", { fecha_envio: valor, envio_a: "Reparación" });
  }

  function guardarEnvioHidrostatica() {
    const valor = draftDe("envio_hidrostatica", "").trim();
    if (!valor) {
      setErroresPaso((e) => ({ ...e, envio_hidrostatica: "Indica la fecha de envío." }));
      return;
    }
    if (valor < orden.fecha) {
      setErroresPaso((e) => ({ ...e, envio_hidrostatica: "No puede ser anterior a la fecha de ingreso de la orden." }));
      return;
    }
    guardarPasoSimple("envio_hidrostatica", { fecha_envio_hidrostatica: valor });
  }

  function guardarRetorno() {
    const valor = draftDe("retorno", "").trim();
    if (!valor) {
      setErroresPaso((e) => ({ ...e, retorno: "Indica la fecha de retorno a tienda." }));
      return;
    }
    guardarPasoSimple("retorno", {
      fecha_retorno_tienda: valor,
      inspeccion_visual_realizada: esHidrostatica ? !!drafts.inspeccion : false,
    });
  }

  function guardarListo() {
    const valor = draftDe("listo", "").trim();
    if (!valor) {
      setErroresPaso((e) => ({ ...e, listo: "Indica la fecha de listo para entrega." }));
      return;
    }
    guardarPasoSimple("listo", { fecha_listo_entrega: valor });
  }

  function guardarVerificado() {
    guardarPasoSimple("verificado", { verificado_por: draftDe("verificado", "") || null });
  }

  // ---------------------------------------------------------------
  // Notificaciones al cliente -- lista que se sigue llenando de a una,
  // ya no gatea "Fecha de entrega al cliente" (item 32).
  // ---------------------------------------------------------------
  const notificaciones = ordenLocal.notificaciones_cliente;
  const [agregandoNotif, setAgregandoNotif] = useState(false);
  const [notifFecha, setNotifFecha] = useState(hoyISO());
  const [notifMedio, setNotifMedio] = useState(MEDIOS_NOTIFICACION[0]);
  const [notifNotas, setNotifNotas] = useState("");
  const [guardandoNotif, setGuardandoNotif] = useState(false);
  const [errorNotif, setErrorNotif] = useState("");

  async function agregarNotificacion() {
    if (!notifFecha) return;
    const listaNueva = [...notificaciones, { fecha: notifFecha, medio: notifMedio, notas: notifNotas.trim() || null }];
    setGuardandoNotif(true);
    setErrorNotif("");
    try {
      await guardarCampos({ notificaciones_cliente: listaNueva, fecha_notificacion_cliente: listaNueva[listaNueva.length - 1].fecha });
      setAgregandoNotif(false);
      setNotifFecha(hoyISO());
      setNotifMedio(MEDIOS_NOTIFICACION[0]);
      setNotifNotas("");
    } catch (e) {
      setErrorNotif("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardandoNotif(false);
    }
  }

  async function quitarNotificacion(i) {
    const listaNueva = notificaciones.filter((_, idx) => idx !== i);
    setGuardandoNotif(true);
    setErrorNotif("");
    try {
      await guardarCampos({
        notificaciones_cliente: listaNueva,
        fecha_notificacion_cliente: listaNueva.length > 0 ? listaNueva[listaNueva.length - 1].fecha : null,
      });
    } catch (e) {
      setErrorNotif("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardandoNotif(false);
    }
  }

  // ---------------------------------------------------------------
  // Cierre de la orden (Fecha de entrega al cliente + Nombre de quien
  // recibe + Factura de repuesto o servicio, unidos en un solo paso --
  // item 43, pedido explícito: "que estas secciones sean obligatorias de
  // llenar" -- no se puede cerrar la orden sin los tres datos, ni sin
  // Repuestos utilizados ya puestos, aunque sea "Ninguno").
  // ---------------------------------------------------------------
  const [draftEntrega, setDraftEntrega] = useState(ordenLocal.fecha_entrega_cliente || "");
  const [draftRecibe, setDraftRecibe] = useState(ordenLocal.nombre_recibe || "");
  const [draftFactura, setDraftFactura] = useState(ordenLocal.factura || "");
  const [cierreEditando, setCierreEditando] = useState(false);
  const [guardandoCierre, setGuardandoCierre] = useState(false);
  const [erroresCierre, setErroresCierre] = useState({});

  function abrirEdicionCierre() {
    setDraftEntrega(ordenLocal.fecha_entrega_cliente || "");
    setDraftRecibe(ordenLocal.nombre_recibe || "");
    setDraftFactura(ordenLocal.factura || "");
    setErroresCierre({});
    setCierreEditando(true);
  }

  async function guardarCierre() {
    const errores = {};
    if (!draftEntrega) errores.entrega = "Indica la fecha de entrega al cliente.";
    if (!draftRecibe.trim()) errores.recibe = "Indica el nombre de quien recibe.";
    if (!draftFactura.trim()) errores.factura = "Indica la factura de repuesto o servicio.";
    if (repuestos.length === 0) {
      errores.repuestos = 'Antes de cerrar la orden, indica los repuestos utilizados arriba -- si no se usó ninguno, escribe "Ninguno".';
    }
    if (Object.keys(errores).length > 0) {
      setErroresCierre(errores);
      return;
    }
    setGuardandoCierre(true);
    setErroresCierre({});
    try {
      await guardarCampos({
        fecha_entrega_cliente: draftEntrega,
        nombre_recibe: draftRecibe.trim(),
        factura: draftFactura.trim(),
      });
      setCierreEditando(false);
    } catch (e) {
      setErroresCierre({ general: "No se pudo guardar. Intenta de nuevo." });
    } finally {
      setGuardandoCierre(false);
    }
  }

  // ---------------------------------------------------------------
  // Notas del técnico sobre el regulador -- texto libre, siempre
  // disponible dentro del Seguimiento (bloqueado durante un Hold junto
  // con todo lo demás), sin gatear nada.
  // ---------------------------------------------------------------
  const [notasTecnico, setNotasTecnico] = useState(orden.notas_tecnico_regulador || "");
  const [guardandoNotas, setGuardandoNotas] = useState(false);
  const notasSinGuardar = notasTecnico.trim() !== (ordenLocal.notas_tecnico_regulador || "");

  async function guardarNotasTecnico() {
    setGuardandoNotas(true);
    try {
      await guardarCampos({ notas_tecnico_regulador: notasTecnico.trim() || null });
    } finally {
      setGuardandoNotas(false);
    }
  }

  return (
    <div className="card">
      {/* Hold (item 33) -- sin Hold activo: botón para abrir uno. Con
          Hold activo: caja destacada con la consulta + la decisión del
          cliente que lo resuelve. */}
      {!hold ? (
        <button type="button" className="btn secondary" onClick={abrirHoldModal} style={{ marginTop: 0, width: "auto" }}>
          Poner en Hold
        </button>
      ) : (
        <>
          <div style={{ background: "var(--error-fondo)", border: "2px solid var(--rojo)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--rojo)", textTransform: "uppercase", letterSpacing: 0.3 }}>
              En Hold — {labelTipoHold(hold)}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "var(--texto-suave)" }}>Consulta para cliente</div>
            <div style={{ marginTop: 2, fontSize: 14 }}>{detalleHold(hold)}</div>
            <div className="hint-text" style={{ marginTop: 8 }}>
              Desde el {formatFechaDDMMAAAADeDate(hold.fecha_inicio)} ({diasEnHold(hold)} día{diasEnHold(hold) === 1 ? "" : "s"} en Hold)
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ marginTop: 0 }}>¿El cliente autoriza?</label>
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
                className={denegado.clase("resolverHold", "btn secondary")}
                onClick={resolverHoldActivo}
                disabled={guardandoHold}
                style={{ marginTop: 8, width: "auto" }}
              >
                {guardandoHold ? "Guardando..." : "Guardar decisión y salir de Hold"}
              </button>
              {holdError && <div className="error-msg">⚠ {holdError}</div>}
            </div>
          </div>
          <div className="hint-text" style={{ textAlign: "center", padding: "6px 4px" }}>
            Todo lo demás queda bloqueado hasta resolver el Hold — excepto Repuestos utilizados, abajo.
          </div>
        </>
      )}

      {holdModalAbierto && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) cerrarHoldModal(); }}>
          <div className="modal-panel">
            <div className="modal-title">Poner en Hold</div>

            <label style={{ marginTop: 14 }}>
              Consulta para cliente <span className="req">*</span>
            </label>
            <textarea
              rows={3}
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Qué hay que consultarle al cliente"
              autoFocus
            />

            <label style={{ marginTop: 10 }}>Código de la pieza (opcional)</label>
            <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Opcional" list="piezas-catalogo" />

            {holdError && <div className="error-msg">⚠ {holdError}</div>}

            <div className="modal-actions">
              <button className="btn secondary" type="button" onClick={cerrarHoldModal} disabled={guardandoHold}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="button" onClick={confirmarHold} disabled={guardandoHold}>
                {guardandoHold ? "Guardando..." : "Poner en Hold"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Holds resueltos (item 41, pedido explícito) --
          visible siempre que haya al menos uno, con o sin un Hold activo
          en este momento. */}
      {ordenLocal.holds.some((h) => !h.activo) && (
        <div style={{ marginTop: 14 }}>
          <div className="section-title" style={{ marginTop: 0, marginBottom: 6, fontSize: 12.5 }}>
            Holds resueltos
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ordenLocal.holds
              .filter((h) => !h.activo)
              .map((h) => (
                <div key={h.id} style={{ fontSize: 12.5, padding: "8px 10px", background: "var(--superficie-suave)", borderRadius: 8 }}>
                  <div style={{ fontWeight: 600 }}>
                    {labelTipoHold(h)} — {detalleHold(h)}
                  </div>
                  <div className="hint-text" style={{ marginTop: 2 }}>
                    Decisión del cliente: {h.decision === "si" ? "Sí" : h.decision === "no" ? "No" : "—"}
                    {h.decision_nota ? ` — ${h.decision_nota}` : ""} · {formatFechaDDMMAAAADeDate(h.fecha_inicio)} →{" "}
                    {formatFechaDDMMAAAADeDate(h.fecha_resolucion)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Repuestos utilizados -- siempre disponible (item 31), con o sin
          Hold activo. */}
      <div
        style={{
          marginTop: 16,
          background: "var(--superficie-suave)",
          border: "2px solid var(--azul-claro)",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ marginTop: 0, fontWeight: 700, color: "var(--azul-claro)" }}>REPUESTOS UTILIZADOS</label>
          <span style={{ fontSize: 10.5, color: "var(--texto-suave)", fontWeight: 600 }}>Siempre disponible</span>
        </div>
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
                  disabled={guardandoRepuestos}
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
            disabled={guardandoRepuestos}
          />
          <button
            type="button"
            className="btn secondary"
            onClick={agregarRepuesto}
            disabled={guardandoRepuestos}
            style={{ marginTop: 0, width: "auto" }}
          >
            {guardandoRepuestos ? "..." : "+ Agregar"}
          </button>
        </div>
        <datalist id="piezas-catalogo">
          {piezas.map((p) => (
            <option key={p.id} value={p.nombre} />
          ))}
        </datalist>
        {repuestos.length === 0 && (
          <div className="hint-text">
            Obligatorio para cerrar la orden -- si no se usó ninguno, agrega &quot;Ninguno&quot;.
          </div>
        )}
      </div>

      {repuestoAEliminar !== null && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) cancelarEliminarRepuesto(); }}>
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

      {/* Con Hold activo, todo lo demás queda bloqueado (item 31). */}
      {hold ? (
        <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--texto-suave)", padding: "10px 0 2px" }}>
          — Seguimiento bloqueado mientras la orden está en Hold —
        </div>
      ) : (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>Seguimiento</div>

          {esReparacion && (
            <PasoWizard
              id="envio_reparacion"
              label="Fecha de envío a taller o proveedor"
              locked={false}
              hecho={envioReparacionHecho}
              editando={editando === "envio_reparacion"}
              onEditar={() => abrirEdicion("envio_reparacion", ordenLocal.fecha_envio)}
              preview={formatFechaDDMMAAAADeDate(ordenLocal.fecha_envio)}
              guardando={guardandoPaso === "envio_reparacion"}
              error={erroresPaso.envio_reparacion}
              onGuardar={guardarEnvioReparacion}
              denegado={denegado}
              explicado={explicado}
            >
              <input
                type="date"
                value={draftDe("envio_reparacion", ordenLocal.fecha_envio)}
                onChange={(e) => setDraft("envio_reparacion", e.target.value)}
                style={{ marginTop: 6 }}
              />
            </PasoWizard>
          )}

          {esHidrostatica && (
            <PasoWizard
              id="envio_hidrostatica"
              label="Fecha de envío a prueba hidrostática"
              locked={false}
              hecho={envioHidrostaticaHecho}
              editando={editando === "envio_hidrostatica"}
              onEditar={() => abrirEdicion("envio_hidrostatica", ordenLocal.fecha_envio_hidrostatica)}
              preview={formatFechaDDMMAAAADeDate(ordenLocal.fecha_envio_hidrostatica)}
              guardando={guardandoPaso === "envio_hidrostatica"}
              error={erroresPaso.envio_hidrostatica}
              onGuardar={guardarEnvioHidrostatica}
              denegado={denegado}
              explicado={explicado}
            >
              <input
                type="date"
                value={draftDe("envio_hidrostatica", ordenLocal.fecha_envio_hidrostatica)}
                onChange={(e) => setDraft("envio_hidrostatica", e.target.value)}
                style={{ marginTop: 6 }}
              />
            </PasoWizard>
          )}

          {muestraRetorno && (
            <PasoWizard
              id="retorno"
              label="Fecha de retorno a tienda"
              locked={!retornoHecho && !retornoDesbloqueado}
              mensajeBloqueo="Aún no puedes poner la fecha de retorno porque falta la fecha de envío."
              hecho={retornoHecho}
              editando={editando === "retorno"}
              onEditar={() => {
                abrirEdicion("retorno", ordenLocal.fecha_retorno_tienda);
                setDraft("inspeccion", !!ordenLocal.inspeccion_visual_realizada);
              }}
              preview={
                <>
                  {formatFechaDDMMAAAADeDate(ordenLocal.fecha_retorno_tienda)}
                  {esHidrostatica && ` — Inspección visual: ${ordenLocal.inspeccion_visual_realizada ? "Sí" : "No"}`}
                </>
              }
              guardando={guardandoPaso === "retorno"}
              error={erroresPaso.retorno}
              onGuardar={guardarRetorno}
              denegado={denegado}
              explicado={explicado}
              onClickBloqueado={clickBloqueado}
            >
              <input
                type="date"
                value={draftDe("retorno", ordenLocal.fecha_retorno_tienda)}
                onChange={(e) => setDraft("retorno", e.target.value)}
                style={{ marginTop: 6 }}
              />
              {esHidrostatica && (
                <label className="check-label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={drafts.inspeccion !== undefined ? drafts.inspeccion : !!ordenLocal.inspeccion_visual_realizada}
                    onChange={(e) => setDraft("inspeccion", e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  Inspección visual realizada
                </label>
              )}
            </PasoWizard>
          )}

          <PasoWizard
            id="listo"
            label="Fecha de listo para entrega"
            locked={!listoHecho && !listoDesbloqueado}
            mensajeBloqueo="Aún no puedes poner la fecha de listo porque falta la fecha de retorno a tienda."
            hecho={listoHecho}
            editando={editando === "listo"}
            onEditar={() => abrirEdicion("listo", ordenLocal.fecha_listo_entrega)}
            preview={formatFechaDDMMAAAADeDate(ordenLocal.fecha_listo_entrega)}
            guardando={guardandoPaso === "listo"}
            error={erroresPaso.listo}
            onGuardar={guardarListo}
            denegado={denegado}
            explicado={explicado}
            onClickBloqueado={clickBloqueado}
          >
            <input
              type="date"
              value={draftDe("listo", ordenLocal.fecha_listo_entrega)}
              onChange={(e) => setDraft("listo", e.target.value)}
              style={{ marginTop: 6 }}
            />
          </PasoWizard>

          <PasoWizard
            id="verificado"
            label="Verificado por"
            locked={!verificadoHecho && (!verificadoDesbloqueado || !puedeVerificar)}
            mensajeBloqueo={
              !verificadoDesbloqueado
                ? "Aún no puedes verificar porque falta la fecha de listo para entrega."
                : "Solo el Titular o un Administrador puede llenar esto."
            }
            hecho={verificadoHecho}
            // Sin permiso, el que ya está verificado se ve pero no se puede reabrir.
            onEditar={puedeVerificar ? () => abrirEdicion("verificado", ordenLocal.verificado_por) : null}
            editando={editando === "verificado"}
            preview={ordenLocal.verificado_por}
            guardando={guardandoPaso === "verificado"}
            error={erroresPaso.verificado}
            onGuardar={guardarVerificado}
            denegado={denegado}
            explicado={explicado}
            onClickBloqueado={clickBloqueado}
          >
            <select
              value={draftDe("verificado", ordenLocal.verificado_por)}
              onChange={(e) => setDraft("verificado", e.target.value)}
              style={{ marginTop: 6 }}
            >
              <option value="">Sin verificar</option>
              {VERIFICADO_POR.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </PasoWizard>

          {/* Notificaciones al cliente -- ya no gatea "Fecha de entrega"
              (item 32); queda en paralelo con el Cierre de la orden, las
              dos disponibles en cuanto está Verificado. Es una lista, no
              un valor único, así que no usa el patrón bloqueado/activo/
              hecho de PasoWizard -- solo su candado cuando corresponde. */}
          {!notifCierreDesbloqueado ? (
            <PasoBloqueado
              id="notif"
              label="Notificaciones al cliente"
              mensaje="Aún no puedes agregar una notificación porque falta verificar la orden."
              denegado={denegado}
              explicado={explicado}
              onClick={clickBloqueado}
            />
          ) : (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--fondo)", border: "1px solid var(--borde)", borderRadius: 8 }}>
              <label style={{ marginTop: 0, fontSize: 12.5, fontWeight: 700, color: "var(--azul)" }}>Notificaciones al cliente</label>
              {notificaciones.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, marginBottom: 6 }}>
                  {notificaciones.map((n, i) => (
                    <div key={i} style={{ fontSize: 13.5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{formatFechaDDMMAAAADeDate(n.fecha)} — {n.medio}</span>
                        <button
                          type="button"
                          onClick={() => quitarNotificacion(i)}
                          disabled={guardandoNotif}
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
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setAgregandoNotif(true)}
                  style={{ marginTop: 6, width: "auto" }}
                >
                  + Agregar notificación
                </button>
              ) : (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="date" value={notifFecha} onChange={(e) => setNotifFecha(e.target.value)} style={{ marginTop: 0, width: "auto" }} />
                    <select value={notifMedio} onChange={(e) => setNotifMedio(e.target.value)} style={{ marginTop: 0, width: "auto" }}>
                      {MEDIOS_NOTIFICACION.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-primary" onClick={agregarNotificacion} disabled={guardandoNotif} style={{ marginTop: 0, width: "auto" }}>
                      {guardandoNotif ? "Guardando..." : "Agregar"}
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
              {errorNotif && <div className="error-msg">⚠ {errorNotif}</div>}
            </div>
          )}

          {/* Cierre de la orden: Fecha de entrega + Nombre de quien
              recibe + Factura, unidos en un solo paso (item 43). */}
          <PasoWizard
            id="cierre"
            label="Cierre de la orden"
            locked={!cierreHecho && !notifCierreDesbloqueado}
            mensajeBloqueo="Aún no puedes cerrar la orden porque falta verificarla."
            hecho={cierreHecho}
            editando={cierreEditando}
            onEditar={abrirEdicionCierre}
            preview={
              <>
                Entregado el {formatFechaDDMMAAAADeDate(ordenLocal.fecha_entrega_cliente)}
                {ordenLocal.nombre_recibe && ` a ${ordenLocal.nombre_recibe}`}
                {ordenLocal.factura && ` — Factura: ${ordenLocal.factura}`}
              </>
            }
            guardando={guardandoCierre}
            error={erroresCierre.general}
            onGuardar={guardarCierre}
            denegado={denegado}
            explicado={explicado}
            onClickBloqueado={clickBloqueado}
          >
            <label style={{ marginTop: 6 }}>
              Fecha de entrega al cliente <span className="req">*</span>
            </label>
            <input type="date" value={draftEntrega} onChange={(e) => setDraftEntrega(e.target.value)} />
            {erroresCierre.entrega && <div className="error-msg">⚠ {erroresCierre.entrega}</div>}

            <label style={{ marginTop: 10 }}>
              Nombre de quien recibe <span className="req">*</span>
            </label>
            <input type="text" value={draftRecibe} onChange={(e) => setDraftRecibe(e.target.value)} />
            {erroresCierre.recibe && <div className="error-msg">⚠ {erroresCierre.recibe}</div>}

            <label style={{ marginTop: 10 }}>
              Factura de repuesto o servicio <span className="req">*</span>
            </label>
            <input type="text" value={draftFactura} onChange={(e) => setDraftFactura(e.target.value)} />
            {erroresCierre.factura && <div className="error-msg">⚠ {erroresCierre.factura}</div>}

            {erroresCierre.repuestos && <div className="error-msg">⚠ {erroresCierre.repuestos}</div>}
          </PasoWizard>

          {/* Notas del técnico sobre el regulador -- siempre disponible
              dentro del Seguimiento, sin gatear nada. */}
          <div style={{ marginTop: 16 }}>
            <label htmlFor="notas_tecnico">Notas del técnico sobre el regulador</label>
            <textarea
              id="notas_tecnico"
              rows={2}
              value={notasTecnico}
              onChange={(e) => setNotasTecnico(e.target.value)}
              placeholder="Opcional -- alguna recomendación o pendiente para que el buzo lo tenga en cuenta"
            />
            <button
              type="button"
              className="btn secondary"
              onClick={guardarNotasTecnico}
              disabled={guardandoNotas || !notasSinGuardar}
              style={{ marginTop: 8, width: "auto" }}
            >
              {guardandoNotas ? "Guardando..." : "Guardar nota"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Caparazón compartido por los pasos simples del wizard (bloqueado /
// hecho / activo-editando), fiel al mockup aprobado (Main.dc.html).
// Pasos bloqueados NO usan `disabled` -- son clickeables y muestran el
// motivo + una sacudida en vez de no hacer nada (item 45).
function PasoWizard({
  id,
  label,
  locked,
  mensajeBloqueo,
  hecho,
  editando,
  onEditar,
  preview,
  guardando,
  error,
  onGuardar,
  denegado,
  explicado,
  onClickBloqueado,
  children,
}) {
  if (locked) {
    return (
      <PasoBloqueado
        id={id}
        label={label}
        mensaje={mensajeBloqueo}
        denegado={denegado}
        explicado={explicado}
        onClick={onClickBloqueado || ((pid) => denegado.denegar(pid))}
      />
    );
  }

  if (hecho && !editando) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 12px",
          marginTop: 10,
          background: "var(--fondo)",
          border: "1px solid var(--borde)",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ color: "var(--verde)", flexShrink: 0 }}>
            <IconCheck size={15} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: "var(--texto-suave)" }}>{label}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{preview}</div>
          </div>
        </div>
        {onEditar && (
          <button type="button" onClick={onEditar} style={{ border: "none", background: "none", color: "var(--azul-claro)", fontWeight: 700, fontSize: 12, flexShrink: 0, cursor: "pointer" }}>
            Editar
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: 12, background: "var(--fondo)", border: "2px solid var(--azul-claro)", borderRadius: 8 }}>
      <label style={{ marginTop: 0, fontSize: 12.5, fontWeight: 700, color: "var(--azul)" }}>{label}</label>
      {children}
      {error && <div className="error-msg">⚠ {error}</div>}
      <button type="button" className="btn btn-primary" onClick={onGuardar} disabled={guardando} style={{ marginTop: 10, width: "100%" }}>
        {guardando ? "Guardando..." : "Guardar y continuar"}
      </button>
    </div>
  );
}

// Paso bloqueado, reutilizado por PasoWizard y por Notificaciones al
// cliente (esa sección no sigue el patrón bloqueado/hecho/activo porque
// es una lista, no un valor único).
function PasoBloqueado({ id, label, mensaje, denegado, explicado, onClick }) {
  return (
    <div
      className={denegado.clase(id)}
      onClick={() => onClick(id)}
      title={mensaje}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "10px 12px",
        marginTop: 10,
        background: "var(--superficie-suave)",
        borderRadius: 8,
        opacity: 0.7,
        cursor: "pointer",
        border: "1px solid transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IconLock size={14} style={{ flexShrink: 0, color: "var(--texto-suave)" }} />
        <span style={{ fontSize: 13.5, color: "var(--texto-suave)" }}>{label}</span>
      </div>
      {explicado === id && (
        <div className="hint-text" style={{ marginTop: 2 }}>{mensaje}</div>
      )}
    </div>
  );
}
