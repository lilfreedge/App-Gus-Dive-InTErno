import Link from "next/link";
import BuscadorLista from "@/components/BuscadorLista";
import { fechaHoraRD, dondeAviso } from "@/lib/avisos-tecnicos";
import { equipoTexto } from "@/lib/whatsapp-tecnico";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import BitacoraMovimientosClient from "./bitacora-movimientos-client";
import { esCambioVisible } from "@/lib/cambios";
import ConInfo from "@/components/ConInfo";

// "Bitácora movimientos en órdenes" (27-sep-2026, pedido explícito: "un
// boton en 'mas'... un registro de todas las veces que cualquier orden es
// editada. para enterarme quien cambio que en cada orden") -- botón
// propio en "Más", distinto de "Historial" (que mezcla ediciones Y
// movimientos anulados de órdenes Y equipos). Este solo trae ediciones de
// ordenes_equipos, sin filtrar por una orden en particular -- para ver de
// un vistazo quién cambió qué en cualquier orden. Misma fuente
// (historial_con_nombre), reutilizando filasOrden (lib/historial-ordenes.js)
// para no desincronizar la lista de campos entre las dos pantallas.
// Arrancó Titular-only como "Historial", pero el mismo día (pedido
// explícito: "pon para yo dar acceso... en administracion") pasó a
// gatearse con un permiso granular propio (equipos_clientes_bitacora_
// movimientos) -- el Titular sigue viendo esto siempre, sin importar el
// valor guardado (ver tieneAcceso en lib/roles.js).
// V32: ?usuario=<id> muestra solo los movimientos de esa persona -- es el
// enlace "Ver sus movimientos en órdenes" de su ficha (Administración ›
// Permisos › tocar el nombre).
// V37: pestaña "Avisos a técnicos" (pedido explícito: "quiero poder ver los
// avisos que se le hacen a los técnicos... algo tipo bitácora"; no quería
// una sección aparte, plan-v37-ronda3.html opción A). ?ver=avisos, y
// ?tecnico=<id> para los de una persona (enlace desde su ficha).
export default async function BitacoraMovimientosPage({ searchParams }) {
  const supabase = createClient();
  const { profile } = await requirePermisoClientes(supabase, "equipos_clientes_bitacora_movimientos");
  const usuarioId = typeof searchParams?.usuario === "string" ? searchParams.usuario : null;
  const verAvisos = searchParams?.ver === "avisos";
  const tecnicoId = typeof searchParams?.tecnico === "string" ? searchParams.tecnico : null;

  let consulta = supabase
    .from("historial_con_nombre")
    .select("*")
    .eq("tabla", "ordenes_equipos")
    .eq("accion", "editar")
    .order("created_at", { ascending: false })
    .limit(300);
  if (usuarioId) consulta = consulta.eq("user_id", usuarioId);
  const { data: cambios } = verAvisos ? { data: [] } : await consulta;

  let avisos = [];
  let errorAvisos = null;
  let nombreTecnico = null;
  if (verAvisos) {
    let qa = supabase
      .from("avisos_tecnicos")
      .select("id, orden_id, tecnico_id, tecnico_nombre, avisado_por_nombre, medio, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (tecnicoId) qa = qa.eq("tecnico_id", tecnicoId);
    const { data, error } = await qa;
    errorAvisos = error;
    avisos = data || [];
    const ids = [...new Set(avisos.map((a) => a.orden_id))];
    let ordenesPorId = {};
    for (let i = 0; i < ids.length; i += 150) {
      const { data: os } = await supabase
        .from("ordenes_equipos")
        .select("id, folio, no_orden_fisico, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, equipo_marca_snapshot, equipo_modelo_snapshot")
        .in("id", ids.slice(i, i + 150));
      for (const o of os || []) ordenesPorId[o.id] = o;
    }
    avisos = avisos.map((a) => ({ ...a, orden: ordenesPorId[a.orden_id] || null }));
    if (tecnicoId) nombreTecnico = avisos[0]?.tecnico_nombre || "esta persona";
  }

  let nombreUsuario = null;
  if (usuarioId) {
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", usuarioId).maybeSingle();
    nombreUsuario = p?.full_name || "esta persona";
  }

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
            { label: "Bitácora de órdenes" },
          ]}
        />
        {/* V32: el subtítulo pasa al botón ⓘ junto al título. */}
        <ConInfo style={{ marginBottom: 12 }} texto="Quién editó qué, agrupado por orden -- las más recientes primero.">
          <h1 className="page-title" style={{ margin: 0 }}>
            Bitácora de órdenes
          </h1>
        </ConInfo>
        {nombreUsuario && !verAvisos && (
          <div className="aviso-box" style={{ marginTop: 0, marginBottom: 12 }}>
            Solo los movimientos de <b>{nombreUsuario}</b>.{" "}
            <Link href="/app-clientes/administracion/bitacora-movimientos" style={{ fontWeight: 700, color: "inherit" }}>
              Ver todos
            </Link>
          </div>
        )}

        {/* Agrupado por orden + buscador por No. de orden (1-oct-2026,
            pedido explícito: "que dentro de 'bitacora movimientos en
            ordenes' haya una barra de search para buscar no. de orden. Y
            que cada orden sea un boton y dentro aparezcan todos sus
            movimientos. Y pon los botones mas pequenos, se ven muy
            voluminosos") -- antes cada edición individual se mostraba como
            su propia tarjeta grande, sin agrupar; ver
            bitacora-movimientos-client.js. "Borrar toda la bitácora"
            (28-sep-2026, pedido explícito) se mantiene igual, solo
            Titular. */}
        {/* Ediciones sin ningún cambio real, ocultas (feedback sobre v52, ver
            lib/cambios.js) -- no se borran de la base de datos. */}
        <div className="pastillas" style={{ marginBottom: 12 }}>
          <Link
            href="/app-clientes/administracion/bitacora-movimientos"
            className={`pastilla${verAvisos ? "" : " pastilla-activa"}`}
            style={{ textDecoration: "none" }}
          >
            Cambios en órdenes
          </Link>
          <Link
            href="/app-clientes/administracion/bitacora-movimientos?ver=avisos"
            className={`pastilla${verAvisos ? " pastilla-activa" : ""}`}
            style={{ textDecoration: "none" }}
          >
            Avisos a técnicos
          </Link>
        </div>
        {verAvisos ? (
          <AvisosTecnicos avisos={avisos} error={errorAvisos} nombreTecnico={nombreTecnico} />
        ) : (
          <BitacoraMovimientosClient cambios={(cambios || []).filter(esCambioVisible)} esTitular={!!profile?.es_titular} />
        )}
      </div>
    </div>
  );
}

function AvisosTecnicos({ avisos, error, nombreTecnico }) {
  if (error) {
    return (
      <div className="error-box">
        No se pudieron cargar los avisos ({error.message}). Falta correr migration_70.sql en Supabase.
      </div>
    );
  }
  return (
    <>
      {nombreTecnico && (
        <div className="aviso-box" style={{ marginTop: 0, marginBottom: 12 }}>
          Solo los avisos a <b>{nombreTecnico}</b>.{" "}
          <Link href="/app-clientes/administracion/bitacora-movimientos?ver=avisos" style={{ fontWeight: 700, color: "inherit" }}>
            Ver todos
          </Link>
        </div>
      )}
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Cada vez que alguien toca &quot;Avisar en el grupo&quot;. La app sabe que se abrió WhatsApp con el mensaje, no si se le
        dio Enviar.
      </div>
      <BuscadorLista placeholder="Buscar técnico, orden o cliente...">
        <div className="card">
          {avisos.length === 0 && <div className="empty">Todavía no hay avisos.</div>}
          {avisos.map((a) => (
            <Link
              key={a.id}
              href={`/app-clientes/ordenes/${a.orden_id}`}
              className="list-item"
              data-buscar={`${a.tecnico_nombre || ""} ${a.avisado_por_nombre || ""}`}
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <b>
                  Aviso a {(a.tecnico_nombre || "—").split(" ")[0]} · Orden No.{" "}
                  {a.orden ? a.orden.no_orden_fisico ?? a.orden.folio : "—"}
                </b>
                <span style={{ fontSize: 12, color: "var(--texto-suave)", whiteSpace: "nowrap" }}>{fechaHoraRD(a.created_at)}</span>
              </div>
              {a.orden && (
                <div className="list-item-meta">
                  {a.orden.cliente_nombre_snapshot} · {equipoTexto(a.orden)}
                </div>
              )}
              <div className="list-item-meta">
                Lo avisó: <b style={{ color: "var(--texto)" }}>{a.avisado_por_nombre || "—"}</b> · {dondeAviso(a.medio)}
              </div>
            </Link>
          ))}
        </div>
      </BuscadorLista>
    </>
  );
}
