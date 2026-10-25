"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ICheck, IPlus, IX, IMic } from "../iconos";

// V38 -- Mantenimiento de regulador de la tienda, versión sencilla del
// técnico (maqueta-v38-3.html, A7): cuál regulador (botones con el código y
// un buscador), ultrasonido Sí/No, presión intermedia, o-rings y nota.
// Guarda en mantenimientos_reguladores igual que el formulario de siempre.

const sinTildes = (t) =>
  String(t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default function ReguladorPasos({ userId, nombreUsuario, reguladores = [], volverA = "/tecnico" }) {
  const supabase = createClient();
  const [busqueda, setBusqueda] = useState("");
  const [reguladorId, setReguladorId] = useState("");
  const [ultrasonido, setUltrasonido] = useState(null);
  const [presion, setPresion] = useState("");
  const [oRings, setORings] = useState([]);
  const [oRingDesc, setORingDesc] = useState("");
  const [oRingParte, setORingParte] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const regulador = reguladores.find((r) => r.id === reguladorId) || null;
  const b = sinTildes(busqueda.trim());
  const opciones = reguladores
    .filter((r) => !b || sinTildes(`${r.codigo} ${r.descripcion || ""}`).includes(b))
    .slice(0, 60);

  function agregarORing() {
    const d = oRingDesc.trim();
    if (!d) return;
    setORings((x) => [...x, { descripcion: d, parte: oRingParte.trim() }]);
    setORingDesc("");
    setORingParte("");
    setAgregando(false);
  }

  async function guardar() {
    setError("");
    if (!reguladorId) return setError("Escoge el regulador (paso 1).");
    if (ultrasonido === null) return setError("Marca si lo pasaste por el ultrasonido (paso 2).");
    // Si escribe solo el número, se guarda con "PSI" (como el ejemplo del
    // formulario de siempre: "135 PSI").
    const p = presion.trim();
    const presionFinal = p ? (/^\d+([.,]\d+)?$/.test(p) ? `${p.replace(",", ".")} PSI` : p) : null;
    setGuardando(true);
    const { error: err } = await supabase.from("mantenimientos_reguladores").insert({
      user_id: userId,
      nombre_usuario_snapshot: nombreUsuario,
      regulador_id: reguladorId,
      regulador_codigo_snapshot: regulador?.codigo || null,
      limpieza_ultrasonido: ultrasonido,
      presion_intermedia: presionFinal,
      o_rings: oRings.length > 0 ? oRings : null,
      detalle: nota.trim() || null,
    });
    setGuardando(false);
    if (err) return setError("No se pudo guardar. Intenta de nuevo.");
    setGuardado(true);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  if (guardado) {
    return (
      <div className="tec-card" style={{ marginTop: 10 }}>
        <div className="tec-ok" style={{ padding: "22px 16px" }}>
          <div className="tec-ok-c">
            <ICheck size={40} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800 }}>¡Guardado!</div>
          <div style={{ fontSize: 15, color: "var(--texto-suave)", marginTop: 4 }}>Regulador {regulador?.codigo}</div>
          <Link href={volverA} className="tec-btn azul" style={{ marginTop: 16 }}>
            Volver a mis trabajos
          </Link>
          <button
            type="button"
            className="tec-btn gris"
            style={{ marginTop: 8 }}
            onClick={() => {
              setGuardado(false);
              setReguladorId("");
              setUltrasonido(null);
              setPresion("");
              setORings([]);
              setNota("");
              setBusqueda("");
            }}
          >
            Registrar otro regulador
          </button>
        </div>
      </div>
    );
  }

  const op = (sel) => `tec-op${sel ? " sel" : ""}`;

  return (
    <>
      <div className="tec-hola" style={{ marginBottom: 2 }}>
        Regulador de la tienda
      </div>
      <div className="tec-sub" style={{ marginBottom: 4 }}>
        Mantenimiento · la fecha se pone sola
      </div>

      <div className="tec-paso">
        <div className="tec-paso-n">1</div>
        <div className="tec-paso-body">
          <div className="tec-paso-t">¿Cuál regulador?</div>
          {regulador ? (
            <div className="tec-chip ok">
              <span>
                <b>{regulador.codigo}</b>
                {regulador.descripcion ? ` · ${regulador.descripcion}` : ""}
              </span>
              <button type="button" className="tec-quitar" style={{ color: "var(--azul-claro)" }} onClick={() => setReguladorId("")}>
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                className="tec-input"
                style={{ marginBottom: 8 }}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escribe el código…"
              />
              {reguladores.length === 0 && <div className="tec-hint">No hay reguladores registrados.</div>}
              <div className="tec-grid3">
                {opciones.map((r) => (
                  <button type="button" key={r.id} className={op(false)} onClick={() => setReguladorId(r.id)}>
                    {r.codigo}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="tec-paso">
        <div className="tec-paso-n">2</div>
        <div className="tec-paso-body">
          <div className="tec-paso-t">¿Lo pasaste por el ultrasonido?</div>
          <div className="tec-grid2">
            <button type="button" className={op(ultrasonido === false)} onClick={() => setUltrasonido(false)}>
              No
            </button>
            <button type="button" className={op(ultrasonido === true)} onClick={() => setUltrasonido(true)}>
              Sí
            </button>
          </div>
        </div>
      </div>

      <div className="tec-paso">
        <div className="tec-paso-n">3</div>
        <div className="tec-paso-body">
          <div className="tec-paso-t">
            Presión intermedia <small>(si aplica)</small>
          </div>
          <input
            className="tec-input"
            inputMode="decimal"
            value={presion}
            onChange={(e) => setPresion(e.target.value)}
            placeholder="Ej: 135"
          />
          <div className="tec-hint">En PSI.</div>
        </div>
      </div>

      <div className="tec-paso">
        <div className="tec-paso-n">4</div>
        <div className="tec-paso-body">
          <div className="tec-paso-t">
            O-rings que cambiaste <small>(si cambiaste)</small>
          </div>
          {/* V40: el mismo recordatorio que en las órdenes de clientes. */}
          <div className="tec-recordatorio">Los o-rings van incluidos en el mantenimiento. Si cambiaste alguno, anótalo aquí.</div>
          {oRings.map((r, i) => (
            <div className="tec-chip" key={i}>
              <span>
                {r.descripcion}
                {r.parte ? ` · ${r.parte}` : ""}
              </span>
              <button type="button" className="tec-quitar" onClick={() => setORings((x) => x.filter((_, j) => j !== i))}>
                <IX size={15} /> Quitar
              </button>
            </div>
          ))}
          {agregando ? (
            <div className="tec-card" style={{ padding: 12 }}>
              <input
                className="tec-input"
                value={oRingDesc}
                onChange={(e) => setORingDesc(e.target.value)}
                placeholder="O-ring (ej: kit 1ª etapa)"
              />
              <input
                className="tec-input"
                style={{ marginTop: 8 }}
                value={oRingParte}
                onChange={(e) => setORingParte(e.target.value)}
                placeholder="Parte del regulador (si sabes)"
              />
              <div className="tec-grid2" style={{ marginTop: 8 }}>
                <button type="button" className="tec-btn gris" onClick={() => setAgregando(false)}>
                  Cancelar
                </button>
                <button type="button" className="tec-btn azul" onClick={agregarORing}>
                  Agregar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="tec-btn borde" onClick={() => setAgregando(true)}>
              <IPlus /> Agregar o-ring
            </button>
          )}
        </div>
      </div>

      <div className="tec-paso">
        <div className="tec-paso-n">5</div>
        <div className="tec-paso-body">
          <div className="tec-paso-t">
            Nota <small>(si hace falta)</small>
          </div>
          <textarea className="tec-area" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Escribe aquí…" />
          <div className="tec-hint">
            <IMic size={17} /> Puedes hablar: toca el micrófono del teclado.
          </div>
        </div>
      </div>

      {error && <div className="tec-error" style={{ marginTop: 16 }}>{error}</div>}
      <button type="button" className="tec-btn verde" style={{ marginTop: 18, marginBottom: 20 }} disabled={guardando} onClick={guardar}>
        <ICheck /> {guardando ? "Guardando..." : "Guardar mantenimiento"}
      </button>
    </>
  );
}
