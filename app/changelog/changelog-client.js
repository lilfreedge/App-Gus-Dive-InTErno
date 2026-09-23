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
