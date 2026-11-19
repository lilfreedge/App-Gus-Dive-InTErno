"use client";

// V108 ("la hora en el app ponla de formato 24 horas no de 12, en toda la
// app"): el campo de hora del celular o de la computadora enseña AM/PM según
// cómo esté configurado el aparato, así que aquí la hora se escoge con dos
// listas: la hora (00 a 23) y los minutos (de 5 en 5). Valor "HH:MM" o "".
const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export default function CampoHora24({ value = "", onChange, disabled = false, etiqueta = "Hora" }) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  const h = m ? m[1].padStart(2, "0") : "";
  const mi = m ? m[2] : "";
  const minutos = mi && !MINUTOS.includes(mi) ? [...MINUTOS, mi].sort() : MINUTOS;
  const poner = (nh, nm) => onChange?.(nh === "" ? "" : `${nh}:${nm || "00"}`);
  return (
    <span className="campo-hora24">
      <select value={h} disabled={disabled} aria-label={`${etiqueta}: hora`} onChange={(e) => poner(e.target.value, mi)}>
        <option value="">--</option>
        {HORAS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <b>:</b>
      <select value={h ? mi || "00" : ""} disabled={disabled || !h} aria-label={`${etiqueta}: minutos`} onChange={(e) => poner(h, e.target.value)}>
        {!h && <option value="">--</option>}
        {minutos.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </span>
  );
}
