// V62 (216): en los formularios de App Interno, los equipos alquilados no
// salen para escoger; aquí se dice cuáles son y por qué.
export default function AvisoAlquilados({ codigos }) {
  if (!codigos || !codigos.length) return null;
  return (
    <div className="aviso-box" style={{ marginBottom: 14 }}>
      Alquilados ahora (no se pueden registrar hasta que vuelvan): <b>{codigos.join(", ")}</b>. Su retorno se marca en Alquiler.
    </div>
  );
}
