// V52 -- El recordatorio de los o-rings para el técnico, con etiquetas
// (maqueta-v52-preguntas.html, "40. 2B"; nota "App Gus interno": que le
// quede claro que los o-rings no son códigos a cobrar, y que lo demás
// (mangueras, etc.) sí es adicional). Sale en su pantalla, en el paso
// "Informe de mantenimiento", y en el informe arriba de "¿Cambiaste algún
// o-ring?". En los reguladores de la tienda no se cobra nada, así que ahí
// se queda el texto de antes.
export default function RecordatorioOrings({ style }) {
  return (
    <div className="tec-recordatorio oring-dos" style={style}>
      <span className="oring-et inc">Incluido</span>
      <span>Los o-rings. No van en Códigos usados en la orden.</span>
      <span className="oring-et cob">Se cobra</span>
      <span>Mangueras, boquillas y cualquier otra pieza. Esas sí van ahí.</span>
    </div>
  );
}
