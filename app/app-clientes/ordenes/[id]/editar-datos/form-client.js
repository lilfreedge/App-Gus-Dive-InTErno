"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import SelectorCliente from "@/components/SelectorCliente";
import SelectorEquipoCliente from "@/components/SelectorEquipoCliente";
import { COMPONENTES_REGULADOR_DEFS, componentePresente, componenteDetalle } from "@/lib/informe-mantenimiento";
import { prefillComponentesRecibidos, detalleComponentesTexto, detalleEquipoActualizadoDesdeOrden } from "@/lib/regulador-detalle";

const AUTORIZACION_OPCIONES = ["Autoriza cualquier cambio necesario", "Solo lo indicado, nada más"];

// Mismos campos que "Registrar orden" (form-client.js de
// app/app-clientes/ordenes/nueva/), pero para CORREGIR una orden ya
// creada (item 7, 26-sep-2026) -- por eso arranca con los valores ya
// guardados, y guarda con `update` en vez de `insert`. La foto y el
// resto del seguimiento no se tocan aquí.
//
// "Componentes recibidos" se sumó aquí el 28-sep-2026 (pedido explícito:
// "pon que en la edicion de la orden, se pueda editar eso, en caso de
// ser necesario") -- antes solo se podía anotar/corregir al registrar la
// orden. Mismo checklist, mismo comportamiento que Registrar orden,
// incluyendo la sincronización automática con el detalle permanente del
// equipo si el técnico deja algo distinto de lo ya guardado (ver
// sincronizarDetalleEquipoSiCambio más abajo).
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
  // Normaliza lo ya guardado en la orden (compatible con la forma vieja,
  // booleano plano, y la nueva, { presente, detalle } -- mismo patrón que
  // ya usa el Informe de mantenimiento) al shape editable del checklist.
  const [componentesRecibidos, setComponentesRecibidos] = useState(() => {
    const guardado = orden.regulador_componentes || {};
    const out = {};
    for (const c of COMPONENTES_REGULADOR_DEFS) {
      if (componentePresente(guardado[c.id])) {
        out[c.id] = { presente: true, detalle: componenteDetalle(guardado[c.id]) };
      }
    }
    return out;
  });
  const [notas, setNotas] = useState(orden.notas || "");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onClienteCreado(nuevo) {
    setClientes((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  function onEquipoCreado(nuevo) {
    setEquipos((prev) => [...prev, nuevo]);
    if (nuevo.tipo_equipo === "Reguladores") {
      setComponentesRecibidos(prefillComponentesRecibidos(nuevo.regulador_componentes_detalle));
    }
  }

  function toggleComponenteRecibido(id) {
    setComponentesRecibidos((prev) => {
      const actual = prev[id] || { presente: false, detalle: "" };
      return { ...prev, [id]: { ...actual, presente: !actual.presente } };
    });
  }

  function setDetalleComponenteRecibido(id, texto) {
    setComponentesRecibidos((prev) => {
      const actual = prev[id] || { presente: true, detalle: "" };
      return { ...prev, [id]: { ...actual, detalle: texto } };
    });
  }

  // Servicio a realizar, filtrado por tipo de Equipo (item 21) y
  // Autorización del cliente solo para Reguladores (item 22) -- mismas
  // reglas que "Registrar orden". El valor ya guardado en la orden se deja
  // en la lista aunque el catálogo ya no lo tenga marcado para este tipo
  // de equipo (para no ocultar/perder lo que ya estaba elegido); cambiar
  // de equipo a mano sí resetea el servicio, para no dejar uno que ya no
  // aplica.
  const equipoSeleccionado = equipos.find((e) => e.id === equipoId);
  const tipoEquipoActual = equipoSeleccionado?.tipo_equipo || "";
  const esRegulador = tipoEquipoActual === "Reguladores";
  const serviciosFiltrados = tipoEquipoActual
    ? servicios.filter((s) => Array.isArray(s.tipos_equipo) && s.tipos_equipo.includes(tipoEquipoActual))
    : servicios;
  const serviciosParaMostrar =
    servicio && servicio !== "Otro" && !serviciosFiltrados.some((s) => s.nombre === servicio)
      ? [...serviciosFiltrados, { id: "__actual", nombre: servicio }]
      : serviciosFiltrados;

  // Sincroniza el detalle permanente del EQUIPO con lo que quedó en el
  // checklist de esta orden, si es que hay un cambio real -- mismo
  // comportamiento y misma función que Registrar orden (28-sep-2026,
  // pedido explícito, ver nota arriba). No bloquea el guardado de la
  // orden si falla.
  async function sincronizarDetalleEquipoSiCambio() {
    if (!esRegulador || !equipoSeleccionado) return;
    const nuevoDetalle = detalleEquipoActualizadoDesdeOrden(equipoSeleccionado.regulador_componentes_detalle, componentesRecibidos);
    if (!nuevoDetalle) return;
    try {
      await registrarCambio(supabase, {
        tabla: "equipos_del_cliente",
        registroId: equipoSeleccionado.id,
        accion: "editar",
        datosAnteriores: equipoSeleccionado,
        datosNuevos: { ...equipoSeleccionado, regulador_componentes_detalle: nuevoDetalle },
      });
      await supabase.from("equipos_del_cliente").update({ regulador_componentes_detalle: nuevoDetalle }).eq("id", equipoSeleccionado.id);
    } catch (e) {
      // Ignorado a propósito -- ver comentario arriba.
    }
  }

  function onEquipoChange(id) {
    setEquipoId(id);
    setServicio("");
    setServicioOtro("");
    // Mismo comportamiento que Registrar orden: cambiar de equipo
    // reprellena el checklist con el detalle del equipo recién elegido
    // (o lo limpia si ya no es Regulador).
    if (!id) {
      setComponentesRecibidos({});
      return;
    }
    const nuevo = equipos.find((e) => e.id === id);
    if (nuevo) {
      setComponentesRecibidos(nuevo.tipo_equipo === "Reguladores" ? prefillComponentesRecibidos(nuevo.regulador_componentes_detalle) : {});
    }
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

    const cambios = {
      no_orden_fisico: noOrdenFisico.trim(),
      cliente_id: clienteId,
      cliente_nombre_snapshot: cliente?.nombre || orden.cliente_nombre_snapshot,
      equipo_id: equipoId,
      tipo_equipo: equipo?.tipo_equipo || orden.tipo_equipo,
      tipo_equipo_otro: equipo?.tipo_equipo_otro || null,
      equipo_marca_snapshot: equipo?.marca || null,
      equipo_modelo_snapshot: equipo?.modelo || null,
      que_se_hara: servicioFinal,
      autorizacion_cliente: esRegulador ? autorizacionCliente || null : null,
      autorizacion_notas: esRegulador ? autorizacionNotas.trim() || null : null,
      regulador_componentes: esRegulador ? componentesRecibidos : {},
      notas: notas.trim() || null,
      fecha,
    };

    // datosNuevos (item 20, pedido explícito: "que en las ediciones
    // aparezca el before and after").
    await registrarCambio(supabase, {
      tabla: "ordenes_equipos",
      registroId: orden.id,
      accion: "editar",
      datosAnteriores: orden,
      datosNuevos: cambios,
    });

    const { error: err } = await supabase
      .from("ordenes_equipos")
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq("id", orden.id);

    setLoading(false);

    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    await sincronizarDetalleEquipoSiCambio();

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
        onChange={onEquipoChange}
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
      <select
        id="servicio"
        value={servicio}
        onChange={(e) => setServicio(e.target.value)}
        disabled={!equipoId}
      >
        <option value="">{equipoId ? "Selecciona..." : "Selecciona un equipo primero"}</option>
        {serviciosParaMostrar.map((s) => (
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

      {esRegulador && (
        <>
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

          <label style={{ marginTop: 14 }}>Componentes recibidos</label>
          {equipoSeleccionado && (
            <div className="hint-text" style={{ marginBottom: 6 }}>
              Según el equipo: {detalleComponentesTexto(equipoSeleccionado.regulador_componentes_detalle)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {COMPONENTES_REGULADOR_DEFS.map((c) => {
              const valorComponente = componentesRecibidos[c.id];
              const presente = !!valorComponente?.presente;
              return (
                <div key={c.id}>
                  <button
                    type="button"
                    className={presente ? "btn btn-primary" : "btn secondary"}
                    onClick={() => toggleComponenteRecibido(c.id)}
                    style={{ marginTop: 0, width: "auto", padding: "7px 12px", fontSize: 12.5 }}
                  >
                    {c.label}
                  </button>
                  {presente && !c.soloCheck && (
                    <input
                      type="text"
                      value={valorComponente?.detalle || ""}
                      onChange={(e) => setDetalleComponenteRecibido(c.id, e.target.value)}
                      placeholder={c.placeholderDetalle}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <label htmlFor="notas">Notas</label>
      <textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Cualquier detalle extra (opcional)" />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
