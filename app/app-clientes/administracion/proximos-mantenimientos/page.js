import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO, sumarDias, sumarMeses } from "@/lib/fechas";

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
      .select("cliente_id, fecha, estado, folio, no_orden_fisico")
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

// Mensaje ya escrito al abrir WhatsApp (pedido explícito: "2. siii" al
// texto propuesto) -- se puede cambiar antes de enviarlo.
function primerNombre(cliente) {
  return String(cliente?.nombre || "").trim().split(/\s+/)[0] || "";
}

function mensajeMantenimiento(cliente, equipos) {
  const nombres = equipos.map((e) => nombreEquipo(e)).filter(Boolean);
  let equiposTxt;
  if (nombres.length <= 1) equiposTxt = `A tu ${nombres[0] || "equipo"} le toca`;
  else equiposTxt = `A tu ${nombres.slice(0, -1).join(", a tu ")} y a tu ${nombres[nombres.length - 1]} les toca`;
  const hola = primerNombre(cliente) ? `Hola ${primerNombre(cliente)}` : "Hola";
  return `${hola}, te saluda Gus Dive Center. ${equiposTxt} su mantenimiento. ¿Cuándo te queda bien ${
    nombres.length > 1 ? "traerlos" : "traerlo"
  }?`;
}

function mensajeSinVisita(cliente) {
  const hola = primerNombre(cliente) ? `Hola ${primerNombre(cliente)}` : "Hola";
  return `${hola}, te saluda Gus Dive Center. Hace tiempo que no te vemos por la tienda. ¿Cómo están tus equipos? Si les toca mantenimiento, con gusto te ayudamos.`;
}

function TarjetaCliente({ cliente, badge, badgeClase, mensaje, children }) {
  const tel = cliente?.telefono ? telefonoInternacional(cliente.telefono) : "";
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
        <span className={`badge ${badgeClase}`} style={{ whiteSpace: "nowrap" }}>
          {badge}
        </span>
      </div>
      <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>{children}</div>
      {/* Solo WhatsApp (pedido explícito: "Solo me interesaría el de
          whatsapp y que se llame, notificar vía whatsapp") -- abre el chat
          con ese número; "Llamar" se quitó. */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        {tel && (
          <a
            href={`https://wa.me/${tel}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn secondary"
            style={{ marginTop: 0, width: "auto", padding: "7px 12px", fontSize: 12.5, textDecoration: "none" }}
          >
            Notificar vía WhatsApp
          </a>
        )}
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

export default async function ClientesPorContactarPage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_contactar", "/app-clientes/mas");

  const [{ data: equipos }, ordenes] = await Promise.all([
    supabase
      .from("equipos_del_cliente")
      .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie, proximo_mantenimiento_recomendado")
      .not("proximo_mantenimiento_recomendado", "is", null)
      .order("proximo_mantenimiento_recomendado", { ascending: true }),
    todasLasOrdenes(supabase),
  ]);

  const hoy = hoyISO();
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
  const vencidos = [];
  const proximos = [];
  const masAdelante = [];
  for (const [clienteId, lista] of porCliente) {
    const fecha = lista[0].proximo_mantenimiento_recomendado; // ya vienen ordenados
    const grupo = { clienteId, equipos: lista, fecha };
    if (fecha < hoy) vencidos.push(grupo);
    else if (fecha <= limiteProximos) proximos.push(grupo);
    else masAdelante.push(grupo);
  }

  // 2) Sin visitas hace más de 12 meses: última orden (fecha de ingreso)
  //    más vieja que el corte, sin orden abierta ahora mismo y sin salir ya
  //    arriba.
  const ultimaPorCliente = new Map();
  const conOrdenAbierta = new Set();
  for (const o of ordenes) {
    if (!o.cliente_id) continue;
    if (o.estado !== "Entregado") conOrdenAbierta.add(o.cliente_id);
    const prev = ultimaPorCliente.get(o.cliente_id);
    if (o.fecha && (!prev || o.fecha > prev.fecha)) ultimaPorCliente.set(o.cliente_id, o);
  }
  const sinVisita = [...ultimaPorCliente.entries()]
    .filter(([id, o]) => o.fecha < corteSinVisita && !conOrdenAbierta.has(id) && !porCliente.has(id))
    .map(([id, o]) => ({ clienteId: id, orden: o }))
    .sort((a, b) => (a.orden.fecha < b.orden.fecha ? -1 : 1));

  // Clientes, en una sola consulta.
  const ids = [...new Set([...porCliente.keys(), ...sinVisita.map((c) => c.clienteId)])];
  const { data: clientes } =
    ids.length > 0
      ? await supabase.from("clientes_equipos").select("id, nombre, telefono").in("id", ids)
      : { data: [] };
  const clientePorId = new Map((clientes || []).map((c) => [c.id, c]));

  const motivoEquipos = (grupo, verbo) =>
    grupo.equipos.map((e) => (
      <div key={e.id}>
        Mantenimiento recomendado de su <b>{nombreEquipo(e)}</b>
        {e.serie ? ` (No. ${e.serie})` : ""}. {verbo} el {formatFechaDDMMAAAADeDate(e.proximo_mantenimiento_recomendado)}.
      </div>
    ));

  const nada = vencidos.length + proximos.length + sinVisita.length + masAdelante.length === 0;

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

        <div className="stat-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
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
        </div>

        {nada && <div className="empty">Por ahora no hay a nadie que contactar.</div>}

        {vencidos.length > 0 && (
          <>
            <div className="section-title">Mantenimiento vencido</div>
            {vencidos.map((g) => (
              <TarjetaCliente
                key={g.clienteId}
                cliente={clientePorId.get(g.clienteId) || { id: g.clienteId }}
                badge={haceTexto(diasEntre(g.fecha, hoy))}
                badgeClase="badge-rojo"
                mensaje={mensajeMantenimiento(clientePorId.get(g.clienteId), g.equipos)}
              >
                {motivoEquipos(g, "Le tocaba")}
              </TarjetaCliente>
            ))}
          </>
        )}

        {proximos.length > 0 && (
          <>
            <div className="section-title">Le toca en los próximos {DIAS_PROXIMOS} días</div>
            {proximos.map((g) => (
              <TarjetaCliente
                key={g.clienteId}
                cliente={clientePorId.get(g.clienteId) || { id: g.clienteId }}
                badge={faltaTexto(diasEntre(hoy, g.fecha))}
                badgeClase="badge-amarillo"
                mensaje={mensajeMantenimiento(clientePorId.get(g.clienteId), g.equipos)}
              >
                {motivoEquipos(g, "Le toca")}
              </TarjetaCliente>
            ))}
          </>
        )}

        {sinVisita.length > 0 && (
          <>
            <div className="section-title">No viene hace más de {MESES_SIN_VISITA} meses</div>
            {sinVisita.map((c) => {
              const numero = c.orden.no_orden_fisico || c.orden.folio;
              return (
                <TarjetaCliente
                  key={c.clienteId}
                  cliente={clientePorId.get(c.clienteId) || { id: c.clienteId }}
                  badge={`Hace ${mesesEntre(c.orden.fecha, hoy)} meses`}
                  badgeClase=""
                  mensaje={mensajeSinVisita(clientePorId.get(c.clienteId))}
                >
                  Su última orden fue {numero ? <>la <b>#{numero}</b>, </> : ""}el{" "}
                  {formatFechaDDMMAAAADeDate(c.orden.fecha)}.
                </TarjetaCliente>
              );
            })}
          </>
        )}

        {masAdelante.length > 0 && (
          <details style={{ marginTop: 18 }}>
            <summary className="hint-text" style={{ cursor: "pointer", textAlign: "center" }}>
              Más adelante (después de {DIAS_PROXIMOS} días): {masAdelante.length} cliente
              {masAdelante.length === 1 ? "" : "s"} · <b style={{ color: "var(--azul-claro)" }}>Ver</b>
            </summary>
            <div style={{ marginTop: 12 }}>
              {masAdelante.map((g) => (
                <TarjetaCliente
                  key={g.clienteId}
                  cliente={clientePorId.get(g.clienteId) || { id: g.clienteId }}
                  badge={formatFechaDDMMAAAADeDate(g.fecha)}
                  badgeClase="badge-azul"
                  mensaje={mensajeMantenimiento(clientePorId.get(g.clienteId), g.equipos)}
                >
                  {motivoEquipos(g, "Le toca")}
                </TarjetaCliente>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
