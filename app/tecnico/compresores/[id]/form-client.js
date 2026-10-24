"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { subirFoto } from "@/lib/storage-client";
import { hoyISO } from "@/lib/fechas";
import { formatHoras } from "@/lib/compresores";
import { leerHorometro } from "@/lib/leer-horometro";
import { ICheck, ICam, IMic } from "../../iconos";

// V38 -- Registrar mantenimiento de compresor, versión sencilla del técnico
// (maqueta-v38-3.html, A6): pasos numerados, botones grandes en vez de
// listas, el responsable y la fecha se ponen solos, la foto del horómetro se
// lee sola. Los estados se escogen con Bien / Regular / Mal y se guardan
// como Satisfactorio / Aceptable / Deficiente, igual que el formulario de
// siempre (app/equipos/compresores/mantenimiento/nueva/form-client.js).

// Mismas listas que el formulario de siempre.
const RESPONSABLES = ["Gugi", "Pipe", "Frederick", "Alexander", "Danny"];
const TIPOS = [
  { valor: "Inspección", label: "Inspección" },
  { valor: "Mantenimiento preventivo", label: "Preventivo" },
  { valor: "Mantenimiento correctivo", label: "Correctivo" },
];
const ESTADOS = [
  { valor: "Satisfactorio", label: "Bien" },
  { valor: "Aceptable", label: "Regular" },
  { valor: "Deficiente", label: "Mal" },
];
const ACEITE = [
  { valor: "Lleno", color: "#2c9e5b" },
  { valor: "Bien", color: "#2c9e5b" },
  { valor: "Bajo", color: "#d98a1c" },
  { valor: "Muy bajo", color: "#d64545" },
];
const PUNTOS = [
  { clave: "estado_filtro_principal", label: "Filtro principal" },
  { clave: "estado_filtro_final", label: "Filtro final" },
  { clave: "estado_manguera", label: "Manguera" },
  { clave: "limpieza_compresor", label: "Limpieza del compresor" },
  { clave: "limpieza_espacio", label: "Limpieza del cuarto" },
];
const MENSAJES_LECTURA = {
  no_se_lee: "No se pudo leer el número en la foto. Escríbelo tú (o toma otra foto de frente y de cerca).",
  foto: "No se pudo abrir la foto para leerla. Escribe el número.",
  tiempo: "La lectura tardó demasiado. Escribe el número.",
};

const normal = (t) =>
  String(t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/(.)\1+/g, "$1");

function responsableDe(nombre) {
  const primero = normal(String(nombre || "").trim().split(/\s+/)[0]);
  return RESPONSABLES.find((r) => normal(r) === primero) || "";
}

function FotoBoton({ id, texto, file, onChange, chico = false }) {
  return (
    <>
      <label htmlFor={id} className="tec-foto" style={chico ? { fontSize: 15, padding: 12 } : undefined}>
        <ICam size={chico ? 22 : 26} /> {file ? "Cambiar la foto" : texto}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {file && <div className="tec-hint">✓ Foto lista</div>}
    </>
  );
}

export default function CompresorPasos({
  userId,
  nombreUsuario,
  nombrePersona,
  compresor,
  ultimo = null,
  tipoInicial = "",
  esTitular = false,
  lecturaDisponible = false,
  volverA = "/tecnico",
}) {
  const supabase = createClient();
  const [tipo, setTipo] = useState(tipoInicial);
  const [responsable, setResponsable] = useState(() => responsableDe(nombrePersona));
  const [cambiarResponsable, setCambiarResponsable] = useState(false);
  const [fotoHorometro, setFotoHorometro] = useState(null);
  const [horometro, setHorometro] = useState("");
  const [horometroLeido, setHorometroLeido] = useState(null);
  const [leyendo, setLeyendo] = useState(false);
  const [avisoLectura, setAvisoLectura] = useState("");
  const [aceite, setAceite] = useState("");
  const [aceiteEchado, setAceiteEchado] = useState(null);
  const [puntos, setPuntos] = useState({});
  const [fotoEspacio, setFotoEspacio] = useState(null);
  const [procesoPiezas, setProcesoPiezas] = useState("");
  const [fotoReparacion, setFotoReparacion] = useState(null);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const esInspeccion = tipo === "Inspección";
  const esPrevCorr = tipo === "Mantenimiento preventivo" || tipo === "Mantenimiento correctivo";
  const valor = String(horometro).trim() === "" ? null : Number(horometro);
  const diferencia = ultimo && valor !== null && !Number.isNaN(valor) ? valor - ultimo.horometro : null;
  const corregido = horometroLeido !== null && valor !== null && valor !== horometroLeido;
  const desc = compresor.descripcion || [compresor.marca, compresor.modelo].filter(Boolean).join(" ");

  async function alElegirFoto(file) {
    setFotoHorometro(file);
    setAvisoLectura("");
    setError("");
    if (!file || !lecturaDisponible) return;
    setLeyendo(true);
    const r = await leerHorometro(file);
    setLeyendo(false);
    if (r?.ok) {
      setHorometroLeido(r.horas);
      setHorometro(String(r.horas));
    } else {
      setHorometroLeido(null);
      setAvisoLectura(MENSAJES_LECTURA[r?.motivo] ?? "No se pudo leer el número de la foto. Escríbelo tú.");
    }
  }

  async function guardar() {
    setError("");
    if (!tipo) return setError("Escoge qué vas a hacer (paso 1).");
    if (!responsable) return setError("Escoge quién lo hizo.");
    if (!fotoHorometro) return setError("Toma la foto del horómetro (paso 2).");
    if (valor === null) return setError("Escribe el número del horómetro (paso 2).");
    if (Number.isNaN(valor) || valor < 0) return setError("El horómetro tiene que ser un número.");
    if (!esTitular && ultimo && valor < ultimo.horometro) {
      return setError(`El horómetro no puede ser menor que el de la última vez (${formatHoras(ultimo.horometro)} h).`);
    }
    if (esInspeccion) {
      if (!aceite) return setError("Escoge cómo estaba el aceite (paso 3).");
      if (aceiteEchado === null) return setError("Marca si le echaste aceite (paso 3).");
      const falta = PUNTOS.find((p) => !puntos[p.clave]);
      if (falta) return setError(`Escoge cómo está: ${falta.label} (paso 4).`);
    }
    if (esPrevCorr) {
      if (!procesoPiezas.trim()) return setError("Escribe qué hiciste y qué piezas usaste (paso 3).");
      if (!fotoReparacion) return setError("Toma la foto del trabajo (paso 3).");
    }

    setGuardando(true);
    let urlHorometro, urlEspacio, urlReparacion;
    try {
      const carpeta = `mantenimientos/${compresor.id}`;
      urlHorometro = await subirFoto(supabase, fotoHorometro, carpeta);
      if (esInspeccion && fotoEspacio) urlEspacio = await subirFoto(supabase, fotoEspacio, carpeta);
      if (esPrevCorr) urlReparacion = await subirFoto(supabase, fotoReparacion, carpeta);
    } catch {
      setGuardando(false);
      return setError("No se pudo subir una de las fotos. Intenta de nuevo.");
    }

    const { error: err } = await supabase.from("mantenimientos_compresores").insert({
      user_id: userId,
      nombre_usuario_snapshot: nombreUsuario,
      compresor_id: compresor.id,
      compresor_codigo_snapshot: compresor.codigo || null,
      tipo_mantenimiento: tipo,
      responsable,
      // La base de datos la cambia por la de hoy de todas formas.
      fecha: hoyISO(),
      horometro: valor,
      horometro_leido: horometroLeido,
      foto_horometro_url: urlHorometro,
      notas: notas.trim() || null,
      nivel_aceite: esInspeccion ? aceite : null,
      aceite_echado: esInspeccion ? aceiteEchado : null,
      limpieza_compresor: esInspeccion ? puntos.limpieza_compresor : null,
      estado_manguera: esInspeccion ? puntos.estado_manguera : null,
      estado_filtro_principal: esInspeccion ? puntos.estado_filtro_principal : null,
      estado_filtro_final: esInspeccion ? puntos.estado_filtro_final : null,
      limpieza_espacio: esInspeccion ? puntos.limpieza_espacio : null,
      foto_espacio_url: esInspeccion ? urlEspacio || null : null,
      otra_inspeccion: null,
      foto_otra_inspeccion_url: null,
      proceso_piezas: esPrevCorr ? procesoPiezas.trim() : null,
      foto_reparacion_url: esPrevCorr ? urlReparacion || null : null,
    });
    setGuardando(false);
    if (err) {
      return setError(/horómetro/i.test(err.message || "") ? err.message : "No se pudo guardar. Intenta de nuevo.");
    }
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
          <div style={{ fontSize: 15, color: "var(--texto-suave)", marginTop: 4 }}>
            Compresor {compresor.codigo} · {TIPOS.find((t) => t.valor === tipo)?.label} · {formatHoras(valor)} h
          </div>
          <Link href={volverA} className="tec-btn azul" style={{ marginTop: 16 }}>
            Volver a mis trabajos
          </Link>
        </div>
      </div>
    );
  }

  const op = (sel) => `tec-op${sel ? " sel" : ""}`;

  return (
    <>
      <div className="tec-hola" style={{ marginBottom: 2 }}>
        Compresor {compresor.codigo}
      </div>
      <div className="tec-sub" style={{ marginBottom: 4 }}>
        {desc ? `${desc} · ` : ""}la fecha se pone sola: hoy
      </div>
      <div className="tec-hint" style={{ marginTop: 0 }}>
        {cambiarResponsable || !responsable ? (
          <span>¿Quién lo hizo?</span>
        ) : (
          <span>
            Responsable: <b style={{ color: "var(--texto)" }}>{responsable}</b>{" "}
            <button type="button" className="tec-quitar" style={{ color: "var(--azul-claro)" }} onClick={() => setCambiarResponsable(true)}>
              Cambiar
            </button>
          </span>
        )}
      </div>
      {(cambiarResponsable || !responsable) && (
        <div className="tec-grid3" style={{ marginTop: 8 }}>
          {RESPONSABLES.map((r) => (
            <button
              type="button"
              key={r}
              className={op(responsable === r)}
              onClick={() => {
                setResponsable(r);
                setCambiarResponsable(false);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="tec-paso">
        <div className="tec-paso-n">1</div>
        <div className="tec-paso-body">
          <div className="tec-paso-t">¿Qué vas a hacer?</div>
          <div className="tec-grid3">
            {TIPOS.map((t) => (
              <button type="button" key={t.valor} className={op(tipo === t.valor)} onClick={() => setTipo(t.valor)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tec-paso">
        <div className="tec-paso-n">2</div>
        <div className="tec-paso-body">
          <div className="tec-paso-t">Foto del horómetro</div>
          <FotoBoton id="foto_horometro" texto="Tomar foto" file={fotoHorometro} onChange={alElegirFoto} />
          {leyendo && <div className="tec-hint">Leyendo el número de la foto…</div>}
          {!leyendo && horometroLeido !== null && (
            <div className="tec-leido">
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--verde)" }}>LA APP LEYÓ: {formatHoras(horometroLeido)} h</div>
              <div style={{ fontSize: 13, color: "var(--texto-suave)" }}>Revísalo. Si no es, cámbialo abajo.</div>
            </div>
          )}
          {!leyendo && avisoLectura && <div className="tec-aviso">{avisoLectura}</div>}
          <div className="tec-item-t" style={{ marginTop: 12 }}>
            Horómetro
          </div>
          <input
            className="tec-input"
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            value={horometro}
            onChange={(e) => setHorometro(e.target.value)}
            placeholder="Ej: 1245.5"
          />
          {ultimo && (
            <div className="tec-hint">
              La última vez: {formatHoras(ultimo.horometro)} h
              {diferencia !== null && (
                <b style={{ color: diferencia < 0 ? "var(--rojo)" : "var(--texto)" }}>
                  {" "}
                  → {diferencia >= 0 ? "+" : ""}
                  {formatHoras(Math.round(diferencia * 10) / 10)} h
                </b>
              )}
            </div>
          )}
          {corregido && <div className="tec-aviso">✎ Lo cambiaste a mano (la foto decía {formatHoras(horometroLeido)} h).</div>}
        </div>
      </div>

      {esInspeccion && (
        <>
          <div className="tec-paso">
            <div className="tec-paso-n">3</div>
            <div className="tec-paso-body">
              <div className="tec-paso-t">Aceite en la mirilla</div>
              <div className="tec-hint" style={{ marginTop: -4, marginBottom: 8 }}>
                Como lo encontraste, antes de echarle.
              </div>
              <div className="tec-grid2">
                {ACEITE.map((a) => (
                  <button type="button" key={a.valor} className={op(aceite === a.valor)} onClick={() => setAceite(a.valor)}>
                    <span className="tec-dot" style={{ background: a.color }} /> {a.valor}
                  </button>
                ))}
              </div>
              <div className="tec-item-t" style={{ marginTop: 12 }}>
                ¿Le echaste aceite?
              </div>
              <div className="tec-grid2">
                <button type="button" className={op(aceiteEchado === false)} onClick={() => setAceiteEchado(false)}>
                  No
                </button>
                <button type="button" className={op(aceiteEchado === true)} onClick={() => setAceiteEchado(true)}>
                  Sí
                </button>
              </div>
            </div>
          </div>
          <div className="tec-paso">
            <div className="tec-paso-n">4</div>
            <div className="tec-paso-body">
              <div className="tec-paso-t">¿Cómo está?</div>
              {PUNTOS.map((p) => (
                <div className="tec-item" key={p.clave}>
                  <div className="tec-item-t">{p.label}</div>
                  <div className="tec-grid3">
                    {ESTADOS.map((e) => (
                      <button
                        type="button"
                        key={e.valor}
                        className={op(puntos[p.clave] === e.valor)}
                        onClick={() => setPuntos((x) => ({ ...x, [p.clave]: e.valor }))}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {esPrevCorr && (
        <div className="tec-paso">
          <div className="tec-paso-n">3</div>
          <div className="tec-paso-body">
            <div className="tec-paso-t">¿Qué hiciste y qué piezas usaste?</div>
            <textarea
              className="tec-area"
              value={procesoPiezas}
              onChange={(e) => setProcesoPiezas(e.target.value)}
              placeholder="Ej: cambié el filtro final y el aceite…"
            />
            <div className="tec-hint">
              <IMic size={17} /> Puedes hablar: toca el micrófono del teclado.
            </div>
            <div style={{ marginTop: 10 }}>
              <FotoBoton id="foto_reparacion" texto="Foto del trabajo" file={fotoReparacion} onChange={setFotoReparacion} chico />
            </div>
          </div>
        </div>
      )}

      {tipo && (
        <div className="tec-paso">
          <div className="tec-paso-n">{esInspeccion ? 5 : 4}</div>
          <div className="tec-paso-body">
            <div className="tec-paso-t">
              Algo más <small>(si hace falta)</small>
            </div>
            <textarea className="tec-area" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Escribe aquí…" />
            <div className="tec-hint">
              <IMic size={17} /> Puedes hablar: toca el micrófono del teclado.
            </div>
            {esInspeccion && (
              <div style={{ marginTop: 10 }}>
                <FotoBoton id="foto_espacio" texto="Foto del cuarto (si quieres)" file={fotoEspacio} onChange={setFotoEspacio} chico />
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="tec-error" style={{ marginTop: 16 }}>{error}</div>}
      <button type="button" className="tec-btn verde" style={{ marginTop: 18 }} disabled={guardando || leyendo} onClick={guardar}>
        <ICheck /> {guardando ? "Guardando..." : esInspeccion ? "Guardar inspección" : "Guardar mantenimiento"}
      </button>
      <div className="tec-hint" style={{ justifyContent: "center", marginBottom: 20 }}>
        La fecha se pone sola: hoy.
      </div>
    </>
  );
}
