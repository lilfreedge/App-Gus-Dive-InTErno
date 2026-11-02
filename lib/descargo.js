// V57 -- Descargo de Responsabilidad del servicio de mantenimiento/reparación
// (el documento de Pipe en su Drive). Pedido (2-nov): "nosotros pondremos al
// cliente a firmar de todas formas en la tienda y luego cuando se le mande el
// recibo de la orden, ahí va a figurar esto también". Sale al final del
// Recibo de la orden: en pantalla, en el PDF y en el que se manda por correo.
export const DESCARGO = {
  titulo: "Descargo de Responsabilidad",
  subtitulo: "Servicio de Mantenimiento/Reparación de Equipos de Buceo",
  intro: [
    "En nombre de Gus Dive SRL nos comprometemos a realizar el servicio de mantenimiento y reparación de los equipos con el mayor cuidado y siguiendo los procedimientos recomendados por fabricantes y estándares de seguridad de buceo.",
    "No obstante, es importante tener en cuenta:",
  ],
  puntos: [
    {
      t: "Condiciones previas del equipo",
      texto:
        "Los equipos pueden presentar desgastes, defectos de fábrica o daños ocasionados por el uso, almacenamiento o manipulación previa. Estos factores, muchas veces, no son visibles durante la revisión inicial y pueden manifestarse posteriormente en el uso del equipo.",
    },
    {
      t: "Alcance del servicio",
      texto:
        "Nuestro trabajo se limita exclusivamente a las piezas y ajustes intervenidos en el servicio solicitado. Una vez entregado y probado el equipo en nuestras instalaciones, Gus Dive SRL no puede garantizar el desempeño futuro del mismo, ya que el uso, la manipulación del usuario y las condiciones de inmersión son variables externas que no podemos controlar.",
    },
    {
      t: "Garantía de piezas reemplazadas o ajustadas",
      texto:
        "Las piezas reemplazadas o ajustadas son verificadas al momento de la entrega. Después de que el cliente retira el equipo, no se otorga garantía adicional sobre el funcionamiento general del mismo, pues el desempeño depende de factores como la frecuencia de uso y el entorno en el que se utilice.",
    },
    {
      t: "Manómetros y swivels",
      texto:
        "En el caso particular de los manómetros, el cliente entiende y acepta que, aun cuando se realice el cambio del swivel, puede presentarse fuga o falla posterior debido a desgastes internos o defectos propios del manómetro. Esto ocurre porque el daño no necesariamente está en el swivel, sino en el mecanismo interno del manómetro, que puede deteriorarse con el tiempo o el uso. Por esta razón, dichas fallas no dependen del servicio realizado por Gus Dive SRL y no pueden ser consideradas responsabilidad de la empresa.",
    },
    {
      t: "Tanques, inspección visual y pruebas hidrostáticas",
      texto:
        "Durante las inspecciones visuales y pruebas hidrostáticas de tanques de buceo, Gus Dive SRL evaluará el estado general del cilindro siguiendo los estándares de seguridad de PSI-PCI aplicables. En caso de detectarse condiciones que hagan que el tanque sea considerado condenado, el cliente acepta que el tanque será inhabilitado para evitar que vuelva a entrar en servicio, incluyendo el maltrato o alteración permanente de la rosca u otras partes críticas del cilindro, conforme a prácticas de seguridad de la industria. Esta medida se realiza con el propósito de prevenir accidentes y proteger la integridad de los usuarios. Asimismo, el cliente entiende y acepta que ciertos tanques pueden ser condenados debido a su fecha de expedición, aun cuando aparentemente no presenten daños visibles, si así lo establecen las normas de seguridad de PSI-PCI.",
    },
  ],
  cierre:
    "Con mi firma reconozco haber entregado mi equipo para servicio/mantenimiento y acepto las condiciones aquí descritas, incluyendo las limitaciones y alcances de responsabilidad señalados por Gus Dive SRL. Una vez notificado para retirar mi equipo, tanque o cualquier artículo dejado en Gus Dive SRL, la empresa no se hace responsable por pérdidas, deterioros, daños o cualquier situación relacionada con dichos artículos después de transcurridos treinta (30) días de la notificación al cliente para su retiro.",
};
