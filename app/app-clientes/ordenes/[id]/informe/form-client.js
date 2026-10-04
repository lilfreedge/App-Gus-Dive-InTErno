"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { sumarMeses, hoyISO } from "@/lib/fechas";
import {
  COMPONENTES_REGULADOR_DEFS,
  MANTENIMIENTO_DEFS,
  componentesRecibidosTexto,
  estadoInicialTexto,
  trabajoRealizadoLista,
  informeDefault,
} from "@/lib/informe-mantenimiento";
import BotonImprimir from "@/components/BotonImprimir";
import EnviarInformeClient from "./enviar-client";
import { IconLock } from "@/components/icons";

const SECCION_ESTILO = { background: "var(--fondo)", border: "1px solid var(--borde)", borderRadius: 10, padding: 14, marginBottom: 12 };
const SECCION_LABEL_ESTILO = { fontSize: 11, fontWeight: 700, color: "var(--texto-suave)", textTransform: "uppercase", letterSpacing: 0.3 };

// Secciones "informativas" más sutiles (28-sep-2026, pedido explícito:
// "poner la info que esta puesta por default para que se vea mas sutil,
// que lo que llame la atencion sea lo que hay que llenar, de 'trabajo
// realizado' hacia abajo") -- Datos del cliente / Detalles del regulador
// (la parte de solo lectura) / Componentes recibidos / Estado inicial ya
// vienen resueltos de la orden, no hace falta que compitan visualmente
// con lo que sí hay que llenar (Trabajo realizado en adelante), que se
// deja con la caja con borde de siempre (SECCION_ESTILO).
const SECCION_ESTILO_SUTIL = { padding: "8px 2px 14px", marginBottom: 2, borderBottom: "1px solid var(--borde)" };
const SECCION_LABEL_ESTILO_SUTIL = { ...SECCION_LABEL_ESTILO, fontWeight: 600 };
const TEXTO_SUTIL_ESTILO = { fontSize: 13, color: "var(--texto-suave)" };

// Formulario del "Informe de mantenimiento" (item 36, mockup aprobado
// Informe.dc.html) -- dos vistas, igual que en el mockup: "Formulario
// (técnico)" para llenarlo, e "Informe (cliente)" para ver/descargar/
// enviar el resultado ya generado. A diferencia del wizard de "Actualizar
// estado de orden" (que sí tiene validación en cadena), esto es un
// formulario normal de un solo bloque -- el mockup no pedía pasos
// bloqueados aquí, solo el botón final "Generar informe (PDF)".
export default function InformeMantenimientoForm({ orden, serie, tecnicoSugerido = "" }) {
  const supabase = createClient();

  const [informe, setInforme] = useState(() => ({
    ...informeDefault(orden, tecnicoSugerido, serie),
    ...(orden.informe_mantenimiento || {}),
  }));
  const [yaGenerado, setYaGenerado] = useState(!!orden.informe_mantenimiento);
  const [vista, setVista] = useState("formulario");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function set(campo, valor) {
    setInforme((prev) => ({ ...prev, [campo]: valor }));
  }

  function toggleMantenimiento(id) {
    setInforme((prev) => ({ ...prev, mantenimiento: { ...prev.mantenimiento, [id]: !prev.mantenimiento?.[id] } }));
  }

  // "Cambio de o-rings" (1-oct-2026, nueva feature, pedido explícito: "un
  // campo en donde se pueda ir agregando o rings. tipo como se agregan
  // cuando son repuestos") -- misma lógica de lista que "Códigos a cobrar"
  // en el wizard, pero local al formulario (se guarda junto con todo lo
  // demás al hacer clic en "Generar informe", no de inmediato).
  const [nuevoOring, setNuevoOring] = useState("");
  function agregarOring() {
    const valor = nuevoOring.trim();
    if (!valor) return;
    setInforme((prev) => ({ ...prev, orings: [...(prev.orings || []), valor] }));
    setNuevoOring("");
  }
  function quitarOring(i) {
    setInforme((prev) => ({ ...prev, orings: prev.orings.filter((_, idx) => idx !== i) }));
  }

  async function generarInforme() {
    setError("");
    // Marca/Modelo/No. de serie dejaron de pedirse acá (feedback en vivo,
    // 29-sep-2026, pedido explícito: "que la marca y modelo de regulador
    // sean intocables, junto al no. de serie") -- ahora son de solo
    // lectura, tomados directo del equipo (ver Detalles más abajo), así
    // que ya no hace falta validarlos aquí: si faltan, hay que corregirlos
    // en "Editar equipo", no en este formulario.
    if (informe.aprobado !== true && informe.aprobado !== false) {
      setError('Indica si el regulador queda "Aprobado para su uso" o "No aprobado".');
      return;
    }
    if (!informe.tecnico.trim()) {
      setError("Indica el técnico que hizo el mantenimiento.");
      return;
    }

    setGuardando(true);
    try {
      const informeFinal = { ...informe, marca: informe.marca.trim(), modelo: informe.modelo.trim(), tecnico: informe.tecnico.trim(), actualizado_en: new Date().toISOString() };

      await registrarCambio(supabase, {
        tabla: "ordenes_equipos",
        registroId: orden.id,
        accion: "editar",
        datosAnteriores: orden,
        datosNuevos: { ...orden, informe_mantenimiento: informeFinal },
      });

      const { error: err } = await supabase
        .from("ordenes_equipos")
        .update({ informe_mantenimiento: informeFinal, updated_at: new Date().toISOString() })
        .eq("id", orden.id);

      if (err) throw err;

      // "Recomendación de próximo mantenimiento" -- se guarda también en
      // el EQUIPO, no solo en este Informe puntual (1-oct-2026, pedido
      // explícito: "que cada equipo guarde esta info para yo poder
      // consultar en alguna parte... saber que cliente llamar"). No
      // bloquea el guardado del Informe si esto llega a fallar -- ya
      // quedó guardado donde más importa.
      if ((informeFinal.recomendacion === "6" || informeFinal.recomendacion === "12") && orden.equipo_id) {
        const fechaRecomendada = sumarMeses(hoyISO(), Number(informeFinal.recomendacion));
        try {
          await supabase
            .from("equipos_del_cliente")
            .update({ proximo_mantenimiento_recomendado: fechaRecomendada })
            .eq("id", orden.equipo_id);
        } catch {
          // No bloquea -- el Informe ya quedó guardado.
        }
      }

      setInforme(informeFinal);
      setYaGenerado(true);
      setVista("preview");
    } catch (e) {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const componentesTexto = componentesRecibidosTexto(orden.regulador_componentes);
  const mostrarEstadoInicial = !!(orden.regulador_danos_visibles?.trim() || orden.regulador_problemas_reportados?.trim());
  const estadoInicial = estadoInicialTexto({ danos: orden.regulador_danos_visibles, problemas: orden.regulador_problemas_reportados });
  const trabajoRealizado = trabajoRealizadoLista(informe.mantenimiento);

  return (
    <div className="card">
      {/* Arreglo de impresión (feedback sobre v40, pedido explícito) -- a
          esta barra de pestañas le faltaba "no-print": se imprimía junto
          con el informe (vista "Informe (cliente)"), empujando el
          contenido real a una 2da página. */}
      <div className="no-print" style={{ display: "flex", gap: 6, background: "var(--superficie-suave)", borderRadius: 8, padding: 5, marginBottom: 16 }}>
        <button
          type="button"
          className={vista === "formulario" ? "btn btn-primary" : "btn secondary"}
          onClick={() => setVista("formulario")}
          style={{ marginTop: 0, width: "auto", padding: "6px 14px", fontSize: 12.5 }}
        >
          Formulario (técnico)
        </button>
        <button
          type="button"
          className={vista === "preview" ? "btn btn-primary" : "btn secondary"}
          onClick={() => yaGenerado && setVista("preview")}
          disabled={!yaGenerado}
          title={!yaGenerado ? "Primero genera el informe" : undefined}
          style={{
            marginTop: 0,
            width: "auto",
            padding: "6px 14px",
            fontSize: 12.5,
            display: "flex",
            alignItems: "center",
            gap: 6,
            // Se ve bloqueado de verdad (28-sep-2026, pedido explícito:
            // "pon que informe (cliente) aparezca como bloqueado, porque
            // no se le puede hacer click hasta que se alimenta el
            // formulario") -- antes solo tenía el atributo `disabled`
            // (gris apagado por defecto del navegador), sin nada que
            // dejara claro de un vistazo por qué no reacciona al click.
            ...(!yaGenerado ? { opacity: 0.6, cursor: "not-allowed" } : null),
          }}
        >
          {!yaGenerado && <IconLock size={12} />}
          Informe (cliente)
        </button>
      </div>

      {vista === "formulario" ? (
        <>
          <div style={SECCION_ESTILO_SUTIL}>
            <div style={SECCION_LABEL_ESTILO_SUTIL}>Datos del cliente</div>
            <div style={{ marginTop: 8, ...TEXTO_SUTIL_ESTILO }}><b>Nombre:</b> {orden.cliente_nombre_snapshot || "—"}</div>
            {orden.cliente_telefono && <div style={{ marginTop: 4, ...TEXTO_SUTIL_ESTILO }}><b>Teléfono:</b> {orden.cliente_telefono}</div>}
            <div className="hint-text" style={{ marginTop: 6 }}>Se completa automático con los datos de la orden.</div>
          </div>

          {/* "Detalles" (renombrado de "Detalles del regulador", feedback en
              vivo, 29-sep-2026, pedido explícito) -- Marca/Modelo/No. de
              serie pasaron de inputs editables a solo lectura, mismo
              tratamiento que el resto de esta sección (Datos del cliente,
              Componentes recibidos): se toman directo del equipo, no se
              editan aquí ("que sean intocables... y que se vean como los
              otros detalles del regulador"). Para corregir un dato mal
              cargado, hay que hacerlo en "Editar equipo". */}
          <div style={SECCION_ESTILO_SUTIL}>
            <div style={SECCION_LABEL_ESTILO_SUTIL}>Detalles</div>
            <div style={{ marginTop: 8, ...TEXTO_SUTIL_ESTILO }}><b>No. de orden:</b> {orden.no_orden_fisico ?? orden.folio}</div>
            <div style={{ marginTop: 4, ...TEXTO_SUTIL_ESTILO }}><b>Fecha de ingreso:</b> {formatFechaDDMMAAAADeDate(orden.fecha)}</div>
            <div style={{ marginTop: 4, ...TEXTO_SUTIL_ESTILO }}><b>Marca:</b> {informe.marca || "—"}</div>
            <div style={{ marginTop: 4, ...TEXTO_SUTIL_ESTILO }}><b>Modelo:</b> {informe.modelo || "—"}</div>
            <div style={{ marginTop: 4, ...TEXTO_SUTIL_ESTILO }}><b>No. de serie:</b> {informe.serie || "—"}</div>
            <div className="hint-text" style={{ marginTop: 6 }}>Se completa automático con los datos del equipo -- para corregirlo, usa &quot;Editar equipo&quot;.</div>
          </div>

          <div style={SECCION_ESTILO_SUTIL}>
            <div style={SECCION_LABEL_ESTILO_SUTIL}>Componentes recibidos</div>
            <div style={{ marginTop: 8, ...TEXTO_SUTIL_ESTILO }}>{componentesTexto}</div>
            <div className="hint-text" style={{ marginTop: 6 }}>Se anota al registrar la orden -- no se edita aquí.</div>
          </div>

          <div style={SECCION_ESTILO_SUTIL}>
            <div style={SECCION_LABEL_ESTILO_SUTIL}>Estado inicial del regulador</div>
            <div style={{ marginTop: 8, ...TEXTO_SUTIL_ESTILO }}><b>Daños visibles:</b> {orden.regulador_danos_visibles || "Ninguno"}</div>
            <div style={{ marginTop: 4, ...TEXTO_SUTIL_ESTILO }}><b>Problemas reportados:</b> {orden.regulador_problemas_reportados || "Ninguno reportado"}</div>
            <div className="hint-text" style={{ marginTop: 6 }}>Se anota al registrar la orden -- no se edita aquí.</div>
          </div>

          <div style={SECCION_ESTILO}>
            <div style={SECCION_LABEL_ESTILO}>Trabajo realizado</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {MANTENIMIENTO_DEFS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={informe.mantenimiento?.[m.id] ? "btn btn-primary" : "btn secondary"}
                  onClick={() => toggleMantenimiento(m.id)}
                  style={{ marginTop: 0, width: "auto", padding: "7px 12px", fontSize: 12.5 }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <label style={{ marginTop: 12 }}>Presión intermedia ajustada (PSI)</label>
            <input type="text" value={informe.presion} onChange={(e) => set("presion", e.target.value)} placeholder="Ej. 140 PSI" />
          </div>

          <div style={SECCION_ESTILO}>
            {/* Renombrada a "Nota" (1-oct-2026, pedido explícito, vinculada
                con la "Nota" del Seguimiento -- ver informeDefault() en
                lib/informe-mantenimiento.js, que la prellena con
                notas_tecnico_regulador la primera vez que se genera el
                Informe para esta orden) -- el campo interno sigue
                llamándose `observacion` para no tocar lo ya guardado. */}
            <div style={SECCION_LABEL_ESTILO}>Nota</div>
            <textarea rows={3} value={informe.observacion} onChange={(e) => set("observacion", e.target.value)} style={{ marginTop: 8 }} />
          </div>

          {/* "Cambio de o-rings" (1-oct-2026, nueva feature, pedido
              explícito) -- lista armada de a uno, mismo patrón que
              "Códigos a cobrar" del wizard. Solo aparece en el Informe
              impreso si se agregó al menos uno (ver filasInformeMantenimiento
              en lib/informe-mantenimiento.js y la vista "Informe (cliente)"
              más abajo). */}
          <div style={SECCION_ESTILO}>
            <div style={SECCION_LABEL_ESTILO}>Cambio de o-rings</div>
            {(informe.orings || []).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, marginBottom: 6 }}>
                {informe.orings.map((o, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                    <span>{o}</span>
                    <button
                      type="button"
                      onClick={() => quitarOring(i)}
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
                value={nuevoOring}
                onChange={(e) => setNuevoOring(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarOring();
                  }
                }}
                placeholder="Cuál o-ring, ej. '1ra etapa'"
                style={{ marginTop: 0 }}
              />
              <button type="button" className="btn secondary" onClick={agregarOring} style={{ marginTop: 0, width: "auto" }}>
                + Agregar
              </button>
            </div>
            {(informe.orings || []).length === 0 && (
              <div className="hint-text" style={{ marginTop: 6 }}>Opcional -- si no se cambió ninguno, déjalo vacío.</div>
            )}
          </div>

          {/* "Recomendación de próximo mantenimiento" (1-oct-2026, nueva
              feature, pedido explícito) -- preset de 6/12 meses (opcional).
              Al generar el informe con una marcada, se guarda también en el
              EQUIPO (equipos_del_cliente.proximo_mantenimiento_recomendado,
              migration_46.sql) para poder consultarlo más adelante, no solo
              en este Informe puntual -- ver generarInforme() y la nueva
              pantalla "Próximos mantenimientos" en Más. */}
          <div style={SECCION_ESTILO}>
            <div style={SECCION_LABEL_ESTILO}>Recomendación de próximo mantenimiento</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[{ v: "6", label: "6 meses" }, { v: "12", label: "12 meses" }].map((op) => (
                <button
                  key={op.v}
                  type="button"
                  onClick={() => set("recomendacion", informe.recomendacion === op.v ? null : op.v)}
                  style={{
                    flex: 1, marginTop: 0, padding: "9px", borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                    border: "1px solid var(--azul-claro)",
                    background: informe.recomendacion === op.v ? "var(--azul-claro)" : "transparent",
                    color: informe.recomendacion === op.v ? "#fff" : "var(--azul-claro)",
                  }}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <div className="hint-text" style={{ marginTop: 6 }}>Opcional -- si no aplica, déjalo sin marcar.</div>
          </div>

          <div style={SECCION_ESTILO}>
            <div style={SECCION_LABEL_ESTILO}>Estado del regulador</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => set("aprobado", true)}
                style={{
                  flex: 1, marginTop: 0, padding: "9px", borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                  border: "1px solid var(--verde)",
                  background: informe.aprobado === true ? "var(--verde)" : "transparent",
                  color: informe.aprobado === true ? "#fff" : "var(--verde)",
                }}
              >
                Aprobado para su uso
              </button>
              <button
                type="button"
                onClick={() => set("aprobado", false)}
                style={{
                  flex: 1, marginTop: 0, padding: "9px", borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                  border: "1px solid var(--rojo)",
                  background: informe.aprobado === false ? "var(--rojo)" : "transparent",
                  color: informe.aprobado === false ? "#fff" : "var(--rojo)",
                }}
              >
                No aprobado
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--texto-suave)" }}><b>Garantía:</b> 15 días a partir de la fecha de entrega.</div>

            <label style={{ marginTop: 10 }}>Técnico</label>
            <input type="text" value={informe.tecnico} onChange={(e) => set("tecnico", e.target.value)} />
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="button" className="btn btn-primary" onClick={generarInforme} disabled={guardando} style={{ width: "100%", marginTop: 10 }}>
            {guardando ? "Guardando..." : "Generar informe (PDF)"}
          </button>
          <div className="hint-text" style={{ textAlign: "center", marginTop: 6 }}>Se genera un PDF con este contenido para entregar al cliente.</div>
        </>
      ) : (
        <>
          {/* "Descargar PDF" se quitó (feedback sobre v40, pedido
              explícito: "quita el botón de descargar pdf, con el de
              imprimir ya se puede guardar como PDF") -- BotonImprimir ya
              cubre ese caso (imprimir → "Guardar como PDF" del propio
              navegador), y era la ruta con el bug de las 2 páginas. */}
          <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <BotonImprimir />
            <EnviarInformeClient ordenId={orden.id} />
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="reporte-membrete">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-gus-icon.png" alt="Gus Dive" className="reporte-membrete-logo" />
              <div>
                <div className="reporte-membrete-titulo">Informe de mantenimiento</div>
                <div className="reporte-membrete-subtitulo">Regulador — Orden #{orden.no_orden_fisico ?? orden.folio}</div>
              </div>
            </div>
            <div style={{ padding: 18 }}>
              <Seccion titulo="Cliente">
                {orden.cliente_nombre_snapshot}
                {orden.cliente_telefono && ` · ${orden.cliente_telefono}`}
              </Seccion>

              <Seccion titulo="Equipo">
                {[informe.marca, informe.modelo].filter(Boolean).join(" ") || "—"}
                <div className="hint-text" style={{ marginTop: 2 }}>
                  No. de orden {orden.no_orden_fisico ?? orden.folio} · Ingreso {formatFechaDDMMAAAADeDate(orden.fecha)}
                  {informe.serie?.trim() ? ` · No. de serie ${informe.serie.trim()}` : ""}
                </div>
              </Seccion>

              <Seccion titulo="Componentes recibidos">{componentesTexto}</Seccion>

              {mostrarEstadoInicial && <Seccion titulo="Estado inicial">{estadoInicial}</Seccion>}

              <Seccion titulo="Trabajo realizado">
                {trabajoRealizado.length > 0 ? (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                    {trabajoRealizado.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ marginTop: 4 }}>Ninguno indicado.</div>
                )}
                {informe.presion?.trim() && (
                  <div className="hint-text" style={{ marginTop: 6 }}>Presión intermedia ajustada: {informe.presion.trim()}</div>
                )}
              </Seccion>

              {informe.observacion?.trim() && <Seccion titulo="Nota">{informe.observacion.trim()}</Seccion>}

              {(informe.orings || []).length > 0 && (
                <Seccion titulo="Cambio de o-rings">{informe.orings.join(", ")}</Seccion>
              )}

              <div
                style={{
                  marginTop: 18,
                  padding: 12,
                  borderRadius: 8,
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  background: informe.aprobado ? "rgba(44, 158, 91, 0.12)" : "var(--error-fondo)",
                  color: informe.aprobado ? "var(--verde)" : "var(--rojo)",
                }}
              >
                {informe.aprobado ? "✓ Aprobado para su uso" : "✕ No aprobado para su uso"}
              </div>

              <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--texto-suave)", textAlign: "center" }}>
                Garantía de 15 días a partir de la fecha de entrega.
              </div>
              <div style={{ marginTop: 14, borderTop: "1px solid var(--borde)", paddingTop: 10, fontSize: 12.5, color: "var(--texto-suave)", textAlign: "center" }}>
                Técnico: {informe.tecnico}
              </div>

              {(informe.recomendacion === "6" || informe.recomendacion === "12") && (
                <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--texto-suave)", textAlign: "center" }}>
                  Recomendación de próximo mantenimiento: en {informe.recomendacion} meses.
                </div>
              )}

              <div style={{ marginTop: 16, fontSize: 12.5, textAlign: "center", lineHeight: 1.5 }}>
                Gracias por confiar en Gus Dive Center para el mantenimiento de tu equipo de buceo.
              </div>
            </div>
          </div>

          <button type="button" className="btn secondary no-print" onClick={() => setVista("formulario")} style={{ width: "100%", marginTop: 14 }}>
            ← Volver a editar
          </button>
        </>
      )}
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--texto-suave)", textTransform: "uppercase" }}>{titulo}</div>
      <div style={{ marginTop: 4, fontSize: 13.5, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
