"use client";

import { useEffect, useState } from "react";
import { enApp, dijoAhoraNo, marcarAhoraNo } from "@/lib/app-gus";

// V81 -- Tarjeta "Instala App Gus" (maquetas V80/V81/V82: "app gus"; sin la
// frase de abajo; se ve igual en iPhone y en Android). En Android, "Instalar"
// abre la ventanita del celular; en iPhone (Apple no deja instalar con un
// botón) abre el tutorial paso a paso (V83). No sale si ya está instalada, si tocó
// "Ahora no", ni en una computadora donde no se puede instalar.
// V83: la app se llama "Gus Dive" (pedido explícito); la tarjeta dice
// "Instala el app de Gus Dive" (el texto de esa opción en la maqueta V82).
let promptGuardado = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptGuardado = e;
  });
}

export default function InstalarApp({ style }) {
  const [modo, setModo] = useState(""); // "" (no sale) | "android" | "ios"
  const [pasos, setPasos] = useState(false);
  useEffect(() => {
    if (enApp() || dijoAhoraNo()) return;
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    if (ios) return setModo("ios");
    if (promptGuardado) return setModo("android");
    const al = (e) => {
      e.preventDefault();
      promptGuardado = e;
      setModo("android");
    };
    window.addEventListener("beforeinstallprompt", al);
    return () => window.removeEventListener("beforeinstallprompt", al);
  }, []);
  if (!modo) return null;

  async function instalar() {
    if (modo === "ios") return setPasos(true);
    if (!promptGuardado) return;
    promptGuardado.prompt();
    const r = await promptGuardado.userChoice.catch(() => null);
    promptGuardado = null;
    if (r?.outcome === "accepted") setModo("");
  }
  return (
    <>
      <div className="ag-inst" style={style}>
        <img src="/icono-app-192.png" alt="Gus Dive" />
        <div>
          <b>Instala el app de Gus Dive</b>
          <div className="ag-inst-bot">
            <button className="pb-btn ag-inst-si" onClick={instalar}>
              Instalar
            </button>
            <button className="ag-inst-no" onClick={() => (marcarAhoraNo(), setModo(""))}>
              Ahora no
            </button>
          </div>
        </div>
      </div>
      {pasos && <TutorialIphone cerrar={() => setPasos(false)} />}
    </>
  );
}

// V85 (pedido explícito, con foto de la pantalla final del link de
// interesados: "aquí debería dejarme volver al menú principal" → "ponlo en
// las tres pantallas") -- con el app instalada no hay botón de "atrás", así
// que las pantallas finales (interesados, registro de curso, inscripción a
// un buceo; también Mis documentos y Mi perfil) llevan este botón al menú
// del app Gus Dive.
export function VolverInicio() {
  return (
    <a className="pb-btn sec" href="/gus" style={{ display: "block", textDecoration: "none", textAlign: "center", marginTop: 12 }}>
      Volver al inicio
    </a>
  );
}

// V83 (maqueta V83, opción B aprobada: "1. B") -- la hoja de iPhone pasa de
// 3 pasos en texto a un tutorial paso a paso, con un dibujo de Safari y un
// círculo rojo donde hay que tocar. Son los pasos de sus fotos (Safari
// nuevo: ••• → Compartir → Ver más → Agregar a pantalla de inicio →
// Agregar); el primer paso dice qué hacer si su Safari ya enseña Compartir
// abajo (iPhone más viejo). Entre paréntesis, el botón en inglés.
const ICONO_COMPARTIR = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1f6fd1" strokeWidth="2" aria-hidden="true">
    <path d="M12 3v12M8 7l4-4 4 4" />
    <rect x="4" y="11" width="16" height="10" rx="2" />
  </svg>
);
const ICONO_AGREGAR = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a2733" strokeWidth="2" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
const Toque = ({ ancho }) => <span className={`ag-tut-toque${ancho ? " ancho" : ""}`} />;
const PASOS_IPHONE = [
  {
    dibujo: (
      <div className="ag-tut-barra">
        <span className="ag-tut-circ">‹</span>
        <span className="ag-tut-pill">Safari</span>
        <span className="ag-tut-circ ag-tut-obj">
          •••
          <Toque />
        </span>
      </div>
    ),
    texto: (
      <>
        Toca los tres puntos <b>•••</b> abajo a la derecha.
        <div className="ag-tut-tip">Si abajo ya ves el botón Compartir {ICONO_COMPARTIR}, tócalo y sigue en el paso 3.</div>
      </>
    ),
  },
  {
    dibujo: (
      <div className="ag-tut-menu">
        <div>
          <span className="ag-tut-obj">
            {ICONO_COMPARTIR}
            <Toque />
          </span>
          Compartir
        </div>
        <div>Agregar a favoritos</div>
        <div>Nueva pestaña</div>
      </div>
    ),
    texto: (
      <>
        Toca <b>Compartir</b> <span className="ag-tut-en">(Share)</span>.
      </>
    ),
  },
  {
    dibujo: (
      <div className="ag-tut-redondos">
        <div>
          <span>⧉</span>Copiar
        </div>
        <div>
          <span>☆</span>Favoritos
        </div>
        <div>
          <span>◎</span>Lista de lectura
        </div>
        <div>
          <span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a2733" strokeWidth="2.4" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <Toque />
          </span>
          Ver más
        </div>
      </div>
    ),
    texto: (
      <>
        Toca <b>Ver más</b> <span className="ag-tut-en">(View More)</span>.
      </>
    ),
  },
  {
    dibujo: (
      <div className="ag-tut-lista">
        <div>Agregar a favoritos</div>
        <div>Buscar en la página</div>
        <div>
          <span className="ag-tut-obj">
            {ICONO_AGREGAR}
            <Toque />
          </span>
          Agregar a pantalla de inicio
        </div>
      </div>
    ),
    texto: (
      <>
        Toca <b>Agregar a pantalla de inicio</b> <span className="ag-tut-en">(Add to Home Screen)</span>.
      </>
    ),
  },
  {
    dibujo: (
      <>
        <div className="ag-tut-cab">
          <span>Cancelar</span>
          <b>Agregar a inicio</b>
          <span className="ag-tut-obj" style={{ fontWeight: 700 }}>
            Agregar
            <Toque ancho />
          </span>
        </div>
        <div className="ag-tut-nuevo">
          <img src="/icono-app-192.png" alt="" />
          <b>Gus Dive</b>
        </div>
      </>
    ),
    texto: (
      <>
        Arriba a la derecha, toca <b>Agregar</b> <span className="ag-tut-en">(Add)</span>.
      </>
    ),
  },
];

function TutorialIphone({ cerrar }) {
  const [i, setI] = useState(0);
  const fin = i === PASOS_IPHONE.length;
  return (
    <div className="ag-velo" onClick={cerrar}>
      <div className="ag-hoja" onClick={(e) => e.stopPropagation()}>
        <b>{fin ? "¡Listo!" : `Paso ${i + 1} de ${PASOS_IPHONE.length}`}</b>
        <div className="ag-tut-dib">
          {fin ? (
            <div className="ag-tut-home">
              {["Fotos", "Mapas", null, "Notas", "Reloj", "Cámara", "Música", "Ajustes"].map((t, k) =>
                t ? (
                  <div key={k}>
                    <i />
                    {t}
                  </div>
                ) : (
                  <div key={k}>
                    <img src="/icono-app-192.png" alt="" />
                    Gus Dive
                  </div>
                )
              )}
            </div>
          ) : (
            PASOS_IPHONE[i].dibujo
          )}
        </div>
        <div className="ag-tut-texto">{fin ? "Ya tienes Gus Dive en tu pantalla de inicio. Ábrela desde ahí, como cualquier app." : PASOS_IPHONE[i].texto}</div>
        <div className="ag-tut-nav">
          <button className="ag-tut-bn" disabled={i === 0} onClick={() => setI(i - 1)}>
            Atrás
          </button>
          <span className="ag-tut-puntos">
            {PASOS_IPHONE.map((_, k) => (
              <i key={k} className={k === i ? "sel" : ""} />
            ))}
          </span>
          <button className="ag-tut-bn pri" onClick={() => (fin ? cerrar() : setI(i + 1))}>
            {fin ? "Listo" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
