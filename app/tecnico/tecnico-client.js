"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FotoLightbox from "@/components/FotoLightbox";
import ConInfo from "@/components/ConInfo";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { holdActivo, resumenHold, detalleHold, diasEnHold } from "@/lib/holds";
import {
  guardarOrden,
  codigosDe,
  camposCodigos,
  etiquetaPieza,
  piezasDelEquipo,
  motivoNoListo,
  cambiosListo,
  cambiosHold,
  textoListo,
} from "@/lib/orden-tecnico";
import { ICheck, IPlus, IX, IFlecha, IAbajo, IMic, IDoc, IClientes, IComp, IReg, ILock, IPausa, IAlarma } from "./iconos";

// V38 -- Menú del técnico, "Lo que te toca" (maqueta-v38-3.html, opción A).
// Todo se hace aquí mismo: la orden se abre en la lista y se trabaja en
// pasos (informe, códigos, nota, listo); poner en Hold y agregar códigos
// salen en una hoja desde abajo. Siempre pregunta antes de "listo".

const DIA_MS = 24 * 60 * 60 * 1000;
const ATRASO_DIAS = 5; // igual que "Mis órdenes asignadas"

const sinTildes = (t) =>
  String(t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function diasDesde(iso, hoy) {
  if (!iso) return null;
  const n = Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`)) / DIA_MS);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function equipoDe(o) {
  return [tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro), o.equipo_marca_snapshot, o.equipo_modelo_snapshot]
    .filter((x) => x && String(x).trim())
    .join(" ");
}

const numero = (o) => o.no_orden_fisico ?? o.folio;
const LISTOS = "listos"; // ?abrir=listos: la pantalla de "Listos hoy"

export default function TecnicoInicio({
  nombre,
  nombreQuienHace = "",
  ordenesIniciales = [],
  piezas = [],
  recordatorios = [],
  accesos = {},
  hoy,
  abrirId = null,
  como = null,
  informeGuardado = false,
}) {
  const supabase = createClient();
  const [ordenes, setOrdenes] = useState(ordenesIniciales);
  const [recs, setRecs] = useState(recordatorios);
  const [abierta, setAbierta] = useState(abrirId);
  const [avisoInforme, setAvisoInforme] = useState(!!informeGuardado && !!abrirId);
  const empujado = useRef(false);
  const [hoja, setHoja] = useState(null); // { tipo: "codigo" | "listo" | "ok" | "hold", id }
  const [notas, setNotas] = useState(() =>
    Object.fromEntries(ordenesIniciales.map((o) => [o.id, o.notas_tecnico_regulador || ""]))
  );
  const [guardando, setGuardando] = useState(null);
  const [errores, setErrores] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [consulta, setConsulta] = useState("");
  const [codigoHold, setCodigoHold] = useState("");
  const [errorHoja, setErrorHoja] = useState("");
  const [tiendaAuto, setTiendaAuto] = useState({}); // órdenes a las que "listo" les puso "Se trabajó en tienda"

  const qComo = como ? `como=${como}` : "";
  const conComo = (href) => (como ? `${href}${href.includes("?") ? "&" : "?"}${qComo}` : href);

  const ordenPorId = (id) => ordenes.find((o) => o.id === id);

  // V40 -- La orden se abre sola, en su propia pantalla (pedido explícito:
  // "que cuando abra un mantenimiento sea un botón que abra eso solo, hoy se
  // ve como un dropdown y se pueden ver las cosas de abajo, esto pudiera
  // confundirlo"). Se anota en la dirección (?abrir=) para que el botón de
  // atrás del celular lo devuelva a sus trabajos.
  useEffect(() => {
    function alVolver() {
      const id = new URLSearchParams(window.location.search).get("abrir");
      empujado.current = false;
      setAbierta(id || null);
      setAvisoInforme(false);
      setHoja((h) => (h && h.tipo === "ok" ? h : null));
    }
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);

  function direccionCon(id) {
    const u = new URL(window.location.href);
    if (id) u.searchParams.set("abrir", id);
    else u.searchParams.delete("abrir");
    u.searchParams.delete("informe");
    return u.pathname + u.search + u.hash;
  }

  function abrirOrden(id) {
    setAbierta(id);
    setAvisoInforme(false);
    try {
      window.history.pushState({ tecnicoOrden: id }, "", direccionCon(id));
      empujado.current = true;
    } catch {
      // sin historial (no pasa en el celular), igual se abre
    }
    window.scrollTo(0, 0);
  }

  function cerrarOrden() {
    setAbierta(null);
    setAvisoInforme(false);
    try {
      if (empujado.current) {
        empujado.current = false;
        window.history.back();
      } else {
        window.history.replaceState(null, "", direccionCon(null));
      }
    } catch {
      // nada
    }
    window.scrollTo(0, 0);
  }

  async function cambiar(orden, cambios, clave) {
    setGuardando(clave || orden.id);
    setErrores((e) => ({ ...e, [orden.id]: "" }));
    try {
      const nueva = await guardarOrden(supabase, orden, cambios);
      setOrdenes((prev) => prev.map((o) => (o.id === nueva.id ? nueva : o)));
      return nueva;
    } catch (e) {
      const msg = e?.message ? `No se pudo guardar: ${e.message}` : "No se pudo guardar. Intenta de nuevo.";
      setErrores((er) => ({ ...er, [orden.id]: msg }));
      setErrorHoja(msg);
      return null;
    } finally {
      setGuardando(null);
    }
  }

  function abrirHoja(tipo, id) {
    setErrorHoja("");
    setBusqueda("");
    setConsulta("");
    setCodigoHold("");
    setHoja({ tipo, id });
  }

  async function marcarHecho(r) {
    setGuardando(r.key);
    setErrores((e) => ({ ...e, [r.key]: "" }));
    const { error } = await supabase
      .from("recordatorios_hechos")
      .insert({ recordatorio_id: r.recordatorioId, compresor_id: r.compresorId, nombre_usuario: nombreQuienHace || null });
    setGuardando(null);
    if (error) return setErrores((e) => ({ ...e, [r.key]: "No se pudo anotar. Intenta de nuevo." }));
    setRecs((prev) => prev.filter((x) => x.key !== r.key));
  }

  async function guardarNota(o) {
    const texto = (notas[o.id] || "").trim();
    await cambiar(o, { notas_tecnico_regulador: texto || null }, `nota-${o.id}`);
  }

  async function agregarCodigo(o, pieza) {
    const lista = codigosDe(o);
    const etiqueta = etiquetaPieza(pieza);
    if (lista.some((r) => r.nombre === etiqueta)) return;
    await cambiar(o, camposCodigos([...lista, { nombre: etiqueta, origen: "manual" }]), `cod-${pieza.id}`);
  }

  async function quitarCodigo(o, i) {
    const lista = codigosDe(o);
    await cambiar(o, camposCodigos(lista.filter((_, idx) => idx !== i)), `quitar-${o.id}-${i}`);
  }

  async function confirmarListo(o) {
    const cambios = cambiosListo(o);
    const texto = (notas[o.id] || "").trim();
    if (texto !== (o.notas_tecnico_regulador || "").trim()) cambios.notas_tecnico_regulador = texto || null;
    const nueva = await cambiar(o, cambios, "listo");
    if (!nueva) return;
    setTiendaAuto((t) => ({ ...t, [o.id]: !!cambios.reparacion_en_tienda }));
    cerrarOrden();
    setHoja({ tipo: "ok", id: o.id });
  }

  async function deshacerListo(o) {
    const cambios = { fecha_listo_entrega: null };
    if (tiendaAuto[o.id]) cambios.reparacion_en_tienda = false;
    const nueva = await cambiar(o, cambios, `deshacer-${o.id}`);
    if (!nueva) return;
    setHoja(null);
    abrirOrden(o.id);
  }

  async function ponerHold(o) {
    if (!consulta.trim()) return setErrorHoja("Escribe qué hay que preguntarle al cliente.");
    const nueva = await cambiar(o, cambiosHold(o, { consulta, codigo: codigoHold }), "hold");
    if (!nueva) return;
    setHoja(null);
    cerrarOrden();
  }

  // ---------------------------------------------------------------- listas
  const porHacer = ordenes.filter((o) => !holdActivo(o.holds) && !o.fecha_listo_entrega);
  const enHold = ordenes.filter((o) => holdActivo(o.holds));
  const listosHoy = ordenes.filter((o) => !holdActivo(o.holds) && o.fecha_listo_entrega === hoy);
  const recVencidos = recs.filter((r) => r.estado === "vencido");
  const recPronto = recs.filter((r) => r.estado === "pronto");
  const total = porHacer.length + recs.length;

  // ---------------------------------------------------------------- piezas
  // Ojo: estas piezas se llaman como funciones ({orden(o)}), no como
  // <Orden />, para que el teclado no se cierre al escribir (si fueran
  // componentes declarados aquí adentro, React los volvería a crear en cada
  // letra).
  function recordatorio(r) {
    const color = r.estado === "vencido" ? "rojo" : "ambar";
    let accion = null;
    if (r.reinicia === "hecho") {
      accion = (
        <button type="button" className="tec-btn verde chico" disabled={guardando === r.key} onClick={() => marcarHecho(r)}>
          <ICheck size={20} /> {guardando === r.key ? "..." : "Hecho"}
        </button>
      );
    } else if (r.compresorId && accesos.registrarCompresor) {
      accion = (
        <Link
          href={conComo(`/tecnico/compresores/${r.compresorId}?tipo=${encodeURIComponent(r.reinicia)}`)}
          className="tec-btn azul chico"
        >
          Registrar
        </Link>
      );
    }
    return (
      <div className={`tec-card ${color}`}>
        <div className="tec-card-top fijo">
          <span className={`tec-icono ${color}`}>{r.compresorId ? <IComp /> : <IAlarma />}</span>
          <div className="tec-card-main">
            <div className="tec-titulo">{r.titulo}</div>
            <div className={`tec-linea ${color}`}>{r.texto}</div>
            {errores[r.key] && <div className="tec-error">{errores[r.key]}</div>}
          </div>
          {accion}
        </div>
      </div>
    );
  }

  function lineaOrden(o) {
    const dias = diasDesde(o.fecha, hoy);
    const partes = [o.que_se_hara || "Sin servicio"];
    if (dias === 0) partes.push("llegó hoy");
    else if (dias !== null && dias > ATRASO_DIAS) partes.push(`lleva ${dias} días, atrasada`);
    else if (dias !== null) partes.push(`llegó hace ${dias} día${dias === 1 ? "" : "s"}`);
    if (o.tipo_equipo === "Reguladores") partes.push(o.informe_mantenimiento ? "informe listo ✓" : "falta el informe");
    return partes.join(" · ");
  }

  // Lo que dijo el cliente, el cliente, la serie y la autorización (va
  // arriba en la orden abierta y en la que está esperando al cliente).
  function datosOrden(o) {
    return (
      <>
        {/* V40: en los reguladores, también los "Problemas reportados por
            cliente" y los "Daños visibles" que se anotaron al registrar la
            orden (el técnico ya no los ve en el informe). */}
        {(o.regulador_problemas_reportados || o.notas) && (
          <div className="tec-dijo">
            <div className="tec-dijo-t">LO QUE DIJO EL CLIENTE</div>
            {o.regulador_problemas_reportados}
            {o.regulador_problemas_reportados && o.notas && <br />}
            {o.notas}
          </div>
        )}
        {o.regulador_danos_visibles && (
          <div className="tec-hint" style={{ fontSize: 14.5 }}>
            Daños visibles: <b style={{ color: "var(--texto)" }}>{o.regulador_danos_visibles}</b>
          </div>
        )}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
          {o.foto_url && <FotoLightbox src={o.foto_url} alt="Foto del equipo" thumbSize={86} />}
          <div style={{ fontSize: 14.5, color: "var(--texto-suave)", lineHeight: 1.45 }}>
            {/* V40: el No. ya sale grande arriba, en la tarjeta. */}
            Cliente: <b style={{ color: "var(--texto)" }}>{o.cliente_nombre_snapshot || "—"}</b>
            {o.serie && (
              <>
                <br />
                Serie {o.serie}
              </>
            )}
          </div>
        </div>
        {o.autorizacion_cliente && (
          <div className="tec-hint" style={{ fontSize: 14.5 }}>
            Autorización del cliente: <b style={{ color: "var(--texto)" }}>{o.autorizacion_cliente}</b>
          </div>
        )}
      </>
    );
  }

  function ordenAbierta(o) {
    const lista = codigosDe(o);
    const esRegulador = o.tipo_equipo === "Reguladores";
    const motivo = motivoNoListo(o);
    const notaCambiada = (notas[o.id] || "").trim() !== (o.notas_tecnico_regulador || "").trim();
    let n = 0;
    return (
      <div className="tec-open">
        {datosOrden(o)}

        {/* V40: primero los códigos y después el informe (pedido explícito:
            "intercambia de lugar: Informe de mantenimiento y ¿Qué códigos
            usaste?"). */}
        <div className="tec-paso">
          <div className="tec-paso-n">{++n}</div>
          <div className="tec-paso-body">
            {/* V40: antes "¿Qué códigos usaste?" (pedido explícito: "Cambiar ... por
                'códigos usados en la orden'. a esto agrégale la 'i'"). */}
            <ConInfo
              style={{ margin: "4px 0 8px" }}
              texto="Aquí pones los códigos que apliquen a esta orden: mangueras, piezas, kits, etc. Si no usaste ninguno, déjalo vacío."
            >
              <span className="tec-paso-t" style={{ margin: 0 }}>
                Códigos usados en la orden
              </span>
            </ConInfo>
            {lista.map((r, i) => (
              <div className="tec-chip" key={`${r.nombre}-${i}`}>
                <span>
                  {r.nombre}
                  {r.origen === "autorizado" && (
                    <span style={{ marginLeft: 6, fontSize: 12, color: "var(--azul-claro)" }}>(autorizado)</span>
                  )}
                </span>
                {accesos.actualizar && r.origen !== "autorizado" && (
                  <button
                    type="button"
                    className="tec-quitar"
                    disabled={guardando === `quitar-${o.id}-${i}`}
                    onClick={() => quitarCodigo(o, i)}
                  >
                    <IX size={15} /> Quitar
                  </button>
                )}
              </div>
            ))}
            {accesos.actualizar && (
              <button type="button" className="tec-btn borde" onClick={() => abrirHoja("codigo", o.id)}>
                <IPlus /> Agregar código
              </button>
            )}
          </div>
        </div>

        {esRegulador && (
          <div className="tec-paso">
            <div className={`tec-paso-n${o.informe_mantenimiento ? " ok" : ""}`}>{++n}</div>
            <div className="tec-paso-body">
              <div className="tec-paso-t">Informe de mantenimiento</div>
              {/* V40: recordatorio de los o-rings (pedido explícito: "los o-rings
                  están incluidos en el mantenimiento, y en caso de que se
                  cambien, esto debe de figurar en el informe"). */}
              <div className="tec-recordatorio">
                Los o-rings van incluidos en el mantenimiento. Si cambiaste alguno, tiene que salir en el informe.
              </div>
              {o.informe_mantenimiento ? (
                <div className="tec-chip ok">
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <ICheck size={20} /> Informe listo
                  </span>
                  {accesos.informe && (
                    <Link
                      href={conComo(`/app-clientes/ordenes/${o.id}/informe?from=tecnico`)}
                      style={{ color: "var(--azul-claro)", fontSize: 14, fontWeight: 800, textDecoration: "none" }}
                    >
                      Ver o cambiar
                    </Link>
                  )}
                </div>
              ) : (
                // V40: un solo botón (pedido explícito: "unifica eso"); que falta
                // ya lo dice la tarjeta de arriba y el número del paso.
                accesos.informe ? (
                  <Link href={conComo(`/app-clientes/ordenes/${o.id}/informe?from=tecnico`)} className="tec-btn azul">
                    <IDoc /> Llenar el informe
                  </Link>
                ) : (
                  <span className="tec-estado rojo">Falta el informe</span>
                )
              )}
            </div>
          </div>
        )}

        <div className="tec-paso">
          <div className="tec-paso-n">{++n}</div>
          <div className="tec-paso-body">
            <div className="tec-paso-t">
              {/* V40: es interna ("la nota del técnico es interna"). */}
              Nota interna <small>(no la ve el cliente)</small>
            </div>
            <textarea
              className="tec-area"
              value={notas[o.id] || ""}
              onChange={(e) => setNotas((x) => ({ ...x, [o.id]: e.target.value }))}
              placeholder="Escribe aquí…"
              disabled={!accesos.actualizar}
            />
            <div className="tec-hint">
              <IMic size={17} /> Puedes hablar: toca el micrófono del teclado.
            </div>
            {accesos.actualizar && notaCambiada && (
              <button
                type="button"
                className="tec-btn borde"
                style={{ marginTop: 8 }}
                disabled={guardando === `nota-${o.id}`}
                onClick={() => guardarNota(o)}
              >
                {guardando === `nota-${o.id}` ? "Guardando..." : "Guardar la nota"}
              </button>
            )}
          </div>
        </div>

        <div className="tec-paso">
          <div className="tec-paso-n">{++n}</div>
          <div className="tec-paso-body">
            <div className="tec-paso-t">¿Terminaste?</div>
            {!accesos.actualizar ? (
              <div className="tec-aviso">No tienes el permiso para ponerla lista.</div>
            ) : motivo ? (
              <>
                <button type="button" className="tec-btn bloqueado" aria-disabled="true">
                  <ILock /> {textoListo(o)}
                </button>
                <div className="tec-aviso">{motivo}</div>
              </>
            ) : (
              <button type="button" className="tec-btn verde" onClick={() => abrirHoja("listo", o.id)}>
                <ICheck /> {textoListo(o)}
              </button>
            )}
          </div>
        </div>

        {errores[o.id] && <div className="tec-error">{errores[o.id]}</div>}

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {accesos.actualizar && (
            <button type="button" className="tec-btn hold" onClick={() => abrirHoja("hold", o.id)}>
              <IPausa /> Hay que preguntarle algo al cliente
            </button>
          )}
          {/* V40: se quitó "Ver la orden completa" (el técnico ya no ve la
              ficha de la orden: "quítale este view al técnico"). */}
        </div>
      </div>
    );
  }

  // `sola`: la orden ya abierta, en su propia pantalla (la tarjeta de arriba
  // ya no se toca para cerrarla: se vuelve con "← Mis trabajos").
  function orden(o, sola = false) {
    const Arriba = sola ? "div" : "button";
    return (
      <div className="tec-card rojo">
        <Arriba
          {...(sola ? { className: "tec-card-top fijo" } : { type: "button", className: "tec-card-top", onClick: () => abrirOrden(o.id) })}
        >
          <span className="tec-icono rojo">
            <IClientes />
          </span>
          <div className="tec-card-main">
            {/* V40: lo principal es el número de orden ("el numero de orden
                es lo principal"); debajo el equipo y la línea de siempre. */}
            <div className="tec-titulo tec-no">No. {numero(o)}</div>
            <div className="tec-equipo">{equipoDe(o)}</div>
            <div className="tec-linea rojo">{lineaOrden(o)}</div>
          </div>
          {/* V40: un botón, como "Registrar" del compresor, en vez de la
              flechita (pedido explícito: "que sean con botones ... no uses el
              dropdown ese porque se va a confundir"). Toda la tarjeta abre. */}
          {!sola && <span className="tec-btn azul chico tec-btn-tarjeta">Trabajar</span>}
        </Arriba>
        {sola && ordenAbierta(o)}
      </div>
    );
  }

  function esperando(o) {
    const h = holdActivo(o.holds);
    const dias = h ? diasEnHold(h) : null;
    return (
      <div className="tec-card ambar">
        <button type="button" className="tec-card-top" onClick={() => abrirOrden(o.id)}>
          <span className="tec-icono ambar">
            <IPausa />
          </span>
          <div className="tec-card-main">
            <div className="tec-titulo tec-no">No. {numero(o)}</div>
            <div className="tec-equipo">{equipoDe(o)}</div>
            <div className="tec-linea ambar">
              {resumenHold(h)}
              {dias === null ? "" : dias === 0 ? " · desde hoy" : ` · hace ${dias} día${dias === 1 ? "" : "s"}`}
            </div>
          </div>
          <span className="tec-btn azul chico tec-btn-tarjeta">Ver</span>
        </button>
      </div>
    );
  }

  // V40 -- La orden que está esperando al cliente, en su propia pantalla
  // (antes llevaba a la ficha de la orden): qué hay que preguntarle y desde
  // cuándo. No hay nada que llenar; cuando el cliente contesta y se quita el
  // Hold, la orden le sale otra vez en "Mis trabajos".
  function esperandoSola(o) {
    const h = holdActivo(o.holds);
    const dias = h ? diasEnHold(h) : null;
    return (
      <div className="tec-card ambar">
        <div className="tec-card-top fijo">
          <span className="tec-icono ambar">
            <IPausa />
          </span>
          <div className="tec-card-main">
            <div className="tec-titulo tec-no">No. {numero(o)}</div>
            <div className="tec-equipo">{equipoDe(o)}</div>
            <div className="tec-linea ambar">
              Esperando al cliente
              {dias === null ? "" : dias === 0 ? " · desde hoy" : ` · hace ${dias} día${dias === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
        <div className="tec-open">
          <div className="tec-espera">
            <div className="tec-dijo-t">LO QUE HAY QUE PREGUNTARLE AL CLIENTE</div>
            {detalleHold(h)}
          </div>
          <div className="tec-hint" style={{ fontSize: 14.5, marginBottom: 6 }}>
            Cuando el cliente conteste, esta orden te sale otra vez en Mis trabajos.
          </div>
          {datosOrden(o)}
        </div>
      </div>
    );
  }

  // V40: "Abrir" pasó a "Trabajar" (pedido explícito: "Cambia 'abrir' por 'trabajar'").
  function grande({ href, onClick, icono, titulo, sub, boton = "Trabajar" }) {
    const dentro = (
      <>
          <span className="tec-icono azul">{icono}</span>
          <div className="tec-card-main">
            <div className="tec-titulo" style={{ fontSize: 16.5 }}>
              {titulo}
            </div>
            {sub && <div className="tec-linea gris">{sub}</div>}
          </div>
          <span className="tec-btn azul chico tec-btn-tarjeta">{boton}</span>
      </>
    );
    if (onClick) {
      return (
        <div className="tec-card">
          <button type="button" className="tec-card-top" onClick={onClick}>
            {dentro}
          </button>
        </div>
      );
    }
    return (
      <Link href={href} className="tec-card" style={{ display: "block", textDecoration: "none" }}>
        <div className="tec-card-top">{dentro}</div>
      </Link>
    );
  }

  // ---------------------------------------------------------------- hojas
  function hoja_() {
    if (!hoja) return null;
    const o = ordenPorId(hoja.id);
    if (!o) return null;
    const cerrar = () => {
      if (!guardando) setHoja(null);
    };
    let contenido = null;

    if (hoja.tipo === "codigo") {
      const lista = codigosDe(o);
      const ya = new Set(lista.map((r) => r.nombre));
      const b = sinTildes(busqueda.trim());
      const opciones = piezasDelEquipo(piezas, o.tipo_equipo)
        .filter((p) => !b || b.split(/\s+/).every((pal) => sinTildes(`${p.codigo || ""} ${p.nombre}`).includes(pal)))
        .slice(0, 80);
      contenido = (
        <>
          <div className="tec-hoja-t">Agregar código</div>
          <div style={{ fontSize: 14.5, color: "var(--texto-suave)" }}>
            {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)} · No. {numero(o)}
          </div>
          <input
            className="tec-input"
            style={{ margin: "10px 0" }}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar código o pieza…"
          />
          {opciones.length === 0 && <div className="tec-hint">No hay códigos con eso.</div>}
          {opciones.map((p) => {
            const agregado = ya.has(etiquetaPieza(p));
            return (
              <button
                type="button"
                key={p.id}
                className="tec-cod"
                disabled={!!guardando}
                onClick={() => !agregado && agregarCodigo(o, p)}
              >
                <span>
                  <b>{p.codigo || p.nombre}</b>
                  {p.codigo && <span className="d">{p.nombre}</span>}
                </span>
                <span className={`tec-cod-mas${agregado ? " ok" : ""}`}>
                  {guardando === `cod-${p.id}` ? "…" : agregado ? <ICheck /> : <IPlus />}
                </span>
              </button>
            );
          })}
          {errorHoja && <div className="tec-error">{errorHoja}</div>}
          <button type="button" className="tec-btn azul" style={{ marginTop: 14 }} onClick={cerrar}>
            Listo
          </button>
        </>
      );
    }

    if (hoja.tipo === "listo") {
      const lista = codigosDe(o);
      contenido = (
        <>
          <div className="tec-hoja-t">¿Ya está listo?</div>
          <div style={{ fontSize: 16, margin: "6px 0 4px" }}>
            {equipoDe(o)} · No. {numero(o)}
          </div>
          {lista.length > 0 ? (
            <div style={{ fontSize: 14.5, color: "var(--texto-suave)" }}>Códigos: {lista.map((r) => r.nombre).join(", ")}</div>
          ) : (
            <div className="tec-aviso">No pusiste ningún código a cobrar. Si no usaste ninguno, puedes seguir.</div>
          )}
          {errorHoja && <div className="tec-error">{errorHoja}</div>}
          <button type="button" className="tec-btn verde" style={{ marginTop: 16 }} disabled={!!guardando} onClick={() => confirmarListo(o)}>
            <ICheck /> {guardando === "listo" ? "Guardando..." : "Sí, está listo"}
          </button>
          <button type="button" className="tec-btn gris" style={{ marginTop: 8 }} onClick={cerrar}>
            No, todavía
          </button>
        </>
      );
    }

    if (hoja.tipo === "ok") {
      contenido = (
        <div className="tec-ok">
          <div className="tec-ok-c">
            <ICheck size={40} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800 }}>¡Listo!</div>
          <div style={{ fontSize: 15, color: "var(--texto-suave)", marginTop: 4 }}>
            El {numero(o)} pasó a “Listos hoy”.
            <br />
            La tienda le avisa al cliente.
          </div>
          {errorHoja && <div className="tec-error">{errorHoja}</div>}
          <button type="button" className="tec-btn azul" style={{ marginTop: 16 }} onClick={cerrar}>
            Seguir
          </button>
          <button
            type="button"
            className="tec-quitar"
            style={{ marginTop: 12, color: "var(--azul-claro)", fontSize: 14.5 }}
            disabled={!!guardando}
            onClick={() => deshacerListo(o)}
          >
            {guardando === `deshacer-${o.id}` ? "Deshaciendo..." : "Me equivoqué, deshacer"}
          </button>
        </div>
      );
    }

    if (hoja.tipo === "hold") {
      contenido = (
        <>
          <div className="tec-hoja-t">¿Qué hay que preguntarle al cliente?</div>
          <div style={{ fontSize: 14.5, color: "var(--texto-suave)" }}>
            {equipoDe(o)} · No. {numero(o)}
          </div>
          <textarea
            className="tec-area"
            style={{ marginTop: 12, minHeight: 100 }}
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setErrorHoja("");
            }}
            placeholder="Ej: la manguera está rota, ¿se la cambiamos?"
          />
          <div className="tec-hint">
            <IMic size={17} /> Puedes hablar: toca el micrófono del teclado.
          </div>
          <div className="tec-item-t" style={{ marginTop: 12 }}>
            Si hace falta una pieza, ¿cuál? <small style={{ fontWeight: 600, color: "var(--texto-suave)" }}>(si sabes)</small>
          </div>
          <input className="tec-input" value={codigoHold} onChange={(e) => setCodigoHold(e.target.value)} placeholder="Código o nombre de la pieza" />
          {errorHoja && <div className="tec-error">{errorHoja}</div>}
          <button type="button" className="tec-btn rojo" style={{ marginTop: 14 }} disabled={!!guardando} onClick={() => ponerHold(o)}>
            <IPausa /> {guardando === "hold" ? "Guardando..." : "Poner en Hold"}
          </button>
          <button type="button" className="tec-btn gris" style={{ marginTop: 8 }} onClick={cerrar}>
            Cancelar
          </button>
          <div className="tec-hint" style={{ justifyContent: "center", marginTop: 10 }}>
            La orden se pausa y la tienda llama al cliente.
          </div>
        </>
      );
    }

    return (
      <div className="tec-hoja-fondo" onClick={(e) => e.target === e.currentTarget && cerrar()}>
        <div className="tec-hoja" role="dialog" aria-modal="true">
          <div className="tec-hoja-raya" />
          {contenido}
        </div>
      </div>
    );
  }

  // V40: "Listos hoy" en su propia pantalla.
  if (abierta === LISTOS) {
    return (
      <>
        <button type="button" className="tec-volver tec-volver-btn" onClick={cerrarOrden}>
          ← Mis trabajos
        </button>
        <div className="tec-hola" style={{ fontSize: 21 }}>
          Listos hoy
        </div>
        <div className="tec-sub">Si pusiste una lista por error, toca &quot;No está listo&quot;.</div>
        {listosHoy.length === 0 && (
          <div className="tec-card">
            <div className="tec-card-top fijo">
              <div className="tec-card-main">
                <div className="tec-linea gris">No hay nada puesto listo hoy.</div>
              </div>
            </div>
          </div>
        )}
        {listosHoy.map((o) => (
              <div key={o.id} className="tec-card verde">
                <div className="tec-card-top fijo">
                  <div className="tec-card-main">
                    <div className="tec-titulo tec-no">No. {numero(o)}</div>
                    <div className="tec-equipo">{equipoDe(o)}</div>
                    <div className="tec-linea verde">Listo hoy</div>
                    {errores[o.id] && <div className="tec-error">{errores[o.id]}</div>}
                  </div>
                  {accesos.actualizar && (
                    <button
                      type="button"
                      className="tec-btn gris chico"
                      style={{ fontSize: 14 }}
                      disabled={guardando === `deshacer-${o.id}`}
                      onClick={() => deshacerListo(o)}
                    >
                      {guardando === `deshacer-${o.id}` ? "..." : "No está listo"}
                    </button>
                  )}
                </div>
              </div>
        ))}
        {hoja_()}
      </>
    );
  }

  // V40: la orden abierta va sola, en su propia pantalla.
  const ordenSola = abierta ? ordenPorId(abierta) : null;
  if (ordenSola) {
    return (
      <>
        {/* Al guardar el informe vuelve solo aquí (?abrir=...&informe=ok). */}
        {avisoInforme && (
          <div className="success-box tec-guardado">
            <ICheck size={20} /> <b>Informe guardado.</b>
          </div>
        )}
        <button type="button" className="tec-volver tec-volver-btn" onClick={cerrarOrden}>
          ← Mis trabajos
        </button>
        {holdActivo(ordenSola.holds) ? esperandoSola(ordenSola) : orden(ordenSola, true)}
        {hoja_()}
      </>
    );
  }

  return (
    <>
      <div className="tec-hola">Hola, {nombre}</div>
      {/* V40: "Lo que te toca" pasó a "Mis trabajos" (como el botón "Volver a
          mis trabajos"). */}
      <div className="tec-sub">
        {total === 0 ? "No tienes nada pendiente. ¡Buen trabajo!" : total === 1 ? "Tienes 1 pendiente." : `Tienes ${total} pendientes.`}
      </div>

      <div className="tec-sec">Mis trabajos</div>
      {total === 0 && (
        <div className="tec-card">
          <div className="tec-card-top fijo">
            <span className="tec-icono verde">
              <ICheck />
            </span>
            <div className="tec-card-main">
              <div className="tec-titulo" style={{ fontSize: 16 }}>
                Nada por ahora
              </div>
              <div className="tec-linea gris">Cuando te asignen algo, sale aquí.</div>
            </div>
          </div>
        </div>
      )}
      {recVencidos.map((r) => (
        <Fragment key={r.key}>{recordatorio(r)}</Fragment>
      ))}
      {porHacer.map((o) => (
        <Fragment key={o.id}>{orden(o)}</Fragment>
      ))}
      {recPronto.map((r) => (
        <Fragment key={r.key}>{recordatorio(r)}</Fragment>
      ))}

      {enHold.length > 0 && (
        <>
          <div className="tec-sec">Esperando al cliente</div>
          {enHold.map((o) => (
            <Fragment key={o.id}>{esperando(o)}</Fragment>
          ))}
        </>
      )}

      {(accesos.compresores || accesos.reguladores || listosHoy.length > 0) && <div className="tec-sec">También puedes</div>}
      {accesos.compresores && (
        grande({ href: conComo("/tecnico/compresores"), icono: <IComp />, titulo: "Compresores", sub: "Ver cómo están y registrar mantenimiento" })
      )}
      {accesos.reguladores && (
        grande({
          href: conComo("/tecnico/regulador"),
          icono: <IReg />,
          titulo: "Mantenimiento de regulador de la tienda",
          sub: "Los reguladores de alquiler",
          boton: "Registrar",
        })
      )}
      {/* V40: "Listos hoy" ya no se despliega aquí: es una tarjeta con su
          botón, como las demás, y se abre en su propia pantalla (pedido
          explícito: "no uses el dropdown ese porque se va a confundir"). */}
      {listosHoy.length > 0 &&
        grande({
          onClick: () => abrirOrden(LISTOS),
          icono: <ICheck />,
          titulo: `Listos hoy (${listosHoy.length})`,
          sub: "Lo que pusiste listo hoy, por si te equivocaste",
          boton: "Ver",
        })}

      {/* V40: se quitó "Entrar al app completo" (pedido explícito: "Quita
          opcion de entrar a App completo"). */}

      {hoja_()}
    </>
  );
}
