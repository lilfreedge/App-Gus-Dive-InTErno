"use client";

import { useEffect } from "react";

// V42 -- Le avisa a la página de WordPress qué tan alto es el recuadro de
// "Próximos viajes", para que el iframe se ajuste solo (sin barra de scroll).
export default function AltoIframe() {
  useEffect(() => {
    const avisar = () => {
      try {
        window.parent.postMessage({ tipo: "gus-viajes-alto", alto: document.documentElement.scrollHeight }, "*");
      } catch {}
    };
    avisar();
    window.addEventListener("resize", avisar);
    const t = setInterval(avisar, 1500);
    return () => {
      window.removeEventListener("resize", avisar);
      clearInterval(t);
    };
  }, []);
  return null;
}
