import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO, sumarMeses } from "@/lib/fechas";

// "Próximos mantenimientos" (1-oct-2026, nueva feature, pedido explícito:
// "que cada equipo guarde esta info para yo poder consultar en alguna
// parte en caso de ser necesario... Necesito un lado donde pueda hacer
// ese tipos de consultar y saber que cliente llamar") -- lista todos los
// equipos con una fecha recomendada guardada (equipos_del_cliente.
// proximo_mantenimiento_recomendado, migration_46.sql), la más próxima
// primero, resaltando las ya vencidas. Se llena desde el Informe de
// mantenimiento (ver app/app-clientes/ordenes/[id]/informe/form-client.js,
// generarInforme) al marcar "6 meses"/"12 meses". Mismo permiso que
// Reportes -- no se creó uno nuevo, es la misma audiencia que ya puede
// ver esa información.
// V29: renombrado en pantalla a "Clientes por contactar" (pedido
// explícito) -- la ruta sigue siendo /proximos-mantenimientos para no
// romper enlaces guardados. Y sección nueva abajo (maqueta aprobada, "3.
// ok" a 12 meses): clientes cuya última orden (fecha de ingreso) fue hace
// más de 12 meses. No se repite un cliente que ya sale arriba, ni uno con
// una orden abierta (no Entregada) en este momento.
const MESES_SIN_VISITA = 12;

// Todas las órdenes (solo cliente, fecha y estado), de a 1000 -- el
// límite por consulta de Supabase -- para no cortar la lista en silencio
// cuando haya más.
async function todasLasOrdenes(supabase) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("ordenes_equipos")
      .select("cliente_id, fecha, estado")
      .order("id")
      .range(desde, desde + 999);
    if (error || !data) break;
    filas.push(...data);
    if (data.length < 1000) break;
  }
  return filas;
}

function mesesEntre(desdeISO, hastaISO) {
  const a = new Date(desdeISO);
  const b = new Date(hastaISO);
  let meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) meses -= 1;
  return meses;
}

export default async function ProximosMantenimientosPage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_reportes", "/app-clientes/mas");

  const [{ data: equipos }, ordenes] = await Promise.all([
    supabase
      .from("equipos_del_cliente")
      .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie, proximo_mantenimiento_recomendado")
      .not("proximo_mantenimiento_recomendado", "is", null)
      .order("proximo_mantenimiento_recomendado", { ascending: true }),
    todasLasOrdenes(supabase),
  ]);

  const hoy = hoyISO();
  const corte = sumarMeses(hoy, -MESES_SIN_VISITA);

  // Última orden de cada cliente, y quién tiene una abierta ahora mismo.
  const ultimaPorCliente = new Map();
  const conOrdenAbierta = new Set();
  for (const o of ordenes) {
    if (!o.cliente_id) continue;
    if (o.estado !== "Entregado") conOrdenAbierta.add(o.cliente_id);
    const prev = ultimaPorCliente.get(o.cliente_id);
    if (o.fecha && (!prev || o.fecha > prev)) ultimaPorCliente.set(o.cliente_id, o.fecha);
  }
  const yaArriba = new Set((equipos || []).map((e) => e.cliente_id));
  const sinVisita = [...ultimaPorCliente.entries()]
    .filter(([id, fecha]) => fecha < corte && !conOrdenAbierta.has(id) && !yaArriba.has(id))
    .map(([id, fecha]) => ({ id, fecha }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  // Consulta chica aparte para los clientes (mismo criterio ya usado en
  // todo el proyecto: "consulta chica en vez de embed") -- batcheada con
  // `.in(...)` en vez de una por equipo/cliente.
  const clienteIds = [
    ...new Set([...(equipos || []).map((e) => e.cliente_id), ...sinVisita.map((c) => c.id)].filter(Boolean)),
  ];
  const { data: clientes } =
    clienteIds.length > 0
      ? await supabase.from("clientes_equipos").select("id, nombre, telefono").in("id", clienteIds)
      : { data: [] };
  const clientePorId = new Map((clientes || []).map((c) => [c.id, c]));

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/mas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Clientes por contactar" },
          ]}
        />
        <h1 className="page-title">Clientes por contactar</h1>

        <div className="section-title" style={{ marginTop: 6 }}>
          Mantenimiento recomendado
        </div>
        <p className="hint-text" style={{ marginTop: -4, marginBottom: 8 }}>
          Fecha recomendada guardada desde un Informe de mantenimiento -- las más próximas primero.
        </p>

        {!equipos || equipos.length === 0 ? (
          <div className="empty">Todavía no hay ninguna recomendación guardada.</div>
        ) : (
          <div className="card">
            {equipos.map((e) => {
              const cliente = clientePorId.get(e.cliente_id);
              const vencido = e.proximo_mantenimiento_recomendado < hoy;
              const marcaModelo = [e.marca, e.modelo].filter(Boolean).join(" ");
              return (
                <Link key={e.id} href={`/app-clientes/equipos/${e.id}`} className="list-item" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                  <div className="list-item-top">
                    <div className="list-item-title">{cliente?.nombre || "Cliente"}</div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: vencido ? "var(--rojo)" : "var(--azul-texto)", whiteSpace: "nowrap" }}>
                      {formatFechaDDMMAAAADeDate(e.proximo_mantenimiento_recomendado)}
                      {vencido ? " -- vencido" : ""}
                    </span>
                  </div>
                  <div className="hint-text" style={{ marginTop: 2 }}>
                    {[tipoEquipoLabel(e.tipo_equipo, e.tipo_equipo_otro), marcaModelo].filter(Boolean).join(" · ")}
                    {e.serie ? ` · No. ${e.serie}` : ""}
                  </div>
                  {cliente?.telefono && <div className="hint-text" style={{ marginTop: 2 }}>{cliente.telefono}</div>}
                </Link>
              );
            })}
          </div>
        )}

        <div className="section-title" style={{ marginTop: 22 }}>
          Sin visitas hace más de {MESES_SIN_VISITA} meses
        </div>
        <p className="hint-text" style={{ marginTop: -4, marginBottom: 8 }}>
          Clientes cuya última orden fue hace más de {MESES_SIN_VISITA} meses -- los que más tiempo llevan sin venir,
          primero.
        </p>
        {sinVisita.length === 0 ? (
          <div className="empty">Ningún cliente lleva más de {MESES_SIN_VISITA} meses sin venir.</div>
        ) : (
          <div className="card">
            {sinVisita.map((c) => {
              const cliente = clientePorId.get(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/app-clientes/clientes/${c.id}`}
                  className="list-item"
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                >
                  <div className="list-item-top">
                    <div className="list-item-title">{cliente?.nombre || "Cliente"}</div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#b5691f", whiteSpace: "nowrap" }}>
                      hace {mesesEntre(c.fecha, hoy)} meses
                    </span>
                  </div>
                  <div className="hint-text" style={{ marginTop: 2 }}>
                    Última orden: {formatFechaDDMMAAAADeDate(c.fecha)}
                  </div>
                  {cliente?.telefono && <div className="hint-text" style={{ marginTop: 2 }}>{cliente.telefono}</div>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
