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
            {/* V71 (pedido explícito, con captura de la orden 02198:
                "aparece el hold resuelto pero no lo que se respondió" --
                un Hold contestado solo con comentario, sin Sí/No, se
                leía pegado a la pregunta, como una sola oración). Ahora
                la respuesta va en su propia línea, con "Respondió:"
                delante, para que no se confunda con la pregunta. */}
            {c.comentario && (
              <span className="hold-cons-com">
                <b>Respondió:</b> {c.comentario}
              </span>
            )}
          </span>
          {c.respuesta ? (
            <span className={`hold-cons-r ${c.respuesta}`}>{c.respuesta === "si" ? "Sí" : "No"}</span>
          ) : c.comentario ? (
            // V71: ya tiene respuesta (el comentario), solo que sin Sí/No --
            // antes no se ponía ninguna etiqueta si el Hold ya no estaba
            // activo, lo que hacía parecer que no se había contestado nada.
            <span className="hold-cons-r ok">Contestado</span>
          ) : hold?.activo ? (
            <span className="hold-cons-r sin">Sin respuesta</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
