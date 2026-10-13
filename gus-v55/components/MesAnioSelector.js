"use client";

// Mes y año en dos listas (V30, pedido explícito, nota de la captura 2:
// "en registrar prueba hidrostática, en la fecha que solo pida mes y año,
// el día no es necesario"). `valor` y onChange usan "aaaa-mm" (o "" si
// falta alguno de los dos). `anioActual` lo pasa quien lo usa (calculado
// en el navegador) para no depender de la hora del servidor.
export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function MesAnioSelector({ id, valor, onChange, anioActual, aniosAtras = 25 }) {
  const [anio, mes] = (valor || "").split("-");
  const tope = Number(anioActual) || new Date().getFullYear();
  const anios = [];
  for (let a = tope; a >= tope - aniosAtras; a--) anios.push(String(a));
  // Si el valor guardado es más viejo que la lista, igual se muestra.
  if (anio && !anios.includes(anio)) anios.push(anio);

  function emitir(nuevoAnio, nuevoMes) {
    onChange(nuevoAnio && nuevoMes ? `${nuevoAnio}-${nuevoMes}` : nuevoAnio || nuevoMes ? `${nuevoAnio || ""}-${nuevoMes || ""}` : "");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 8 }}>
      <select id={id} aria-label="Mes" value={mes || ""} onChange={(e) => emitir(anio, e.target.value)}>
        <option value="">Mes</option>
        {/* Número y nombre ("07 - Julio"), pedido explícito: "aparte de que
            aparezca el mes en letra, ponlo que aparezca en número también.
            así visualmente es difícil de confundirse". */}
        {MESES.map((m, i) => (
          <option key={m} value={String(i + 1).padStart(2, "0")}>
            {String(i + 1).padStart(2, "0")} - {m}
          </option>
        ))}
      </select>
      <select aria-label="Año" value={anio || ""} onChange={(e) => emitir(e.target.value, mes)}>
        <option value="">Año</option>
        {anios.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}

// "aaaa-mm" completo y válido.
export function mesAnioCompleto(valor) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(valor || "");
}
