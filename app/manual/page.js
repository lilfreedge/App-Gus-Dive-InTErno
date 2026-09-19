import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import ManualClient from "./manual-client";

// Manual: guía rápida de las tareas de la app. Es un permiso otorgable más
// (junto a reportes/catalogo/historial/changelog), pero el contenido que se
// muestra dentro se filtra por rol/permisos de quien lo está viendo — ver
// cada bloque abajo. No está en el nav de arriba, solo en el menú de
// ajustes (ver TopbarClient), igual que Administración.
//
// El armado de la lista de temas (qué se ve según rol/permisos) vive acá,
// como server component — la lógica de permisos no cambió, solo se agrupó
// cada tema en un objeto {key, title, body, searchText} para que
// manual-client.js pueda mostrarlos como acordeón con buscador.
export default async function ManualPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "manual");

  const esTitular = !!profile?.es_titular;
  const esAdmin = !!profile?.is_admin;
  const permisos = profile?.permisos || {};

  // "Dar/quitar rol de Administrador" y "Qué hace cada permiso" son tareas
  // que solo el Titular puede hacer (asignar roles/permisos), así que solo
  // él las ve — sin importar si a otra persona se le da acceso al Manual
  // con la casilla de permisos.
  const verRolYPermisos = esTitular;
  // Historial y Reportes: se muestran si esa persona realmente ve esas
  // secciones (Titular siempre, o si tiene la casilla de permiso marcada)
  // — no tiene sentido explicarle a alguien cómo funciona una pantalla que
  // no puede abrir.
  const verHistorial = esTitular || !!permisos.historial;
  const verReportes = esTitular || !!permisos.reportes;
  // Editar/anular salidas y llenados: solo lo pueden hacer Titular y
  // Administrador (igual que los botones de editar/borrar en Salidas y
  // Tanques), así que un Usuario no ve este tema.
  const verEditarAnular = esTitular || esAdmin;

  const intro = esTitular
    ? "Guía rápida de las tareas de administración. Solo se muestran aquí los temas que aplican a tu rol y tus permisos."
    : "Guía rápida de las tareas de administración que tienes permiso de ver.";

  const topics = [];

  if (verEditarAnular) {
    topics.push({
      key: "editar-anular",
      title: "Editar o anular una salida o un llenado",
      searchText:
        "editar anular salida llenado lápiz bote de basura motivo de anulación movimientos anulados",
      body: (
        <>
          <div className="card">
            En Salidas o Tanques, toca el lápiz junto al registro para
            editarlo, o el bote de basura para anularlo. Solo Titular y
            Administrador ven estos botones — un Usuario nunca los ve.
          </div>
          <div className="card">
            Al anular, la app pide un motivo de anulación obligatorio — no
            te deja confirmar si lo dejas vacío. El registro no
            desaparece: pasa a &quot;Movimientos anulados&quot; en el
            Historial, con el motivo y quién lo anuló.
          </div>
        </>
      ),
    });
  }

  if (verReportes) {
    topics.push({
      key: "reportes",
      title: "Generar reportes",
      searchText:
        "generar reportes rango de fechas salidas llenados pdf excel descargar",
      body: (
        <div className="card">
          Reportes → elige el rango de fechas y si quieres Salidas,
          Llenados o Todos, y descarga en PDF o Excel. El mismo diseño
          de PDF es el que se manda automáticamente por correo cada
          semana.
        </div>
      ),
    });

    topics.push({
      key: "reporte-semanal",
      title: "Reporte semanal automático por correo",
      searchText:
        "reporte semanal automático correo lunes pdf excel vista previa",
      body: (
        <div className="card">
          Cada lunes llega un correo automático con el reporte de la
          semana anterior (Salidas y Llenados), en PDF y Excel — no hay
          que generarlo a mano. Es el mismo diseño y datos que se ven en
          Reportes → Vista previa.
        </div>
      ),
    });
  }

  topics.push({
    key: "catalogo",
    title: "Agregar códigos al catálogo",
    searchText: "agregar códigos catálogo descripción salida",
    body: (
      <div className="card">
        Catálogo → &quot;+ Agregar&quot;. Escribe el código y una
        descripción — solo se puede registrar una salida de un código que
        ya esté en el catálogo, así que si un artículo nuevo no aparece al
        buscarlo, hay que agregarlo aquí primero.
      </div>
    ),
  });

  if (verHistorial) {
    topics.push({
      key: "historial",
      title: "Cómo funciona el Historial",
      searchText:
        "historial movimientos anulados ediciones quién cuándo por qué motivo de anulación",
      body: (
        <>
          <div className="card">
            <b>Movimientos anulados:</b> salidas o llenados que alguien
            borró. Se guarda el contenido original, quién lo registró y
            cuándo, y quién lo borró y cuándo (y por qué, con el motivo de
            anulación) — nada se pierde de verdad.
          </div>
          <div className="card">
            <b>Ediciones:</b> salidas, llenados o cambios de nombre que
            alguien editó. Se guarda qué cambió, quién lo registró
            originalmente y cuándo, y quién lo editó y cuándo.
          </div>
        </>
      ),
    });
  }

  if (verRolYPermisos) {
    topics.push({
      key: "admin-rol",
      title: "Dar (o quitar) el rol de Administrador",
      searchText:
        "dar quitar rol administrador ajustes administración usuario titular",
      body: (
        <div className="card">
          Ajustes → Administración. Ahí eliges &quot;Administrador&quot;
          o &quot;Usuario&quot; para cada persona con el desplegable de
          la columna &quot;Rol&quot;. El Titular no se puede cambiar ni
          asignar desde ahí — solo el Titular lo es, y nadie se lo puede
          quitar.
        </div>
      ),
    });

    topics.push({
      key: "permisos",
      title: "Qué hace cada permiso",
      searchText:
        "permisos reportes catálogo historial changelog manual administrador usuario",
      body: (
        <div className="card">
          Las casillas de Reportes / Catálogo / Historial / Changelog /
          Manual controlan qué secciones ve cada Administrador o Usuario
          en el menú de arriba. Son aparte del rol: sin importar esas
          casillas, editar, borrar e inactivar en Salidas, Tanques y
          Catálogo solo lo ven Titular y Administrador — un Usuario
          nunca los ve.
        </div>
      ),
    });
  }

  // Qué significa el rol de Titular: información general — se muestra a
  // cualquiera que pueda ver el Manual, sin restricción de rol ni permiso.
  topics.push({
    key: "titular",
    title: "Qué significa el rol de Titular",
    searchText:
      "titular dueño de la cuenta acceso total administrador permisos no se puede reasignar",
    body: (
      <div className="card">
        El Titular es el dueño de la cuenta. Tiene acceso a todo sin
        restricciones, y es el único que puede dar o quitar el rol de
        Administrador y los permisos de cada sección. El rol de Titular no
        se puede reasignar ni quitar desde la app — ni el Titular mismo
        puede cedérselo a otra persona.
      </div>
    ),
  });

  topics.push({
    key: "perfil",
    title: "Mi Perfil",
    searchText:
      "mi perfil ajustes nombre contraseña historial salidas llenados",
    body: (
      <div className="card">
        Ajustes → Mi Perfil. Ahí cambias tu nombre (queda anotado en el
        Historial) o tu contraseña. Tus salidas y llenados pasados
        conservan el nombre tal como era cuando los registraste — no se
        actualizan solos.
      </div>
    ),
  });

  topics.push({
    key: "respaldo",
    title: "Respaldo de datos",
    searchText:
      "respaldo de datos administración sistema descargar copia salidas llenados catálogo historial",
    body: (
      <div className="card">
        En Administración → Sistema → &quot;Respaldo de datos&quot;, el
        Titular puede descargar un archivo con toda la información
        registrada en la app (salidas, llenados, catálogo, historial,
        etc.) como respaldo. Es solo para guardar una copia — no borra ni
        modifica nada.
      </div>
    ),
  });

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Manual</h1>

        <p style={{ margin: "0 0 16px", color: "var(--texto-suave)", fontSize: 14 }}>
          {intro}
        </p>

        <ManualClient topics={topics} />
      </div>
    </div>
  );
}
