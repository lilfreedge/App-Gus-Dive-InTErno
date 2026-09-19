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
    version: "V5",
    fecha: "17 de septiembre, 2026",
    titulo: "Equipos, Catálogo ampliado, Facturación, permisos granulares y más",
    descripcion:
      "Se agregó la sección \"Equipos\" (Llenados, Inspección visual, Mantenimiento de reguladores y un espacio reservado para Compresores), catálogos de \"Reguladores de alquiler\" y \"Tanques de alquiler\", y la opción de marcar llenados como facturados. El Manual ahora tiene buscador y sus temas se despliegan como acordeón. El Changelog se rediseñó igual, con entradas colapsables. Se agregó el botón \"Restaurar\" para recuperar un movimiento anulado desde el Historial, respaldo de datos descargable desde Administración, y configuración del reporte semanal por correo (a quién llega y qué incluye) directamente desde la app. Los permisos de administración ahora son más granulares (quién puede registrar cada tipo de movimiento y quién puede editar cada catálogo).",
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
