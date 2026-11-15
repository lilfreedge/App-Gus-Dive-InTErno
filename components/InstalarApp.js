"use client";

import { useEffect, useState } from "react";
import { enApp, dijoAhoraNo, marcarAhoraNo } from "@/lib/app-gus";

// V81 -- Tarjeta "Instala App Gus" (maquetas V80/V81/V82: "app gus"; sin la
// frase de abajo; se ve igual en iPhone y en Android). En Android, "Instalar"
// abre la ventanita del celular; en iPhone (Apple no deja instalar con un
// botón) abre los 3 pasos de Safari. No sale si ya está instalada, si tocó
// "Ahora no", ni en una computadora donde no se puede instalar.
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
        <img src="/icono-app-192.png" alt="App Gus" />
        <div>
          <b>Instala App Gus</b>
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
      {pasos && (
        <div className="ag-velo" onClick={() => setPasos(false)}>
          <div className="ag-hoja" onClick={(e) => e.stopPropagation()}>
            <b>Para instalarla en tu iPhone</b>
            <ol className="ag-pasos">
              <li>
                <span>1</span>Toca
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1f6fd1" strokeWidth="2" aria-hidden="true">
                  <path d="M12 3v12M8 7l4-4 4 4" />
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                </svg>
                Compartir, abajo en Safari.
              </li>
              <li>
                <span>2</span>Escoge "Agregar a inicio".
              </li>
              <li>
                <span>3</span>Toca "Agregar".
              </li>
            </ol>
            <button className="pb-btn" onClick={() => setPasos(false)}>
              Listo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
