import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO, sumarDias, sumarMeses } from "@/lib/fechas";
import { estadoAvisos, MAX_AVISOS, DIAS_ENTRE_AVISOS } from "@/lib/avisos-clientes";
import { BotonWhatsApp, DeshacerAviso } from "./acciones-client";

// "Clientes por contactar" -- a quién llamar.
//
// Historia: nació como "Próximos mantenimientos" (1-oct-2026, una fila por
// EQUIPO con fecha recomendada desde el Informe de mantenimiento); V29 le
// cambió el nombre y le sumó "Sin visitas hace más de 12 meses". V30
// (pedido explícito, notas del 8-oct-2026: "Darle forma a Clientes por
// contactar, ahora mismo la info que aparece adentro no la entiendo muy
// bien. Ponme para dar acceso de esto"), según la maqueta aprobada:
// - una tarjeta por CLIENTE (no por equipo), con el motivo escrito en
//   palabras y cuánto falta o cuánto lleva vencido;
// - botón "Notificar vía WhatsApp" (abre el chat) y "Ver cliente";
// - arriba, cuántos hay en cada grupo; lo que vence después de 30 días
//   queda plegado al final;
// - permiso propio: equipos_clientes_contactar (antes usaba el de
//   Reportes; migration_54.sql se lo deja a quien ya lo tenía).
// La ruta sigue siendo /proximos-mantenimientos para no romper enlaces.
const MESES_SIN_VISITA = 12;
const DIAS_PROXIMOS = 30;

// Todas las órdenes (cliente, fecha, estado, número), de a 1000 -- el
// límite por consulta de Supabase -- para no cortar la lista en silencio.
async function todasLasOrdenes(supabase) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("ordenes_equipos")
      .select("cliente_id, fecha, estado, folio, no_orden_fisico, created_at")
      .order("id")
      .range(desde, desde + 999);
    if (error || !data) break;
    filas.push(...data);
    if (data.length < 1000) break;
  }
  return filas;
}

function diasEntre(desdeISO, hastaISO) {
  return Math.round((new Date(hastaISO) - new Date(desdeISO)) / 86400000);
}

function mesesEntre(desdeISO, hastaISO) {
  const a = new Date(desdeISO);
  const b = new Date(hastaISO);
  let meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) meses -= 1;
  return meses;
}

function haceTexto(dias) {
  if (dias <= 1) return "Vencido hace 1 día";
  if (dias < 60) return `Vencido hace ${dias} días`;
  return `Vencido hace ${Math.floor(dias / 30)} meses`;
}

function faltaTexto(dias) {
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

// Teléfonos de República Dominicana (809/829/849) se guardan sin el 1 del
// país -- WhatsApp y el marcador lo necesitan.
function telefonoInternacional(tel) {
  const d = String(tel || "").replace(/\D/g, "");
  if (d.length === 10) return `1${d}`;
  return d;
}

function nombreEquipo(e) {
  const marcaModelo = [e.marca, e.modelo].filter(Boolean).join(" ");
  return [tipoEquipoLabel(e.tipo_equipo, e.tipo_equipo_otro), marcaModelo].filter(Boolean).join(" ");
}

function fechaCorta(iso) {
  return formatFechaDDMMAAAADeDate(String(iso).slice(0, 10));
}

// Línea de seguimiento de avisos (V31) dentro de la tarjeta.
function LineaAvisos({ estado }) {
  if (!estado) return null;
  const { ultimo, n, descartadoHasta, esperandoHasta, ultimoAnterior, anteriores } = estado;
  return (
    <>
      {ultimo && (
        <div className="hint-text" style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span>
            Aviso {n} de {MAX_AVISOS}: {fechaCorta(ultimo.created_at)}
            {ultimo.nombre_usuario_snapshot ? ` por ${ultimo.nombre_usuario_snapshot}` : ""}
            {descartadoHasta
              ? ` · Vuelve a la lista el ${formatFechaDDMMAAAADeDate(descartadoHasta.toISOString().slice(0, 10))}`
              : esperandoHasta
                ? ` · Se puede volver a avisar el ${formatFechaDDMMAAAADeDate(esperandoHasta.toISOString().slice(0, 10))}`
                : ""}
          </span>
          <DeshacerAviso avisoId={ultimo.id} />
        </div>
      )}
      {ultimoAnterior && (
        <div className="hint-text" style={{ marginTop: 6 }}>
          Avisos anteriores: {anteriores.length} (el último el {fechaCorta(ultimoAnterior.created_at)}).
        </div>
      )}
    </>
  );
}

function TarjetaCliente({ cliente, badge, badgeClase, motivo, estado, mostrarBoton = true, children }) {
  const tel = cliente?.telefono ? telefonoInternacional(cliente.telefono) : "";
  const badgeAviso = estado?.n > 0 && !estado.descartadoHasta ? `Notificado ${estado.n} de ${MAX_AVISOS}` : null;
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div className="list-item-top" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="list-item-title" style={{ fontSize: 15 }}>
            {cliente?.nombre || "Cliente"}
          </div>
          {cliente?.telefono && (
            <div className="hint-text" style={{ marginTop: 2 }}>
              {cliente.telefono}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span className={`badge ${badgeClase}`} style={{ whiteSpace: "nowrap" }}>
            {badge}
          </span>
          {badgeAviso && (
            <span className="badge badge-azul" style={{ whiteSpace: "nowrap" }}>
              {badgeAviso}
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>{children}</div>
      <LineaAvisos estado={estado} />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        {tel && mostrarBoton && cliente?.id && <BotonWhatsApp clienteId={cliente.id} telefono={tel} motivo={motivo} />}
        {!tel && <span className="hint-text">Sin número de contacto</span>}
        {cliente?.id && (
          <Link
            href={`/app-clientes/clientes/${cliente.id}`}
            style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
          >
            Ver cliente →
          </Link>
        )}
      </div>
    </div>
  );
}

function Plegable({ titulo, cantidad, ayuda, children }) {
  return (
    <details style={{ marginTop: 18 }}>
      <summary className="section-title" style={{ cursor: "pointer", listStyle: "revert" }}>
        {titulo} ({cantidad})
      </summary>
      {ayuda && (
        <p className="hint-text" style={{ marginTop: 4 }}>
          {ayuda}
        </p>
      )}
      <div style={{ marginTop: 10 }}>{children}</div>
    </details>
  );
}

export default async function ClientesPorContactarPage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_contactar", "/app-clientes/mas");

  const [{ data: equipos }, ordenes, { data: avisos }] = await Promise.all([
    supabase
      .from("equipos_del_cliente")
      .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie, proximo_mantenimiento_recomendado")
      .not("proximo_mantenimiento_recomendado", "is", null)
      .order("proximo_mantenimiento_recomendado", { ascending: true }),
    todasLasOrdenes(supabase),
    supabase
      .from("avisos_clientes")
      .select("id, cliente_id, motivo, nombre_usuario_snapshot, created_at")
      .order("created_at", { ascending: true }),
  ]);

  const hoy = hoyISO();
  const ahora = new Date();
  const limiteProximos = sumarDias(hoy, DIAS_PROXIMOS);
  const corteSinVisita = sumarMeses(hoy, -MESES_SIN_VISITA);

  // 1) Mantenimiento recomendado: agrupado por cliente. La fecha que manda
  //    es la más próxima (o más vencida) de sus equipos.
  const porCliente = new Map();
  for (const e of equipos || []) {
    if (!e.cliente_id) continue;
    if (!porCliente.has(e.cliente_id)) porCliente.set(e.cliente_id, []);
    porCliente.get(e.cliente_id).push(e);
  }

  // Última orden de cada cliente (por fecha de ingreso, para "sin venir";
  // por created_at, para reiniciar el conteo de avisos) y órdenes abiertas.
  const ultimaPorCliente = new Map();
  const ultimaCreadaPorCliente = new Map();
  const conOrdenAbierta = new Set();
  for (const o of ordenes) {
    if (!o.cliente_id) continue;
    if (o.estado !== "Entregado") conOrdenAbierta.add(o.cliente_id);
    const prev = ultimaPorCliente.get(o.cliente_id);
    if (o.fecha && (!prev || o.fecha > prev.fecha)) ultimaPorCliente.set(o.cliente_id, o);
    const prevC = ultimaCreadaPorCliente.get(o.cliente_id);
    if (o.created_at && (!prevC || o.created_at > prevC)) ultimaCreadaPorCliente.set(o.cliente_id, o.created_at);
  }

  // Avisos por cliente → estado (V31).
  const avisosPorCliente = new Map();
  for (const a of avisos || []) {
    if (!avisosPorCliente.has(a.cliente_id)) avisosPorCliente.set(a.cliente_id, []);
    avisosPorCliente.get(a.cliente_id).push(a);
  }
  const estadoDe = (clienteId) =>
    estadoAvisos(avisosPorCliente.get(clienteId) || [], ultimaCreadaPorCliente.get(clienteId) || null, ahora);

  const vencidos = [];
  const proximos = [];
  const masAdelante = [];
  const esperando = [];
  const descartados = [];
  const reaparecidos = new Set();
  for (const [clienteId, lista] of porCliente) {
    const fecha = lista[0].proximo_mantenimiento_recomendado; // ya vienen ordenados
    const estado = estadoDe(clienteId);
    const grupo = { clienteId, equipos: lista, fecha, estado, motivo: "mantenimiento" };
    if (estado.descartadoHasta) descartados.push(grupo);
    else if (estado.reaparece) reaparecidos.add(clienteId);
    else if (estado.esperandoHasta) esperando.push(grupo);
    else if (fecha < hoy) vencidos.push(grupo);
    else if (fecha <= limiteProximos) proximos.push(grupo);
    else masAdelante.push(grupo);
  }

  // 2) Sin visitas hace más de 12 meses: última orden (fecha de ingreso)
  //    más vieja que el corte, sin orden abierta ahora mismo y sin salir ya
  //    arriba. Aquí también vuelven los descartados después de 1 año, con
  //    su historial de avisos.
  const sinVisita = [];
  for (const [id, o] of ultimaPorCliente.entries()) {
    if (porCliente.has(id) && !reaparecidos.has(id)) continue;
    if (conOrdenAbierta.has(id)) continue;
    if (o.fecha >= corteSinVisita && !reaparecidos.has(id)) continue;
    const estado = estadoDe(id);
    const grupo = { clienteId: id, orden: o, estado, motivo: "sin_visita" };
    if (estado.descartadoHasta) descartados.push(grupo);
    else if (estado.esperandoHasta) esperando.push(grupo);
    else sinVisita.push(grupo);
  }
  sinVisita.sort((a, b) => (a.orden.fecha < b.orden.fecha ? -1 : 1));
  // Reaparecidos que no tienen ninguna orden (raro): igual se muestran.
  for (const id of reaparecidos) {
    if (!sinVisita.some((c) => c.clienteId === id)) {
      sinVisita.push({ clienteId: id, orden: null, estado: estadoDe(id), motivo: "sin_visita", equipos: porCliente.get(id) });
    }
  }

  // Clientes, en una sola consulta.
  const ids = [
    ...new Set([...porCliente.keys(), ...sinVisita.map((c) => c.clienteId), ...descartados.map((c) => c.clienteId), ...esperando.map((c) => c.clienteId)]),
  ];
  const { data: clientes } =
    ids.length > 0
      ? await supabase.from("clientes_equipos").select("id, nombre, telefono").in("id", ids)
      : { data: [] };
  const clientePorId = new Map((clientes || []).map((c) => [c.id, c]));

  const motivoEquipos = (grupo, verbo) =>
    (grupo.equipos || []).map((e) => (
      <div key={e.id}>
        Mantenimiento recomendado de su <b>{nombreEquipo(e)}</b>
        {e.serie ? ` (No. ${e.serie})` : ""}. {verbo} el {formatFechaDDMMAAAADeDate(e.proximo_mantenimiento_recomendado)}.
      </div>
    ));

  const motivoSinVisita = (c) => {
    if (!c.orden) return <>Hace más de {MESES_SIN_VISITA} meses que no viene.</>;
    const numero = c.orden.no_orden_fisico || c.orden.folio;
    return (
      <>
        Su última orden fue {numero ? <>la <b>#{numero}</b>, </> : ""}el {formatFechaDDMMAAAADeDate(c.orden.fecha)}.
      </>
    );
  };

  // Tarjeta de un grupo cualquiera (mantenimiento o sin visita).
  const tarjeta = (g, { badge, badgeClase, verbo = "Le toca", mostrarBoton = true }) => (
    <TarjetaCliente
      key={g.clienteId}
      cliente={clientePorId.get(g.clienteId) || { id: g.clienteId }}
      badge={badge}
      badgeClase={badgeClase}
      motivo={g.motivo}
      estado={g.estado}
      mostrarBoton={mostrarBoton}
    >
      {g.motivo === "sin_visita" ? motivoSinVisita(g) : motivoEquipos(g, verbo)}
    </TarjetaCliente>
  );

  const nada =
    vencidos.length + proximos.length + sinVisita.length + masAdelante.length + esperando.length + descartados.length === 0;

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/mas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Más", href: "/app-clientes/mas" }, { label: "Clientes por contactar" }]} />
        <p className="page-subtitle">
          A quién llamar: clientes con un mantenimiento recomendado vencido o por llegar, y clientes que no vienen hace
          más de {MESES_SIN_VISITA} meses.
        </p>

        {/* Regla de los avisos, en la misma pantalla (pedido explícito). */}
        <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "var(--superficie-suave)", border: "1px solid var(--borde)" }}>
          Los clientes serán contactados hasta {MAX_AVISOS} veces, con {DIAS_ENTRE_AVISOS} días entre un aviso y otro.
          Si después del {MAX_AVISOS}er aviso no vienen, desaparecerán de la lista y volverán a aparecer después de 1
          año en &quot;Sin venir +{MESES_SIN_VISITA} meses&quot;. Si el cliente trae su equipo y se le registra una orden,
          el conteo vuelve a empezar.
        </div>

        <div className="stat-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--rojo)" }}>{vencidos.length}</div>
            <div className="stat-label">Mantenimiento vencido</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#b5691f" }}>{proximos.length}</div>
            <div className="stat-label">Le toca en {DIAS_PROXIMOS} días</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{sinVisita.length}</div>
            <div className="stat-label">Sin venir +{MESES_SIN_VISITA} meses</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--azul-claro)" }}>{masAdelante.length}</div>
            <div className="stat-label">Le toca más adelante</div>
          </div>
        </div>

        {nada && <div className="empty">Por ahora no hay a nadie que contactar.</div>}

        {vencidos.length > 0 && (
          <>
            <div className="section-title">Mantenimiento vencido</div>
            {vencidos.map((g) =>
              tarjeta(g, { badge: haceTexto(diasEntre(g.fecha, hoy)), badgeClase: "badge-rojo", verbo: "Le tocaba" })
            )}
          </>
        )}

        {proximos.length > 0 && (
          <>
            <div className="section-title">Le toca en los próximos {DIAS_PROXIMOS} días</div>
            {proximos.map((g) => tarjeta(g, { badge: faltaTexto(diasEntre(hoy, g.fecha)), badgeClase: "badge-amarillo" }))}
          </>
        )}

        {sinVisita.length > 0 && (
          <>
            <div className="section-title">No viene hace más de {MESES_SIN_VISITA} meses</div>
            {sinVisita.map((c) =>
              tarjeta(c, {
                badge: c.orden ? `Hace ${mesesEntre(c.orden.fecha, hoy)} meses` : "Volvió a la lista",
                badgeClase: "",
              })
            )}
          </>
        )}

        {/* "Más adelante" ahora es una sección con su título y su contador
            arriba (antes era una línea chiquita que confundía). */}
        {masAdelante.length > 0 && (
          <Plegable
            titulo={`Le toca más adelante (después de ${DIAS_PROXIMOS} días)`}
            cantidad={masAdelante.length}
            ayuda="Todavía no hay que avisarles: su mantenimiento recomendado es en más de 30 días. Pasan solos a la lista de arriba cuando falten 30 días."
          >
            {masAdelante.map((g) => tarjeta(g, { badge: formatFechaDDMMAAAADeDate(g.fecha), badgeClase: "badge-azul" }))}
          </Plegable>
        )}

        {esperando.length > 0 && (
          <Plegable
            titulo="Notificados, esperando respuesta"
            cantidad={esperando.length}
            ayuda={`Ya se les avisó. Vuelven a la lista ${DIAS_ENTRE_AVISOS} días después del último aviso si no han venido.`}
          >
            {esperando.map((g) => tarjeta(g, { badge: "Esperando", badgeClase: "badge-azul", mostrarBoton: false }))}
          </Plegable>
        )}

        {descartados.length > 0 && (
          <Plegable
            titulo={`Descartados (${MAX_AVISOS} avisos sin venir)`}
            cantidad={descartados.length}
            ayuda="Vuelven a aparecer 1 año después del último aviso, con su historial. Si alguno se marcó por error, usa Deshacer."
          >
            {descartados.map((g) => tarjeta(g, { badge: "Descartado", badgeClase: "badge-rojo", mostrarBoton: false }))}
          </Plegable>
        )}
      </div>
    </div>
  );
}
