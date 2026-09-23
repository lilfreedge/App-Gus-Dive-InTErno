"use client";

import { useState } from "react";

// Contenido estático, no viene de la base de datos — solo Claude (vía
// futuras actualizaciones) agrega entradas nuevas aquí a mano.
//
// TODO(humano): cuando tengas capturas reales de cada versión, súbelas a
// public/changelog/ (por ejemplo public/changelog/v1.png,
// public/changelog/v2-antes.png, public/changelog/v2-despues.png,
// public/changelog/v3-antes.png, public/changelog/v3-despues.png) y
// reemplaza los <PlaceholderShot /> de abajo por <img src="/changelog/..." />.
const ENTRADAS = [
  {
    version: "V11",
    fecha: "23 de septiembre, 2026",
    titulo: "Compresores: catálogo, registro de mantenimientos con fotos e historial filtrable, y primera versión de App Equipos Clientes",
    descripcion:
      "Compresores (dentro de Equipos) ya no es un \"próximamente\" -- tiene catálogo de compresores en tarjetas con foto (3 por fila), un formulario para registrar cada compresor (descripción, código, marca, modelo, no. de bloque, serie y foto opcional), la ficha de cada compresor con sus datos, su horómetro más reciente y un botón para inactivar/reactivar (Titular), y el registro de mantenimientos: tipo (Inspección, Preventivo o Correctivo), responsable, fecha, horómetro y foto, con casillas adicionales que aparecen según el tipo elegido (para Inspección: nivel de aceite, limpieza, estado de manguera y filtros, limpieza de espacio, más fotos; para Preventivo/Correctivo: proceso y piezas utilizadas, foto de la reparación). El Historial de mantenimientos se puede filtrar por tipo, compresor, responsable y rango de fechas. Ajustado el mismo día: \"Registrar mantenimiento\" pasó a ser el botón prominente del listado (se usa seguido) y \"Registrar compresor\" se volvió un link sutil a la derecha (casi no se usa); y se agregó el aviso de \"pendiente por inspección / próxima a vencer\" (cada 2 semanas, igual que tanques/reguladores) debajo del listado y en la ficha de cada compresor -- por ahora solo aplica al tipo Inspección. Más ajustes el mismo día: la ficha de cada compresor ahora también muestra Última inspección, Último mantenimiento preventivo y Último mantenimiento correctivo, para ver todo su estado de un vistazo; se puede Editar un compresor ya creado (queda registrado en Administración > Historial > Ediciones); en el Historial de mantenimientos cada registro es ahora un botón que lleva a su propia ficha (ya no se abre ahí mismo) -- en la lista solo se ve la fecha de registro, el responsable y el tipo, todo lo demás (compresor, horómetro, fecha del mantenimiento, notas, fotos y los campos según el tipo) vive en esa ficha; y el aviso de inspección pasó de dos secciones (\"pendientes\"/\"próximos\") a una sola lista tipo dashboard arriba del listado, cada línea dice \"Hacer inspección de {código} — {fecha}\" en rojo si ya venció. También se achicó el breadcrumb (título + migas de pan) en TODA la app -- hacía mucho ruido visual al tamaño de un título normal. Y, el mismo día: App Clientes (accesible desde \"Cambiar de app\") dejó de ser un \"próximamente\" y estrenó su primera versión real -- ahora tiene su propio menú (Inicio, Registro, Listado de clientes, Historial de órdenes). El hub principal muestra de un vistazo las órdenes pendientes por trabajar y las pendientes por despachar. \"Registrar orden\" pide el cliente (con la opción de crearlo ahí mismo si todavía no existe), la fecha (hoy por defecto, editable), el tipo de equipo (Tanques, Reguladores, BC, Computadora u Otro con detalle libre), qué se le hará, notas y una foto, todo opcional salvo lo esencial -- y muestra el historial reciente del cliente elegido, si tiene. Cada orden arranca en \"Pendiente por trabajar\" y avanza con un botón (En proceso → Pendiente por despachar → Entregado). El Listado de clientes permite buscar y agregar clientes, y la ficha de cada cliente muestra su historial de órdenes -- cada una es un botón a su propia ficha, no un acordeón. El Historial de órdenes se puede filtrar por tipo de equipo, cliente, estado y rango de fechas. Ajustado el mismo día, tras probarlo en vivo: \"Registro\" en el menú de App Clientes dejó de llevar directo al formulario -- ahora es la cola de trabajo, un listado de las órdenes abiertas (nunca las Entregado, esas solo viven en Historial de órdenes) con pestañas para filtrar entre Abiertas / Pendientes por trabajar / Pendientes por entregar y un buscador de cliente; \"Registrar orden\" sigue disponible ahí mismo con su propio botón. Y \"Mi Perfil\" de App Clientes se independizó -- ya no lleva al Mi Perfil de App Interno, ahora es su propia pantalla (todavía sin contenido definido). Ampliado el mismo día: \"Registrar orden\" ahora pide el Equipo del cliente en vez del tipo suelto -- cada equipo (tipo, marca y modelo) se busca o se crea ahí mismo, y queda ligado al cliente para siempre, así que la ficha de cada equipo muestra el historial completo de todo lo que se le ha hecho, sin importar cuántas veces haya venido (se llega desde la ficha del cliente, que ahora tiene una sección \"Equipos registrados\"). La ficha de cada orden ganó una sección \"Seguimiento\" con los campos que se van llenando a medida que avanza -- Envío a (Prueba hidrostática o Reparación), fecha de retorno a tienda, fecha de listo para entrega, verificado por (Pipe o Gugi), fecha de notificación al cliente, fecha de entrega al cliente, nombre de quien recibe y factura -- todos opcionales, editables desde \"Editar seguimiento\". El botón de \"avanzar estado\" a mano desapareció: el estado de la orden (Pendiente por trabajar / En proceso / Pendiente por despachar / Entregado) ahora se calcula solo según qué de eso ya esté lleno, y con la fecha de entrega al cliente puesta la orden se da por cerrada. Cada edición de seguimiento queda anotada en un historial nuevo, visible solo para el Titular por ahora: se agregó \"Administración\" a App Clientes (menú de ajustes, solo Titular) con los permisos propios de esta app y el historial de ediciones de cada orden. Ajustado el mismo día, tras probarlo en vivo: \"Servicio a realizar\" pasó de texto libre a una lista fija (Limpieza, Prueba hidrostática, Limpieza + prueba hidrostática, Mantenimiento, Reparación, Chequeo, Inspección visual, Flasheo, + Otro con detalle libre). El botón para llenar el seguimiento se movió arriba de la lista de campos y se renombró a \"Actualizar seguimiento\", y esa sección se unió a la tarjeta principal de la orden (antes eran dos tarjetas separadas). Si \"Envío a\" queda en \"Sin enviar / no aplica\", el campo \"Fecha de retorno a tienda\" ya no se muestra (ni en la ficha ni al editar). Se corrigió que la ficha de una orden a veces no reflejaba al toque los cambios recién guardados en su seguimiento. La segunda lista del hub de App Clientes se renombró a \"Órdenes pendientes por entregar\" (antes \"por despachar\"). Se corrigió que las ediciones de seguimiento hechas por el Titular no quedaban anotadas en el historial de ediciones (un bug de la política de la base de datos agregada ese mismo día). App Clientes ganó la misma pantalla de carga (ícono de Gus) que ya tenía App Interno. Se agregó un \"Ordenar por\" arriba del listado de Registro (más recientes/antiguas primero) y del Listado de clientes (nombre A-Z/Z-A o más reciente primero). Al agregar un equipo nuevo, Reguladores, Tanques y Computadora ahora piden No. Serie; Tanques además dejó de pedir Marca y Modelo, en su lugar pide solo Fabricante y No. Serie. Y se agregó, desde la ficha de cada cliente, la opción de agregar varios equipos de una sola vez a su nombre, sin tener que pasar por una orden. Ajustado el mismo día, otra ronda de feedback: cuando \"Envío a\" es Prueba hidrostática o Reparación, ahora también se puede anotar la \"Fecha de envío\" (antes solo estaba la de retorno), y mientras una orden sigue afuera (enviada pero sin volver todavía) aparece de un vistazo en el hub principal, en \"Tanques enviados a prueba hidrostática\" u \"Órdenes enviadas a reparación\" -- si no hay ninguna, esas secciones no se muestran. \"Reguladores\" y \"Tanques\" pasaron a mostrarse en singular (\"Regulador\", \"Tanque\") en todas las pantallas de App Clientes -- el valor que se guarda no cambió, solo lo que se ve. \"Registrar orden\" ahora pide primero, antes que el cliente, el \"No. de orden\" -- el número que se anota a mano en el talonario físico de papel al recibir el equipo (distinto del folio digital, que sigue generándose solo), y se muestra en la ficha de la orden. Y se agregó un botón \"Más\" al menú de App Clientes, junto a Historial de órdenes, con un Catálogo de servicios adentro (mismo patrón que \"Más\" en App Interno) -- reemplaza la lista de servicios que antes estaba fija en el código de \"Registrar orden\": ahora se pueden agregar, renombrar o desactivar servicios sin tocar código. Tanda grande de correcciones y funciones nuevas, el mismo día: se corrigió que crear un equipo tipo Tanque o Computadora fallara con \"No se pudo crear el equipo\" (columna que faltaba en la base de datos) y ahora, si algo falla al crear un equipo, se muestra el motivo real en vez de un mensaje genérico; y se corrigió que la sección \"Seguimiento\" de la ficha de una orden no mostrara Envío a, fechas, verificado por, No. de orden y demás campos aunque sí se hubieran guardado bien (una vista de la base de datos que no había quedado actualizada). \"Catálogo\" se renombró a \"Base de datos\" y pasó a ser un hub con dos secciones: \"Servicios\" (lo que ya había) y \"Piezas y repuestos\" (nuevo catálogo, mismo patrón: se agrega, se renombra o se desactiva, sin borrado). \"Historial de órdenes\" se renombró a \"Listado de órdenes\" en el menú y en las migas de pan (el título \"Historial de órdenes\" dentro de la ficha de un cliente, que es sobre las órdenes de ESE cliente, no cambió). El \"← Volver\" de Listado de clientes y Listado de órdenes se reemplazó por flechas de navegación (‹ ›) que avanzan y retroceden entre las 5 pantallas principales (Inicio, Registro, Listado de clientes, Listado de órdenes, Más), igual que ya tenía App Interno. El menú superior de App Clientes ahora se puede reordenar arrastrando sus pestañas (Registro, Listado de clientes, Listado de órdenes) -- Inicio y Más quedan siempre fijos, mismo mecanismo que ya tenía App Interno pero con su propio orden guardado, sin pisar el de allá. Se agregó \"Órdenes en espera\": un check y un motivo corto en \"Actualizar estado de orden\" para las que quedan detenidas (por ejemplo, esperando que lleguen piezas), que se ven como aviso rojo en la orden y en una sección nueva del hub de Inicio. En la ficha de cada cliente, cada equipo de \"Equipos registrados\" ahora muestra la fecha de su última vez en tienda. Se agregó \"Repuestos utilizados\", un campo de texto libre en \"Actualizar estado de orden\" (visible en la ficha de la orden) para que en tienda sepan qué cobrar al momento de la entrega. El hub de Inicio se reorganizó: \"Tanques enviados a prueba hidrostática\" se renombró a \"Órdenes en prueba hidrostáticas\" y, junto con \"Órdenes enviadas a reparación\", se movieron al final de la lista; cada sección ahora muestra cuántas órdenes tiene; las que ya salieron a hidrostática o reparación dejaron de listarse también en \"Pendientes por trabajar\" (ya tienen su propia sección); cada sección muestra ahora la fecha que de verdad le corresponde (\"Fecha enviado\" en hidrostática/reparación, \"Fecha listo para entrega\" en pendientes por entregar, en vez de repetir la fecha de ingreso); y el badge de estado (\"En proceso\", \"En espera\") se movió al medio de la fila en vez de quedar pegado a la fecha. Si el servicio de la orden es \"Prueba hidrostática\", \"Envío a\" se preselecciona solo (nunca si ya se había elegido algo a mano). Se agregó \"Changelog\" al menú de ajustes de App Clientes (esta misma pantalla), visible según el mismo permiso \"changelog\" que ya usa App Interno. Se agregaron 4 permisos nuevos, más finos, para App Clientes: \"Registrar orden\", \"Agregar equipo\", \"Agregar cliente\" y \"Base de datos\" -- sin uno de ellos, el usuario sigue viendo todo igual, solo no ve el botón para esa acción en particular. Mi Perfil de App Clientes dejó de estar vacío: ahora tiene nombre editable, \"Mi actividad\" (órdenes, clientes y equipos que ese usuario ha registrado), \"Preferencias de apariencia\" (la misma de App Interno, es de toda la cuenta) y \"Personalizar mi menú\". Y en la tabla de Permisos de App Clientes, la fila del Titular ahora dice \"Titular\" en vez de \"Tú\", igual que en App Interno.",
  },
  {
    version: "V10",
    fecha: "23 de septiembre, 2026",
    titulo: "Avisos de tanques por inspeccionar en Equipos, ajustes finos a V9 y Administradores reales en Administración",
    descripcion:
      "Inspección visual y Mantenimiento de reguladores (dentro de Equipos) ahora tienen, debajo de la lista, dos avisos nuevos cada una: tanques/reguladores pendientes (los que nunca tuvieron inspección/mantenimiento o ya tienen la fecha vencida) y los que les faltan 2 semanas o menos para que venza su próxima fecha. Los avisos de \"inspección/mantenimiento vencido\" de Inicio ahora llevan directo a esas dos pantallas (antes llevaban al Catálogo). La etiqueta \"Selecciona tu espacio\" quedó todavía más arriba, casi al nivel del logo. En Administración, la sección de Administradores debajo de \"Catálogo — Registrar\" se rehizo: ya no es una fila de \"plantilla\" para futuros ascensos, ahora muestra directamente a quienes ya tienen el rol Administrador hoy, con sus permisos reales editables ahí mismo.",
  },
  {
    version: "V9",
    fecha: "22 de septiembre, 2026",
    titulo: "Avisos de inspecciones y mantenimientos vencidos, ajustes a la pantalla selectora y a Mi Perfil",
    descripcion:
      "Inicio (y la pantalla selectora de espacio) ahora también avisan si hay tanques con la inspección visual vencida o reguladores con el mantenimiento vencido, además del aviso de llenados pendientes por facturar que ya existía -- los tres avisos juntos en un solo lugar. En el menú de ajustes, \"Cambiar de espacio\" se renombró a \"Cambiar de app\" y se movió justo encima de \"Cerrar sesión\". La pantalla selectora de espacio ahora tiene el logo de Gus Dive y una tuerquita de ajustes arriba a la derecha para poder cerrar sesión sin tener que entrar a App Interno primero; su título \"Selecciona tu espacio\" quedó más arriba y más grande. Mantenimiento de reguladores, en el hub de Equipos, estrenó ícono propio (ya no comparte el de llave inglesa). Mi Perfil se reordenó: primero el nombre (con el botón de editar), luego \"Ver mi actividad\", y por último Apariencia -- se quitó el texto explicativo que sobraba arriba de \"Mi actividad\". En Administración se quitaron \"Logo de inicio de sesión\" y \"Dominio personalizado\", dos secciones que ya no hacían falta, y se agregó \"Permisos por defecto para nuevos Administradores\": una plantilla debajo de \"Catálogo — Registrar\" que se pre-marca sola la primera vez que alguien pasa de Usuario a Administrador, sin tocar a quienes ya lo son hoy.",
  },
  {
    version: "V8",
    fecha: "22 de septiembre, 2026",
    titulo: "Gus App: pantalla selectora, reportes automáticos rediseñados, envío por correo a cualquier destinatario y más",
    descripcion:
      "La app se renombró a \"Gus App\". Al entrar, ahora aparece primero una pantalla para elegir el espacio: \"App Clientes\" (nuevo, todavía en camino) o \"App Interno\" (todo lo que ya existe), cada uno con sus propias notificaciones debajo -- por ejemplo, App Interno avisa ahí mismo si hay llenados pendientes por facturar. Desde dentro de la app se puede volver a esa pantalla con \"Cambiar de espacio\" en el menú de ajustes (el ícono de tuerca). \"Reportes automáticos\" (en Reportes) se rediseñó por completo: ya no está detrás de una sección plegada, tiene su propio aviso de \"Solo visible para ti\", y cada envío tiene un botón para mandarse solo a sí mismo (\"Enviar solo esto ahora\") sin tener que mandar todos los envíos configurados. En el modal \"Ver reporte\", \"Enviar por correo\" ahora deja escribir a qué dirección mandarlo, en vez de mandarse siempre al correo de quien tiene la sesión abierta. Al crear un tanque nuevo en el Catálogo se puede indicar la fecha de su última inspección visual, para que la próxima quede calculada bien desde el arranque en vez de partir de hoy. La sección \"Catálogo\" se renombró a \"Códigos\" en el título de esa pantalla. La etiqueta \"App Interno\" arriba del menú quedó centrada y un poco más grande.",
  },
  {
    version: "V7",
    fecha: "22 de septiembre, 2026",
    titulo: "Reportes automáticos a varios destinatarios, vista previa de reportes, ficha de usuario y correcciones",
    descripcion:
      "El reporte semanal por correo ya no manda una sola cosa a una sola lista de personas: ahora se configuran \"envíos\" independientes, cada uno con su propia lista de destinatarios y su propia selección de secciones (por ejemplo, un envío solo de Facturación para contabilidad y otro con todo para el Titular), y \"Reporte instantáneo\" manda todos esos envíos de una vez. Esa configuración se movió de Administración a Reportes, y ahora se le puede dar acceso a un administrador sin que tenga que ser Titular, con el nuevo permiso \"Correos semanales\". En Reportes, \"Descargar PDF\" y \"Descargar Excel\" se reemplazaron por un solo botón \"Ver reporte\", que abre una vista previa en pantalla; desde ahí se puede descargar el PDF o mandarlo directo al propio correo. En Administración, tocar el nombre de cualquier usuario ahora abre su ficha: cuánto ha registrado (salidas, llenados, inspecciones, mantenimientos), sus permisos activos y los datos de su cuenta (correo, último acceso). Se agregó \"App Interno\" como etiqueta fija arriba del menú principal, en todas las pantallas. Se corrigió el contraste en modo oscuro (los títulos y textos en azul casi no se veían sobre el fondo oscuro) y que la sección \"Usuarios y permisos\" de Administración apareciera abierta por defecto al entrar.",
  },
  {
    version: "V6",
    fecha: "21 de septiembre, 2026",
    titulo: "Ficha de reguladores y tanques, menú personalizado, permiso de Compresores y checklist de mantenimiento",
    descripcion:
      "Reguladores de alquiler y Tanques de alquiler ganaron una ficha más completa (1ra y 2da etapa, Octopus, Manómetro en los reguladores), con la fecha de su próximo mantenimiento o inspección calculada sola cada vez que se registra uno nuevo. En Mi Perfil se agregó \"Personalizar mi menú\", para que cada quien elija qué accesos directos quiere ver en el menú de arriba. \"Compresores\" pasó a ser un permiso que el Titular otorga persona por persona, en vez de estar abierto para cualquier usuario logueado. El formulario de Mantenimiento de reguladores cambió el detalle obligatorio por una lista de chequeo (Limpieza por ultrasonido, Presión intermedia, O-rings) con una nota opcional. También se corrigió que restaurar desde Historial una salida o un llenado registrado originalmente por OTRA persona fallaba con \"No se pudo restaurar\".",
  },
  {
    version: "V5",
    fecha: "17 de septiembre, 2026",
    titulo: "Equipos, Catálogo ampliado, Facturación, permisos granulares y más",
    descripcion:
      "Esta fue la actualización más grande hasta ahora. Se agregó una sección completamente nueva, \"Equipos\", que agrupa todo lo relacionado a mantener el equipo de buceo: Llenados de tanque, Inspección visual, Mantenimiento de reguladores y un espacio ya reservado para Compresores cuando se necesite. Al registrar una inspección o un mantenimiento, la fecha de la próxima ya no hay que calcularla a mano: el sistema la pone sola (inspección a un año, mantenimiento de reguladores a ocho meses). El Catálogo también creció: además de los Códigos de siempre, ahora hay catálogos separados de \"Reguladores de alquiler\" y \"Tanques de alquiler\", cada uno con su propia ficha, número de serie e historial. En Llenados se puede marcar uno o varios movimientos como facturados de una vez, con su número de factura, y tanto Movimientos como Reportes ahora incluyen también las inspecciones visuales y los mantenimientos, no solo salidas y llenados. Del lado de administración, los permisos son mucho más finos: ya no es todo-o-nada por rol, sino que se puede decidir, persona por persona, quién registra cada tipo de movimiento, quién factura y quién edita cada catálogo por separado. También se puede descargar un respaldo completo de los datos (en JSON) desde Administración, y el reporte semanal por correo ahora se configura desde la misma app (a quién llega y qué secciones trae), con un botón para enviarlo al instante si hace falta antes de que llegue el lunes. Por último, el Manual estrenó buscador y temas en acordeón, el Changelog se rediseñó igual (esta misma pantalla), el Historial ganó un botón \"Restaurar\" para recuperar un movimiento anulado sin perder el rastro, y se agregaron migas de pan en casi toda la app para siempre saber en qué pantalla se está parado.",
  },
  {
    version: "V4",
    fecha: "9 de septiembre, 2026",
    titulo: "Motivo de anulación, sección Manual, Mi Perfil y mejoras generales",
    descripcion:
      "Ahora hay que explicar el motivo al anular una salida o un llenado. Se agregó la sección \"Manual\" (visible según permiso otorgable a cada usuario) y la página \"Mi Perfil\" con \"Mi actividad\" y \"Apariencia\" (modo oscuro y tamaño de letra). También se mejoraron Inicio, Reportes, Catálogo e Historial, y se agregó la opción de recuperar la contraseña.",
  },
  {
    version: "V3",
    fecha: "2 de septiembre, 2026",
    titulo: "Roles avanzados, folios, reportes en PDF y más",
    descripcion:
      "Se agregó el rol de Titular con permisos por sección, número de folio en cada salida y llenado, catálogo visible para todos con búsqueda y descripciones, reportes en PDF y Excel con diseño de marca, historial dividido en anulados/ediciones con hora correcta de Santo Domingo, y la página \"Editar mi perfil\" para cambiar nombre y contraseña.",
    shots: ["Antes", "Después"],
  },
  {
    version: "V2",
    fecha: "2 de septiembre, 2026",
    titulo: "Roles, catálogo, reportes y edición con historial",
    descripcion:
      "Se agregaron administradores, catálogo de artículos, edición/borrado con historial de cambios, y reportes exportables.",
    shots: ["Antes", "Después"],
  },
  {
    version: "V1",
    fecha: "27 de agosto, 2026",
    titulo: "Lanzamiento inicial",
    descripcion:
      "Primera versión: registrar salidas y llenados de tanques, con historial y cuentas de usuario.",
    shots: ["Cómo quedó"],
  },
];

export default function ChangelogClient() {
  // Por defecto, todo colapsado excepto la entrada más reciente (índice 0).
  const [abiertos, setAbiertos] = useState(() => new Set([0]));

  function toggle(i) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div>
      {ENTRADAS.map((e, i) => {
        const abierto = abiertos.has(i);
        return (
          <div className="changelog-entry" key={i}>
            <button
              type="button"
              className="changelog-entry-header"
              onClick={() => toggle(i)}
              aria-expanded={abierto}
            >
              <span>
                <div className="changelog-date">
                  <span className="changelog-version">{e.version}</span> · {e.fecha}
                </div>
                <div className="changelog-title">{e.titulo}</div>
              </span>
              <span className={`manual-chevron${abierto ? " manual-chevron-open" : ""}`}>
                ▾
              </span>
            </button>
            {abierto && (
              <div className="changelog-entry-body">
                <div className="changelog-desc">{e.descripcion}</div>
                {e.shots && e.shots.length > 0 && (
                  <div className="shots">
                    {e.shots.map((lbl) => (
                      <PlaceholderShot key={lbl} label={lbl} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlaceholderShot({ label }) {
  return (
    <div className="shot">
      <div className="lbl">{label}</div>
      <div className="box">Captura no disponible</div>
    </div>
  );
}
