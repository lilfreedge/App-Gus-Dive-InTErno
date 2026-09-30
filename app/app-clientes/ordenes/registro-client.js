"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { IconRefresh } from "@/components/icons";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  "En Hold": "badge-rojo",
  Entregado: "badge-verde",
};

// Pestañas (pedido explícito, mid-flow: "agrega aqui junto a abiertas,
// pendientes por trabajar, pendientes por entregar. agrega todo lo demas
// que hay en inicio y que sea clickeable asi") -- las 3 últimas replican
// las secciones que ya existían en Inicio (Órdenes en espera/Hold, En
// prueba hidrostática, Enviadas a reparación), con el mismo criterio de
// filtro que usa esa pantalla.
//
// "Abiertas" se sacó de esta fila de pestañas (feedback sobre v40, pedido
// explícito: "ordenes abiertas ponlo entre registro de ordenes y
// registrar orden") -- vive en el encabezado de arriba, entre el título y
// el botón "+ Registrar orden", en vez de ser una pestaña más entre seis.
// (Nota v42/28-sep: ese encabezado, junto con el título y "+ Registrar
// orden", se movió de ordenes/page.js a este componente -- ver más abajo,
// "Órdenes abiertas" necesitaba compartir el estado `tab` para poder ser
// clickeable, y page.js es un server component, no puede tener ese estado.)
//
// "Órdenes cerradas" se agregó al final (feedback sobre v40, pedido
// explícito: "agrega boton de ordenes cerradas despues de Enviadas a
// reparacion") -- antes se había decidido no agregarla para no duplicar
// Historial de órdenes, pero el usuario la pidió igual; usa una lista
// aparte (`cerradas`, ver prop más abajo) porque el resto de las pestañas
// trabaja sobre `ordenes`, que el server sigue trayendo sin las Entregado.
const TABS = [
  { clave: "por_trabajar", label: "Pendientes por trabajar" },
  { clave: "por_entregar", label: "Pendientes por entregar" },
  { clave: "en_hold", label: "En Hold" },
  { clave: "hidrostatica", label: "En prueba hidrostática" },
  { clave: "reparacion", label: "Enviadas a reparación" },
  { clave: "cerradas", label: "Órdenes cerradas" },
];

// Opciones de orden ampliadas (feedback en vivo, 29-sep-2026, pedido
// explícito: "pon que se pueda filtrar por: No. de orden, mas recientes
// primero/ultimo, orden alfabetico") -- antes solo había fecha ascendente/
// descendente.
const SORTS = [
  { clave: "fecha_desc", label: "Más recientes primero" },
  { clave: "fecha_asc", label: "Más antiguas primero" },
  { clave: "no_orden", label: "No. de orden" },
  { clave: "alfabetico", label: "Orden alfabético (cliente)" },
];

// Criterio de cada pestaña (menos "cerradas", que ya es su propia lista, y
// "todas"/Órdenes abiertas, que es `ordenes` sin filtrar) -- centralizado
// acá para que el conteo que se muestra en cada botón (pedido explícito,
// 28-sep-2026: "pon que aparezcan las cantidades en cada filtro, asi como
// estan en Ordenes abiertas") use exactamente el mismo criterio que ya usa
// el filtro de la lista de abajo, en vez de mantener la misma lógica
// escrita dos veces y arriesgar que se desincronicen.
const CRITERIOS = {
  // Mismo criterio que Inicio: excluye las que ya salieron a
  // hidrostática/reparación y no han vuelto -- esas se cuentan en su
  // propia pestaña, no acá también.
  por_trabajar: (o) =>
    (o.estado === "Pendiente por trabajar" || o.estado === "En proceso") &&
    !((o.fecha_envio || o.fecha_envio_hidrostatica) && !o.fecha_retorno_tienda),
  por_entregar: (o) => o.estado === "Pendiente por despachar",
  en_hold: (o) => o.en_espera,
  hidrostatica: (o) => o.fecha_envio_hidrostatica && !o.fecha_retorno_tienda,
  reparacion: (o) => o.fecha_envio && !o.fecha_retorno_tienda,
};

// Cola de trabajo de "Registro" (23-sep-2026, pedido explícito tras
// probar v24 en vivo): ordenes ya viene sin las Entregado (filtradas en
// el server). Acá solo se reparten entre las pestañas + el buscador de
// cliente, todo combinado (tab Y búsqueda a la vez). `puedeRegistrar`
// nueva (v42/28-sep, ver nota arriba) -- antes vivía solo en page.js, para
// el botón "+ Registrar orden" que ahora también se arma acá.
export default function RegistroClient({ ordenes, cerradas = [], puedeActualizarEstado = true, puedeRegistrar = false }) {
  const [tab, setTab] = useState("por_trabajar");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("fecha_asc");

  // Cuenta de cada pestaña, sin importar cuál esté activa ni el buscador
  // de cliente (mismo criterio que ya usaba la píldora "Órdenes abiertas":
  // un total sin filtrar por texto) -- así cada botón muestra su propio
  // número todo el tiempo, no solo el de la pestaña seleccionada.
  const conteos = useMemo(
    () => ({
      todas: ordenes.length,
      por_trabajar: ordenes.filter(CRITERIOS.por_trabajar).length,
      por_entregar: ordenes.filter(CRITERIOS.por_entregar).length,
      en_hold: ordenes.filter(CRITERIOS.en_hold).length,
      hidrostatica: ordenes.filter(CRITERIOS.hidrostatica).length,
      reparacion: ordenes.filter(CRITERIOS.reparacion).length,
      cerradas: cerradas.length,
    }),
    [ordenes, cerradas]
  );

  const filtrados = useMemo(() => {
    let base = tab === "cerradas" ? cerradas : ordenes;
    // tab === "todas" (Órdenes abiertas, ver más abajo) no filtra nada más
    // -- muestra todo lo que no está Entregado, sin dividir por categoría.
    if (tab !== "cerradas" && tab !== "todas" && CRITERIOS[tab]) {
      base = base.filter(CRITERIOS[tab]);
    }
    const query = q.trim().toLowerCase();
    if (query) {
      base = base.filter((o) => o.cliente_nombre_snapshot?.toLowerCase().includes(query));
    }
    base = [...base].sort((a, b) => {
      if (sort === "fecha_desc") return b.fecha.localeCompare(a.fecha);
      if (sort === "no_orden") return (Number(a.no_orden_fisico ?? a.folio) || 0) - (Number(b.no_orden_fisico ?? b.folio) || 0);
      if (sort === "alfabetico") return (a.cliente_nombre_snapshot || "").localeCompare(b.cliente_nombre_snapshot || "");
      return a.fecha.localeCompare(b.fecha); // fecha_asc (default)
    });
    return base;
  }, [ordenes, cerradas, tab, q, sort]);

  return (
    <div>
      {/* Título + "Órdenes abiertas" + "+ Registrar orden" -- movidos acá
          desde ordenes/page.js (v42/28-sep) para que "Órdenes abiertas"
          pueda ser clickeable y compartir el estado `tab` de abajo. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>Registro de Órdenes</h1>
        {/* "Ver todas" (renombrado de "Órdenes abiertas", feedback en vivo,
            29-sep-2026, pedido explícito: "cambiar 'ordenes abiertas' por
            'ver todas'") -- mismo botón, mismo criterio (todo lo que no
            está Entregado), solo cambia la etiqueta. Historia previa
            (feedback sobre v40 / v42) -- ver conteos.todas más arriba. */}
        <button
          type="button"
          className={`period-btn ${tab === "todas" ? "period-btn-active" : ""}`}
          onClick={() => setTab("todas")}
          style={{ flex: "0 0 auto", padding: "9px 16px", whiteSpace: "nowrap" }}
        >
          Ver todas ({conteos.todas})
        </button>
        {puedeRegistrar && (
          <Link href="/app-clientes/ordenes/nueva">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
              + Registrar orden
            </button>
          </Link>
        )}
      </div>

      {/* flexWrap (pedido explícito, mid-flow: "que se vea cuadrado todo")
          -- con 6 pestañas ya no caben en una sola fila; envuelven de a 3
          por fila (flex-basis ~30%) para que las dos filas queden parejas,
          en vez de una fila larga apretada o una pestaña sola y suelta. */}
      <div className="period-toggle" style={{ marginBottom: 14, flexWrap: "wrap", rowGap: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.clave}
            type="button"
            className={`period-btn ${tab === t.clave ? "period-btn-active" : ""}`}
            onClick={() => setTab(t.clave)}
            style={{ flex: "1 1 30%" }}
          >
            {t.label} ({conteos[t.clave]})
          </button>
        ))}
      </div>

      {/* Búsqueda y orden al mismo nivel, con el control de orden más chico
          y sutil (feedback en vivo, 29-sep-2026, pedido explícito: "pon el
          filtro mas sutil... pon el search y el filtrar al mismo nivel, que
          el boton de filtrar sea mas chico") -- antes eran 2 bloques
          apilados, con un <select> de ancho completo y su propia etiqueta
          "Ordenar por" arriba, mucho más protagonismo del que necesita un
          ajuste secundario. El buscador sigue siendo lo principal (flex: 1);
          el de orden queda angosto y discreto al lado, con aria-label en
          vez de <label> visible. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginTop: 0, marginBottom: 0, flex: 1, minWidth: 0 }}
        />
        <select
          id="sort_ordenes"
          aria-label="Ordenar por"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            marginTop: 0,
            marginBottom: 0,
            width: "auto",
            flexShrink: 0,
            fontSize: 12.5,
            padding: "8px 10px",
            color: "var(--texto-suave)",
          }}
        >
          {SORTS.map((s) => (
            <option key={s.clave} value={s.clave}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {filtrados.length === 0 ? (
          <div className="empty">
            {tab === "cerradas"
              ? "No hay órdenes cerradas recientes."
              : ordenes.length === 0
                ? "No hay órdenes abiertas."
                : "Ninguna orden coincide con esos filtros."}
          </div>
        ) : (
          filtrados.map((o) => (
            <div key={o.id} className="list-item" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* `flex: 1` en el link (feedback en vivo, 29-sep-2026, pedido
                  explícito: "que el estado... salga a la derecha, alineados.
                  Y el boton de actualizar el seguimiento justo a la
                  izquierda del boton") -- antes ni el link ni el grupo de
                  abajo llevaban flex, así que el botón y el sello quedaban
                  pegados al texto en vez de alineados contra el borde
                  derecho de la fila. Ahora el título ocupa todo el espacio
                  libre y el grupo [botón + sello] queda siempre pegado a la
                  derecha, uno junto al otro. */}
              <Link
                href={`/app-clientes/ordenes/${o.id}`}
                style={{ display: "block", flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
              >
                <span className="list-item-title">
                  <span className="folio-tag">No. {o.no_orden_fisico ?? o.folio}</span>
                  {o.cliente_nombre_snapshot} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                </span>
                <div className="list-item-bottom">
                  {/* Folio quitado de aquí (pedido explícito, 27-sep-2026:
                      "borra el folio de aqui, ponlo invisible") -- en esta
                      lista ya no se muestra, solo el No. de orden del
                      talonario (arriba) y la fecha. */}
                  <div className="list-item-meta">{formatFechaDDMMAAAADeDate(o.fecha)}</div>
                </div>
              </Link>
              {/* Shortcut a "Actualizar estado de orden" (item 11, pedido
                  explícito, 25-sep-2026: "poner boton aqui tipo shortcut
                  para llegar a 'Actualizar estado de orden', en cada
                  orden") -- evita tener que entrar primero a la ficha.
                  ?from=registro (item 11a) le dice a esa pantalla que la
                  miga de pan debe decir "Registro de Órdenes", no "Listado
                  de órdenes". Ícono de refrescar (item 3, pedido explícito,
                  27-sep-2026: "cambiar icono de seguimiento en registro de
                  ordenes... quiero algo relacionado con 'actualizar
                  estado'") -- antes era un check (26-sep-2026, para
                  diferenciarlo del lápiz de "Editar/anular la orden"), pero
                  el usuario pidió algo más asociado a "actualizar estado".
                  Oculto sin el permiso equipos_clientes_actualizar_estado
                  (ronda grande de feedback, 27-sep-2026, pedido explícito).
                  Más grande y azul (28-sep-2026, pedido explícito: "quiero
                  hacer el boton de 'actualizar orden' un poco mas
                  llamativo... mas grande y con color azul?") -- ver
                  .icon-btn-azul en globals.css. */}
              {/* Botón + sello agrupados y pegados a la derecha (ver nota
                  arriba en el Link del título). */}
              <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {puedeActualizarEstado && (
                  <Link
                    href={`/app-clientes/ordenes/${o.id}/editar?from=registro`}
                    className="icon-btn icon-btn-azul"
                    aria-label="Actualizar estado de orden"
                    title="Actualizar estado de orden"
                    style={{ flexShrink: 0 }}
                  >
                    <IconRefresh size={17} />
                  </Link>
                )}
                <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`} style={{ flexShrink: 0 }}>
                  {o.estado}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
