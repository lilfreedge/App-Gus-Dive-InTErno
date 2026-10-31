import { consultasDe } from "@/lib/holds";

// V50 -- Las consultas de un Hold en puntos, cada una con lo que contestó el
// cliente (pedido: "que los holds se pueda ver como tipo bullets... que cada
// cosa tenga su respuesta"). Sirve para Holds viejos también (un solo punto).
export default function HoldConsultas({ hold, chico = false }) {
  const cs = consultasDe(hold);
  return (
    <ol className={`hold-cons${chico ? " chico" : ""}`}>
      {cs.map((c, i) => (
        <li key={i}>
          <span className="hold-cons-n">{i + 1}</span>
          <span className="hold-cons-txt">
            {c.texto}
            {c.comentario && <span className="hold-cons-com">{c.comentario}</span>}
          </span>
          {c.respuesta ? (
            <span className={`hold-cons-r ${c.respuesta}`}>{c.respuesta === "si" ? "Sí" : "No"}</span>
          ) : hold?.activo ? (
            <span className="hold-cons-r sin">Sin respuesta</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
