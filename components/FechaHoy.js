"use client";

import { useEffect, useState } from "react";

// V44 -- La fecha de hoy arriba, al lado de "Hola, …", en todas las apps
// (pedido de Pipe: "quiero que diga la fecha del día de hoy en toda parte
// del app"). Hora de República Dominicana; se pinta en el navegador (así no
// choca con la hora del servidor) y se actualiza sola al pasar la medianoche.
function hoyTexto() {
  const t = new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", weekday: "long", day: "numeric", month: "long" })
    .format(new Date())
    .replace(",", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function FechaHoy({ conPunto = true }) {
  const [t, setT] = useState(null);
  useEffect(() => {
    setT(hoyTexto());
    const id = setInterval(() => setT(hoyTexto()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  if (!t) return null;
  return (
    <span className="topbar-fecha">
      {conPunto ? " · " : ""}
      {t}
    </span>
  );
}
