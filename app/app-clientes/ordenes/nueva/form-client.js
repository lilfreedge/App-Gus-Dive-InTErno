"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import SelectorCliente from "@/components/SelectorCliente";
import SelectorEquipoCliente from "@/components/SelectorEquipoCliente";
import CampoFoto from "@/components/CampoFoto";
import DetalleComponentesRegulador from "@/components/DetalleComponentesRegulador";
import { subirFoto } from "@/lib/storage-client";
import { hoyISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { COMPONENTES_REGULADOR_DEFS } from "@/lib/informe-mantenimiento";
import { prefillComponentesRecibidos, detalleComponentesTexto } from "@/lib/regulador-detalle";
import { IconLock, IconCheck } from "@/components/icons";

// Registrar orden (App Equipos Clientes, rediseñado 23-sep-2026 tras
// definir "Equipo del cliente"): No. de orden, cliente, equipo de ese
// cliente (con marca/modelo -- se elige uno ya existente o se crea ahí
// mismo), servicio a realizar, fecha de ingreso. Todo lo demás (envío a,
// fechas de retorno/listo/entrega, verificado por, factura) se llena
// después, en la ficha de la orden, a medida que vaya pasando --
// pedido explícito del usuario ("cada orden como serán diferentes no se
// de que manera es que vamos alimentar las demas cosas").
//
// "No. de orden" (agregado el mismo día, pedido explícito) va primero,
// antes que el cliente: "es un numero de una secuencia que tenemos de
// un talonario fisico, donde se registraran las ordenes por primera
// vez" -- es el número que se anota a mano en el talonario de papel,
// no el folio digital (que sigue generándose solo).
//
// "servicios" (23-sep-2026, pedido explícito) ya no es una lista fija en
// este archivo -- viene del catálogo editable en /app-clientes/catalogo
// (tabla servicios_catalogo, ver migration_21.sql), pasado desde
// page.js.
//
// Wizard (28-sep-2026, pedido explícito: "el registrar orden, ponlo tipo
// wizard, como pusimos el seguimiento") -- mismo lenguaje visual que
// "Actualizar estado de orden" (app/app-clientes/ordenes/[id]/editar/
// form-client.js): un paso activo a la vez, los ya completados se ven
// colapsados con "Editar", los que faltan se ven bloqueados con candado.
// A diferencia de Seguimiento, aquí NO hay guardado en base de datos por
// paso (la orden todavía no existe) -- "Continuar" solo valida y avanza
// en memoria; el único guardado real pasa al final, con "Registrar
// orden". Por eso ya no es un <form> nativo (para que Enter en un campo
// de un paso no dispare el registro completo de una vez).
const AUTORIZACION_OPCIONES = ["Autoriza cualquier cambio necesario", "Solo lo indicado, nada más"];

// Mismo cálculo que `etiqueta()` en SelectorEquipoCliente -- se repite
// aquí (chiquito, sin estado) para mostrar el resumen del equipo elegido
// en el paso ya colapsado.
function etiquetaEquipoPreview(e) {
  if (!e) return "";
  const tipo = tipoEquipoLabel(e.tipo_equipo, e.tipo_equipo_otro);
  const marcaModelo = [e.marca, e.modelo].filter(Boolean).join(" ");
  const base = marcaModelo ? `${tipo} — ${marcaModelo}` : tipo;
  return e.serie ? `${base} (serie ${e.serie})` : base;
}

export default function NuevaOrdenForm({
  clientes: clientesIniciales,
  equipos: equiposIniciales,
  servicios,
  clientePreseleccionado,
  puedeAgregarCliente = true,
  puedeAgregarEquipo = true,
  noOrdenSugerido = "",
}) {
  const router = useRouter();
  const supabase = createClient();

  const [clientes, setClientes] = useState(clientesIniciales);
  const [equipos, setEquipos] = useState(equiposIniciales);
  // No. de orden auto-sugerido (item 17, pedido explícito, 26-sep-2026:
  // "que la secuencia de no. al registrar una orden se ponga sola y se
  // base en el ultimo numero escrito. Y que esto sea editable pero con un
  // warning") -- arranca con el sugerido (último + 1), pero sigue siendo
  // un campo de texto normal, editable libremente.
  const [noOrdenFisico, setNoOrdenFisico] = useState(noOrdenSugerido || "");
  const [clienteId, setClienteId] = useState(clientePreseleccionado || "");
  const [equipoId, setEquipoId] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [servicio, setServicio] = useState("");
  const [servicioOtro, setServicioOtro] = useState("");
  // Autorización del cliente (23-sep-2026, pedido explícito: casos donde
  // hace falta un cambio no pedido de entrada -- ej. "el regulador tiene
  // una manguera fea y nuestra recomendación es cambiarla, pero para eso
  // necesitamos autorización del cliente" -- para dejar anotado desde el
  // registro qué tanto autorizó el cliente, sin tener que llamarlo cada
  // vez que aparece algo así).
  const [autorizacionCliente, setAutorizacionCliente] = useState("");
  const [autorizacionNotas, setAutorizacionNotas] = useState("");
  // Item 36 (Informe de mantenimiento) -- estado inicial del regulador,
  // solo se anota aquí, en el registro.
  const [componentesRecibidos, setComponentesRecibidos] = useState({});
  const [danosVisibles, setDanosVisibles] = useState("");
  const [problemasReportados, setProblemasReportados] = useState("");
  // Detalle de componentes del equipo -- prefill del checklist de arriba
  // + panel para corregirlo si el cliente cambió algo (28-sep-2026,
  // pedido explícito: "al momento de reigstrar una orden, recuerdas que
  // estas cosas la piden [al registrar el regulador]? pues ya aparecera
  // ahi por default y en caso de hacer algun cambio de componente... que
  // esto quede registrado en el historial del cliente" -- ver
  // lib/regulador-detalle.js).
  const [editandoDetalleEquipo, setEditandoDetalleEquipo] = useState(false);
  const [detalleEquipoDraft, setDetalleEquipoDraft] = useState({});
  const [guardandoDetalleEquipo, setGuardandoDetalleEquipo] = useState(false);
  const [errorDetalleEquipo, setErrorDetalleEquipo] = useState("");
  const [notas, setNotas] = useState("");
  const [foto, setFoto] = useState(null);

  const [historialCliente, setHistorialCliente] = useState([]);
  const [error, setError] = useState("");
  // Aviso de "orden abierta" con link a esa orden (item 6, pedido
  // explícito, 27-sep-2026: "que sea un boton que te lleve a la orden y
  // cambia el mensaje" -- antes era un texto plano dentro de error-box).
  const [ordenAbierta, setOrdenAbierta] = useState(null);
  const [loading, setLoading] = useState(false);

  // Paso activo del wizard (28-sep-2026, ver nota arriba). Arranca en
  // "orden" sin importar si ya viene sugerido -- así el técnico ve y
  // confirma el número antes de seguir.
  const [paso, setPaso] = useState("orden");
  const [erroresPaso, setErroresPaso] = useState({});

  function limpiarErrorPaso(id) {
    setErroresPaso((e) => (e[id] ? { ...e, [id]: "" } : e));
  }

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
    setServicio("");
    setServicioOtro("");
  }

  function onEquipoCreado(nuevo) {
    setEquipos((prev) => [...prev, nuevo]);
    // Precarga el checklist con lo recién capturado en "Equipo nuevo" --
    // se hace aquí (con el objeto fresco) y no en onEquipoChange, que
    // corre justo después pero con el `equipos` de este mismo render,
    // todavía sin el equipo nuevo adentro.
    if (nuevo.tipo_equipo === "Reguladores") {
      setComponentesRecibidos(prefillComponentesRecibidos(nuevo.regulador_componentes_detalle));
    }
  }

  // Servicio a realizar, filtrado por tipo de Equipo (item 21, pedido
  // explícito, 26-sep-2026: "Cambiar esto a que si el equipo es tanque,
  // que en servicio a realizar solo salga..."). El catálogo de servicios
  // ahora trae `tipos_equipo` (migration_29.sql) -- cada servicio dice a
  // qué tipo(s) de equipo aplica, para no adivinar por el nombre. Cambiar
  // de equipo resetea el servicio elegido, para no dejar seleccionado uno
  // que ya no aplica.
  const equipoSeleccionado = equipos.find((e) => e.id === equipoId);
  const tipoEquipoActual = equipoSeleccionado?.tipo_equipo || "";
  const serviciosFiltrados = tipoEquipoActual
    ? servicios.filter((s) => Array.isArray(s.tipos_equipo) && s.tipos_equipo.includes(tipoEquipoActual))
    : [];
  // Autorización del cliente (item 22, pedido explícito, 26-sep-2026:
  // "quita la seccion de autorizacion del cliente, para todo. solo dejalo
  // para regulador") -- antes se mostraba siempre.
  const esRegulador = tipoEquipoActual === "Reguladores";

  function toggleComponenteRecibido(id) {
    setComponentesRecibidos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function onEquipoChange(id) {
    setEquipoId(id);
    setServicio("");
    setServicioOtro("");
    setEditandoDetalleEquipo(false);
    setErrorDetalleEquipo("");
    // Precarga el checklist "Componentes recibidos" con lo que ya está
    // guardado en el detalle del equipo (28-sep-2026, pedido explícito:
    // "ya aparecera ahi por default") -- el técnico lo puede desmarcar si
    // ese día no lo trajo.
    if (!id) {
      setComponentesRecibidos({});
      return;
    }
    const nuevo = equipos.find((e) => e.id === id);
    if (nuevo) {
      setComponentesRecibidos(nuevo.tipo_equipo === "Reguladores" ? prefillComponentesRecibidos(nuevo.regulador_componentes_detalle) : {});
    }
    // Si no se encuentra (equipo recién creado en "Equipo nuevo", todavía
    // no está en el arreglo `equipos` de este render porque SelectorEquipoCliente
    // llama a onEquipoCreado y luego a este onChange en el mismo instante),
    // no se toca -- onEquipoCreado ya dejó el prefill correcto y no hay que
    // pisarlo con un `{}` de resultado vacío.
  }

  function abrirEditarDetalleEquipo() {
    setDetalleEquipoDraft(equipoSeleccionado?.regulador_componentes_detalle || {});
    setErrorDetalleEquipo("");
    setEditandoDetalleEquipo(true);
  }

  // Actualiza el detalle de componentes del EQUIPO (no de esta orden) --
  // para cuando el cliente de verdad cambió algo permanente (ej. le
  // pusieron un octopus distinto), no solo "no lo trajo hoy". Se guarda
  // de inmediato (no espera al submit de la orden) con registrarCambio,
  // igual que "Editar equipo" -- por eso queda anotado en Historial de
  // ediciones de Equipos (pedido explícito: "que esto quede registrado
  // en el historial del cliente").
  async function guardarDetalleEquipo() {
    setGuardandoDetalleEquipo(true);
    setErrorDetalleEquipo("");
    try {
      await registrarCambio(supabase, {
        tabla: "equipos_del_cliente",
        registroId: equipoId,
        accion: "editar",
        datosAnteriores: equipoSeleccionado,
        datosNuevos: { ...equipoSeleccionado, regulador_componentes_detalle: detalleEquipoDraft },
      });
      const { error: err } = await supabase
        .from("equipos_del_cliente")
        .update({ regulador_componentes_detalle: detalleEquipoDraft })
        .eq("id", equipoId);
      if (err) throw err;

      setEquipos((prev) =>
        prev.map((e) => (e.id === equipoId ? { ...e, regulador_componentes_detalle: detalleEquipoDraft } : e))
      );
      // El checklist de esta orden se actualiza para reflejar el cambio.
      setComponentesRecibidos(prefillComponentesRecibidos(detalleEquipoDraft));
      setEditandoDetalleEquipo(false);
    } catch (e) {
      setErrorDetalleEquipo("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardandoDetalleEquipo(false);
    }
  }

  // ---------------------------------------------------------------
  // Navegación del wizard -- cada "continuar" valida solo lo de su
  // propio paso y avanza; "Editar"/"Volver" solo cambian el paso activo,
  // sin tocar los datos ya cargados (28-sep-2026, ver nota arriba).
  // ---------------------------------------------------------------
  function continuarOrden() {
    if (!noOrdenFisico.trim()) {
      setErroresPaso((e) => ({ ...e, orden: "Escribe el No. de orden del talonario." }));
      return;
    }
    limpiarErrorPaso("orden");
    setPaso("cliente");
  }

  function continuarCliente() {
    if (!clienteId) {
      setErroresPaso((e) => ({ ...e, cliente: "Selecciona o crea un cliente." }));
      return;
    }
    limpiarErrorPaso("cliente");
    setPaso("equipo");
  }

  function continuarEquipo() {
    if (!equipoId) {
      setErroresPaso((e) => ({ ...e, equipo: "Selecciona o crea el equipo." }));
      return;
    }
    limpiarErrorPaso("equipo");
    setPaso("servicio");
  }

  function continuarServicio() {
    if (!fecha) {
      setErroresPaso((e) => ({ ...e, servicio: "Selecciona la fecha de ingreso." }));
      return;
    }
    if (!servicio) {
      setErroresPaso((e) => ({ ...e, servicio: "Selecciona el servicio a realizar." }));
      return;
    }
    if (servicio === "Otro" && !servicioOtro.trim()) {
      setErroresPaso((e) => ({ ...e, servicio: "Especifica qué servicio se hará." }));
      return;
    }
    limpiarErrorPaso("servicio");
    setPaso(esRegulador ? "regulador" : "final");
  }

  function continuarRegulador() {
    setPaso("final");
  }

  // Estado visual (bloqueado / hecho-colapsado / activo) de cada paso --
  // se deriva directo de `paso`, igual de simple que en Seguimiento (ahí
  // se deriva de si el campo ya tiene valor guardado; aquí, de en qué
  // paso está parado el usuario).
  const estadoOrden = paso === "orden" ? "activo" : "hecho";
  const estadoCliente = paso === "orden" ? "locked" : paso === "cliente" ? "activo" : "hecho";
  const estadoEquipo = ["orden", "cliente"].includes(paso) ? "locked" : paso === "equipo" ? "activo" : "hecho";
  const estadoServicio = ["orden", "cliente", "equipo"].includes(paso) ? "locked" : paso === "servicio" ? "activo" : "hecho";
  const estadoRegulador = ["orden", "cliente", "equipo", "servicio"].includes(paso)
    ? "locked"
    : paso === "regulador"
      ? "activo"
      : "hecho";
  const estadoFinal = paso === "final" ? "activo" : "locked";

  async function handleSubmit() {
    setError("");
    setOrdenAbierta(null);

    // Red de seguridad -- en el flujo normal del wizard ya no debería
    // faltar ninguno de estos al llegar aquí (cada paso valida el suyo
    // antes de dejar avanzar).
    if (!noOrdenFisico.trim()) return setError("Escribe el No. de orden del talonario.");
    if (!clienteId) return setError("Selecciona o crea un cliente.");
    if (!equipoId) return setError("Selecciona o crea el equipo.");
    if (!fecha) return setError("Selecciona la fecha de ingreso.");
    if (!servicio) return setError("Selecciona el servicio a realizar.");
    if (servicio === "Otro" && !servicioOtro.trim()) return setError("Especifica qué servicio se hará.");

    const cliente = clientes.find((c) => c.id === clienteId);
    const equipo = equipos.find((e) => e.id === equipoId);
    const servicioFinal = servicio === "Otro" ? servicioOtro.trim() : servicio;

    setLoading(true);

    // No permitir dos órdenes abiertas para el mismo Equipo a la vez (item
    // 5, pedido explícito, 27-sep-2026: "No permitir registrar una orden de
    // un equipo que aún tenga una orden abierta, no hace sentido").
    const { data: abierta } = await supabase
      .from("ordenes_equipos")
      .select("id, no_orden_fisico, folio")
      .eq("equipo_id", equipoId)
      .neq("estado", "Entregado")
      .limit(1)
      .maybeSingle();

    if (abierta) {
      setLoading(false);
      // Aviso clicable en vez de solo texto (item 6, pedido explícito,
      // 27-sep-2026: "que sea un boton que te lleve a la orden y cambia
      // el mensaje a 'Este equipo ya tiene una orden abierta (No. X)'").
      setOrdenAbierta({ id: abierta.id, numero: abierta.no_orden_fisico ?? abierta.folio });
      return;
    }

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
        no_orden_fisico: noOrdenFisico.trim(),
        cliente_id: clienteId,
        cliente_nombre_snapshot: cliente?.nombre || null,
        equipo_id: equipoId,
        tipo_equipo: equipo?.tipo_equipo || null,
        tipo_equipo_otro: equipo?.tipo_equipo_otro || null,
        equipo_marca_snapshot: equipo?.marca || null,
        equipo_modelo_snapshot: equipo?.modelo || null,
        que_se_hara: servicioFinal,
        // Autorización del cliente solo aplica a Reguladores (item 22) --
        // se descarta si quedó algo cargado en el estado de una selección
        // anterior de equipo.
        autorizacion_cliente: esRegulador ? autorizacionCliente || null : null,
        autorizacion_notas: esRegulador ? autorizacionNotas.trim() || null : null,
        // Estado inicial del regulador (item 36, Informe de mantenimiento)
        // -- solo aplica a Reguladores, igual que Autorización del cliente.
        regulador_componentes: esRegulador ? componentesRecibidos : {},
        regulador_danos_visibles: esRegulador ? danosVisibles.trim() || null : null,
        regulador_problemas_reportados: esRegulador ? problemasReportados.trim() || null : null,
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
    <div className="card">
      <PasoOrden
        label="No. de orden"
        estado={estadoOrden}
        preview={noOrdenFisico}
        onEditar={() => setPaso("orden")}
        error={erroresPaso.orden}
        onContinuar={continuarOrden}
      >
        <input
          id="no_orden_fisico"
          type="text"
          value={noOrdenFisico}
          onChange={(e) => setNoOrdenFisico(e.target.value)}
          placeholder="Número del talonario físico"
          style={{ marginTop: 6 }}
          autoFocus
        />
        {noOrdenSugerido && noOrdenFisico.trim() !== noOrdenSugerido && (
          <div className="hint-text" style={{ color: "var(--rojo)" }}>
            ⚠ El siguiente número esperado era {noOrdenSugerido} -- verifica que {noOrdenFisico.trim() || "este"} sea correcto.
          </div>
        )}
      </PasoOrden>

      <PasoOrden
        label="Cliente"
        estado={estadoCliente}
        preview={clientes.find((c) => c.id === clienteId)?.nombre || ""}
        onEditar={() => setPaso("cliente")}
        error={erroresPaso.cliente}
        onContinuar={continuarCliente}
        onVolver={() => setPaso("orden")}
        volverLabel="el No. de orden"
      >
        <div style={{ marginTop: 6 }}>
          <SelectorCliente
            clientes={clientes}
            valor={clienteId}
            onChange={onClienteChange}
            onClienteCreado={onClienteCreado}
            puedeCrear={puedeAgregarCliente}
          />
        </div>
        {historialCliente.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="hint-text" style={{ marginBottom: 4 }}>Historial reciente de este cliente:</div>
            {historialCliente.map((o) => (
              <div key={o.id} className="hint-text" style={{ marginBottom: 2 }}>
                · {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)} — {formatFechaDDMMAAAADeDate(o.fecha)} ({o.estado})
              </div>
            ))}
          </div>
        )}
      </PasoOrden>

      <PasoOrden
        label="Equipo"
        estado={estadoEquipo}
        preview={etiquetaEquipoPreview(equipoSeleccionado)}
        onEditar={() => setPaso("equipo")}
        error={erroresPaso.equipo}
        onContinuar={continuarEquipo}
        onVolver={() => setPaso("cliente")}
        volverLabel="el cliente"
      >
        <div style={{ marginTop: 6 }}>
          <SelectorEquipoCliente
            equipos={equipos}
            clienteId={clienteId}
            valor={equipoId}
            onChange={onEquipoChange}
            onEquipoCreado={onEquipoCreado}
            puedeAgregarEquipo={puedeAgregarEquipo}
          />
        </div>
      </PasoOrden>

      <PasoOrden
        label="Fecha de ingreso y servicio a realizar"
        estado={estadoServicio}
        preview={`${formatFechaDDMMAAAADeDate(fecha)} — ${servicio === "Otro" ? servicioOtro : servicio}`}
        onEditar={() => setPaso("servicio")}
        error={erroresPaso.servicio}
        onContinuar={continuarServicio}
        onVolver={() => setPaso("equipo")}
        volverLabel="el equipo"
      >
        <label htmlFor="fecha" style={{ marginTop: 6 }}>
          Fecha de ingreso <span className="req">*</span>
        </label>
        <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

        <label htmlFor="servicio">
          Servicio a realizar <span className="req">*</span>
        </label>
        <select id="servicio" value={servicio} onChange={(e) => setServicio(e.target.value)}>
          <option value="">Selecciona...</option>
          {serviciosFiltrados.map((s) => (
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
      </PasoOrden>

      {/* Autorización del cliente + estado inicial del regulador (item 22
          y item 36) -- solo Reguladores. */}
      {esRegulador && (
        <PasoOrden
          label="Detalles del regulador"
          estado={estadoRegulador}
          preview="Detalles del regulador registrados"
          onEditar={() => setPaso("regulador")}
          onContinuar={continuarRegulador}
          onVolver={() => setPaso("servicio")}
          volverLabel="el servicio a realizar"
        >
          <label htmlFor="autorizacion_cliente" style={{ marginTop: 6 }}>Autorización del cliente</label>
          <select
            id="autorizacion_cliente"
            value={autorizacionCliente}
            onChange={(e) => setAutorizacionCliente(e.target.value)}
          >
            <option value="">Selecciona... (opcional)</option>
            {AUTORIZACION_OPCIONES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            type="text"
            value={autorizacionNotas}
            onChange={(e) => setAutorizacionNotas(e.target.value)}
            placeholder="Detalles o excepciones (opcional) — ej: puede cambiar manguera pero no O-rings"
            style={{ marginTop: 6 }}
          />

          {/* Item 36, nueva feature "Informe de mantenimiento" (mockup
              Informe.dc.html) -- estado inicial del regulador, se anota
              SOLO aquí, al registrar la orden (el Informe lo muestra de
              solo lectura). */}
          <label style={{ marginTop: 14 }}>Componentes recibidos</label>
          {equipoSeleccionado && (
            <div className="hint-text" style={{ marginBottom: 6 }}>
              Según el equipo: {detalleComponentesTexto(equipoSeleccionado.regulador_componentes_detalle)}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {COMPONENTES_REGULADOR_DEFS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={componentesRecibidos[c.id] ? "btn btn-primary" : "btn secondary"}
                onClick={() => toggleComponenteRecibido(c.id)}
                style={{ marginTop: 0, width: "auto", padding: "7px 12px", fontSize: 12.5 }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Actualizar el detalle de componentes del EQUIPO (no de esta
              orden) -- para cuando el cliente de verdad le cambió algo
              permanente (28-sep-2026, pedido explícito: "en caso de hacer
              algun cambio de componente... que esto quede registrado en el
              historial del cliente"). Se guarda de inmediato con
              registrarCambio -- ver guardarDetalleEquipo más arriba. */}
          {!editandoDetalleEquipo ? (
            <button
              type="button"
              className="btn secondary"
              onClick={abrirEditarDetalleEquipo}
              style={{ marginTop: 8, width: "auto", padding: "6px 12px", fontSize: 12.5 }}
            >
              ✎ Actualizar detalle del equipo
            </button>
          ) : (
            <div style={{ marginTop: 8 }}>
              <DetalleComponentesRegulador
                detalle={detalleEquipoDraft}
                onChange={setDetalleEquipoDraft}
                idPrefix="orden_detalle_equipo"
              />
              {errorDetalleEquipo && <div className="error-box" style={{ marginTop: 8 }}>{errorDetalleEquipo}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={guardandoDetalleEquipo}
                  onClick={guardarDetalleEquipo}
                  style={{ marginTop: 0, width: "auto" }}
                >
                  {guardandoDetalleEquipo ? "Guardando..." : "Guardar detalle"}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={guardandoDetalleEquipo}
                  onClick={() => setEditandoDetalleEquipo(false)}
                  style={{ marginTop: 0, width: "auto" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <label htmlFor="problemas_reportados" style={{ marginTop: 12 }}>Problemas reportados por cliente</label>
          <textarea
            id="problemas_reportados"
            rows={2}
            value={problemasReportados}
            onChange={(e) => setProblemasReportados(e.target.value)}
            placeholder="Opcional -- lo que el cliente reporta que le pasa al equipo"
          />

          <label htmlFor="danos_visibles">Daños visibles</label>
          <textarea
            id="danos_visibles"
            rows={2}
            value={danosVisibles}
            onChange={(e) => setDanosVisibles(e.target.value)}
            placeholder="Opcional -- daños que ya traía el equipo al recibirlo"
          />
        </PasoOrden>
      )}

      <PasoOrden
        label="Notas y foto"
        estado={estadoFinal}
        onContinuar={handleSubmit}
        labelContinuar="Registrar orden"
        guardando={loading}
        onVolver={() => setPaso(esRegulador ? "regulador" : "servicio")}
        volverLabel={esRegulador ? "los detalles del regulador" : "el servicio a realizar"}
      >
        <label htmlFor="notas" style={{ marginTop: 6 }}>Nota adicional</label>
        <textarea
          id="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Cualquier detalle extra (opcional)"
        />

        <div style={{ marginTop: 14 }}>
          <CampoFoto id="foto" label="Foto del equipo" file={foto} onChange={setFoto} />
        </div>

        {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
        {ordenAbierta && (
          <div
            className="error-box"
            style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}
          >
            <span>Este equipo ya tiene una orden abierta (No. {ordenAbierta.numero})</span>
            <Link href={`/app-clientes/ordenes/${ordenAbierta.id}`} className="btn secondary" style={{ marginTop: 0, width: "auto" }}>
              Ver orden
            </Link>
          </div>
        )}
      </PasoOrden>
    </div>
  );
}

// Caparazón de cada paso del wizard (bloqueado / hecho-colapsado /
// activo), mismo lenguaje visual que PasoWizard en editar/form-client.js
// (28-sep-2026, pedido explícito: "ponlo tipo wizard, como pusimos el
// seguimiento") -- simplificado porque aquí no hay nada que guardar en
// base de datos hasta el paso final.
function PasoOrden({
  label,
  estado, // "locked" | "hecho" | "activo"
  preview,
  onEditar,
  error,
  onContinuar,
  labelContinuar = "Continuar",
  guardando = false,
  onVolver,
  volverLabel,
  children,
}) {
  if (estado === "locked") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          marginTop: 10,
          background: "var(--superficie-suave)",
          borderRadius: 8,
          opacity: 0.65,
        }}
      >
        <IconLock size={14} style={{ flexShrink: 0, color: "var(--texto-suave)" }} />
        <span style={{ fontSize: 13.5, color: "var(--texto-suave)" }}>{label}</span>
      </div>
    );
  }

  if (estado === "hecho") {
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
          <button
            type="button"
            onClick={onEditar}
            style={{ border: "none", background: "none", color: "var(--azul-claro)", fontWeight: 700, fontSize: 12, flexShrink: 0, cursor: "pointer" }}
          >
            Editar
          </button>
        )}
      </div>
    );
  }

  // activo
  return (
    <div style={{ marginTop: 10, padding: 12, background: "var(--fondo)", border: "2px solid var(--azul-claro)", borderRadius: 8 }}>
      <label style={{ marginTop: 0, fontSize: 12.5, fontWeight: 700, color: "var(--azul)" }}>{label}</label>
      {children}
      {error && <div className="error-msg">⚠ {error}</div>}
      <button type="button" className="btn btn-primary" onClick={onContinuar} disabled={guardando} style={{ marginTop: 10, width: "100%" }}>
        {guardando ? "Guardando..." : labelContinuar}
      </button>
      {onVolver && (
        <button type="button" className="btn secondary" onClick={onVolver} disabled={guardando} style={{ marginTop: 8, width: "100%" }}>
          ← Volver a {volverLabel}
        </button>
      )}
    </div>
  );
}
