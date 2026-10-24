import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
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
  const { profile } = await requireInterno(supabase, "manual");

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

  if (esTitular || permisos.registrar_llenado) {
    topics.push({
      key: "registrar-llenado",
      title: "Registrar un llenado de tanque",
      searchText:
        "registrar llenado de tanque cantidad tipo de gas aire nitrox nota",
      body: (
        <div className="card">
          En Tanques → &quot;+ Registrar llenados&quot;, indica cuántos
          tanques llenaste y el tipo de gas (Aire o Nitrox); la nota es
          opcional. Queda guardado con tu nombre y la fecha para llevar el
          conteo de llenados internos.
        </div>
      ),
    });
  }

  if (esTitular || permisos.inspeccion_registrar) {
    topics.push({
      key: "registrar-inspeccion",
      title: "Registrar una inspección visual",
      searchText:
        "registrar inspección visual tanque aprobado rechazado próxima inspección 2 años",
      body: (
        <div className="card">
          En Inspección visual → &quot;Nueva inspección&quot;, elige el
          tanque y marca si quedó Aprobado o Rechazado, con una nota
          opcional. Puedes agregar varias filas para registrar de una vez
          varias inspecciones del mismo día. La próxima inspección del
          tanque se calcula sola: al final del mes, 2 años después. Cuando
          un tanque vuelve de la prueba hidrostática aprobado, su
          inspección visual se anota sola.
        </div>
      ),
    });
  }

  if (esTitular || permisos.hidrostatica_registrar) {
    topics.push({
      key: "registrar-hidrostatica",
      title: "Enviar tanques a prueba hidrostática y registrar el regreso",
      searchText:
        "prueba hidrostática enviar tanques ph afuera días regreso varios aprobado rechazado inactivo reactivar código 5 años próxima vencida por vencer",
      body: (
        <div className="card">
          En Equipos → Pruebas hidrostáticas → &quot;Enviar tanques a
          PH&quot;, escoge los tanques que salen ese día y la fecha. Mientras
          están afuera salen en &quot;Afuera en prueba hidrostática&quot; con
          los días que llevan (azul hasta 15, ámbar hasta 30, rojo más de
          30). Cuando vuelve, toca &quot;Registrar regreso&quot;: pon la fecha
          de regreso, el mes y año de la prueba y el resultado. Con eso queda
          la prueba (la próxima, a 5 años, se calcula sola) y, si salió
          aprobada, también la inspección visual. Si salió rechazada, el
          tanque se inactiva solo. Si volvieron varios el mismo día, usa
          &quot;Registrar regreso de varios&quot;: marcas los que volvieron,
          pones la fecha y el mes de la prueba una sola vez, y el resultado
          de cada uno. Para reactivar un tanque rechazado (Titular o
          Administrador), el app pregunta si su código se va a usar en otro
          tanque (se crea uno nuevo y el viejo se queda con su historial) o
          si es el mismo tanque. Para pruebas viejas, de antes de usar el
          app, usa el enlace &quot;Anotar una prueba ya hecha&quot;.
        </div>
      ),
    });
  }

  if (esTitular || permisos.proximos_vencimientos) {
    topics.push({
      key: "proximos-vencimientos",
      title: "Ver los próximos vencimientos",
      searchText:
        "próximos vencimientos vencido por vencer mantenimiento reguladores inspección visual prueba hidrostática 2 meses",
      body: (
        <div className="card">
          Más → Próximos vencimientos junta en una sola pantalla el
          mantenimiento de reguladores, la inspección visual y la prueba
          hidrostática de los tanques: primero lo vencido (en rojo) y
          después lo que vence en los próximos 2 meses (en ámbar). Es
          solo para consultar — el enlace &quot;Ir a…&quot; de cada
          sección lleva a la pantalla donde se registra. Se puede poner
          como atajo en el menú de arriba desde Mi Perfil.
        </div>
      ),
    });
  }

  if (esTitular || permisos.solicitudes_almacen) {
    topics.push({
      key: "solicitudes-almacen",
      title: "Pedir códigos al almacén",
      searchText:
        "solicitud solicitar códigos almacén tienda cantidad nota recibido llegó todo correo aviso",
      body: (
        <div className="card">
          Más → Solicitudes al almacén → &quot;+ Solicitar códigos a
          almacén&quot;. Agrega uno o varios códigos de la base de datos
          con su cantidad, y una nota opcional para toda la solicitud. Al
          enviarla, al almacén le llega un correo con la lista. Cuando la
          mercancía llega a la tienda, marca cada código como
          &quot;Recibido&quot; (o &quot;Llegó todo&quot;); la solicitud
          pasa a &quot;Recibidas&quot; cuando todos sus códigos llegaron. Los
          correos del almacén se configuran en Administración → Correos
          automáticos.
        </div>
      ),
    });
  }

  if (esTitular || permisos.mantenimiento_registrar) {
    topics.push({
      key: "registrar-mantenimiento",
      title: "Registrar un mantenimiento de regulador",
      searchText:
        "registrar mantenimiento regulador limpieza ultrasonido presión intermedia o-rings próximo mantenimiento",
      body: (
        <div className="card">
          En Mantenimiento de reguladores → &quot;Nuevo
          mantenimiento&quot;, elige el regulador y marca qué se hizo:
          Limpieza ultrasonido (Sí/No), Presión intermedia (Sí/No) y
          O-rings (Ninguno o Especificar cuáles). La nota es opcional
          para cualquier detalle extra, y la fecha del próximo
          mantenimiento (+8 meses) se actualiza sola.
        </div>
      ),
    });
  }

  if (esTitular || permisos.facturacion) {
    topics.push({
      key: "facturacion",
      title: "Marcar un llenado como facturado",
      searchText:
        "marcar llenado facturado factura número por facturar facturar varios",
      body: (
        <div className="card">
          En Equipos › Llenados de tanque, cada llenado sin facturar tiene
          abajo la etiqueta roja &quot;Pendiente por facturar&quot; y el
          botón &quot;Facturar&quot;: tócalo, escribe el No. de factura y
          guarda. &quot;Por facturar&quot; filtra la lista para ver solo
          los pendientes (dice cuántos hay), y &quot;Facturar varios&quot;
          te deja seleccionar varios llenados y marcarlos todos con un mismo
          número de factura. Ya facturado sale en verde, con
          &quot;Cambiar&quot; para corregir el número. Lo puede hacer quien
          tenga el permiso &quot;Facturación de llenado&quot;; si no se
          puede guardar, sale el aviso. Arriba de la lista hay un buscador
          (por No., persona, nota o No. de factura).
        </div>
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

  if (esTitular || permisos.catalogo_codigo) {
    topics.push({
      key: "catalogo-codigo",
      title: "Registrar códigos en la base de datos",
      searchText: "agregar códigos catálogo descripción salida",
      body: (
        <div className="card">
          Más → Base de datos → pestaña &quot;Códigos&quot; → &quot;+ Agregar&quot;.
          Escribe el código y una descripción — solo se puede registrar
          una salida de un código que ya esté en el catálogo, así que si
          un artículo nuevo no aparece al buscarlo, hay que agregarlo
          aquí primero.
        </div>
      ),
    });
  }

  if (esTitular || permisos.catalogo_regulador) {
    topics.push({
      key: "catalogo-regulador",
      title: "Agregar reguladores al catálogo",
      searchText:
        "agregar reguladores catálogo serie primera etapa segunda etapa octopus manómetro alquiler mantenimiento",
      body: (
        <div className="card">
          Más → Base de datos → pestaña &quot;Reguladores&quot; → &quot;+
          Agregar&quot;. El código es obligatorio; serie, 1ra etapa, 2da
          etapa, octopus y manómetro son opcionales. Un regulador debe
          estar aquí antes de poder registrarle mantenimientos.
        </div>
      ),
    });
  }

  if (esTitular || permisos.catalogo_tanque) {
    topics.push({
      key: "catalogo-tanque",
      title: "Agregar tanques de alquiler al catálogo",
      searchText:
        "agregar tanques de alquiler catálogo descripción número de serie inspección visual",
      body: (
        <div className="card">
          Más → Base de datos → pestaña &quot;Tanques&quot; → &quot;+ Agregar&quot;.
          El código es obligatorio; descripción y número de serie son
          opcionales. Un tanque debe estar aquí antes de poder
          registrarle inspecciones visuales.
        </div>
      ),
    });
  }

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
      title: "Cambiar el rol de una persona (Usuario, Administrador, Operativo o Técnico)",
      searchText:
        "dar quitar rol administrador operativo tecnico técnico equipos pantalla de inicio ajustes administración usuario titular llenados",
      body: (
        <>
          <div className="card">
            Ajustes → Administración → Usuarios y permisos. Toca a la
            persona y elige su rol en &quot;Rol&quot;:
            &quot;Usuario&quot;, &quot;Administrador&quot; u
            &quot;Operativo&quot;. El Titular no se puede cambiar ni
            asignar desde ahí — solo el Titular lo es, y nadie se lo puede
            quitar.
          </div>
          <div className="card">
            <b>Operativo:</b> solo registra llenados de tanque. Entra
            directo a una sola pantalla, sin botones en el menú de arriba:
            el formulario de llenado, el resumen de la semana (lunes a
            sábado) y los llenados de hoy de todos. No tiene &quot;Cambiar de
            app&quot;: solo usa App Interno.
          </div>
          <div className="card">
            <b>Técnico:</b> su rol tiene la Pantalla de inicio &quot;Equipos
            (para rol técnico)&quot;. Entra directo a Equipos, solo con lo que
            tenga marcado (por ejemplo, mantenimiento de reguladores y de
            compresores), y en el menú no le sale &quot;Inicio&quot;. Para que
            entre a App Interno hay que darle App Interno en Accesos a apps. La
            Pantalla de inicio de cada rol se cambia en Administración › Roles.
          </div>
          <div className="card">
            <b>Roles vinculados:</b> en Administración › Roles, &quot;Vinculado
            con&quot; une un rol de App Interno con uno de App Equipos de
            clientes (como los dos &quot;Técnico&quot;). Al ponérselo a alguien
            en una app, se le pone en las dos; al quitárselo, se le quita en las
            dos. Cada parte se edita en el Roles de su app.
          </div>
        </>
      ),
    });

    topics.push({
      key: "permisos",
      title: "Qué hace cada permiso",
      searchText:
        "permisos salidas equipos llenados movimientos más base de datos reportes historial changelog manual administrador usuario",
      body: (
        <div className="card">
          En Administración → Usuarios y permisos, al tocar a una persona
          se ven sus permisos por sección, en el mismo orden del menú:
          Salidas, Equipos, Movimientos, Más y el menú ⚙. Cada sección
          del menú de arriba solo le sale si tiene al menos un permiso
          adentro, y cada permiso deja ver esa pantalla y registrar en
          ella. Son aparte del rol: sin importar esas casillas, editar,
          anular e inactivar solo lo ven Titular y Administrador. La
          entrada a cada app se da en Accesos a apps.
          <br />
          <br />
          En Equipos, varios van en dos partes: arriba el de <b>ver</b> y
          debajo el de <b>registrar</b> (inspección visual, pruebas
          hidrostáticas, mantenimiento de reguladores y, desde la V34,
          compresores: &quot;Registrar mantenimiento de compresor&quot;).
          &quot;Registrar y editar compresor&quot; deja agregar compresores
          nuevos y cambiar sus datos.
        </div>
      ),
    });
  }

  // V37 -- Compresores: fecha automática, horómetro por foto, aceite,
  // historial ampliado y recordatorios.
  if (esTitular || !!permisos.compresores) {
    topics.push({
      key: "compresores-v37",
      title: "Compresores: registrar mantenimiento, historial y recordatorios",
      searchText:
        "compresor mantenimiento horómetro foto lee número fecha automática aceite mirilla lleno bien bajo muy bajo echó historial gráfica recordatorio inspección 14 días hecho",
      body: (
        <>
          <div className="card">
            Al registrar un mantenimiento ya no se escoge la fecha: la pone el app al guardar y no se puede cambiar,
            ni al editar. Primero se toma la foto del horómetro y el app lee el número (de frente, de cerca y sin
            reflejo); se puede corregir, y si se cambia, en el historial sale ✎ con lo que decía la foto. El
            horómetro no puede ser menor que el último registrado de ese compresor. El nivel de aceite se escoge de
            la lista, como se encontró en la mirilla antes de echarle, y se marca si se le echó aceite.
          </div>
          <div className="card">
            En el Historial (con el permiso &quot;Ver historial de mantenimientos&quot;) se escoge el compresor arriba:
            salen los cuadritos de resumen, la gráfica del aceite y la tabla con todo; en &quot;Todos&quot;, una
            tarjetita por compresor y todos los registros juntos. El Titular y los administradores pueden escoger
            qué columnas ver con &quot;Personalizar vista&quot;.
          </div>
          <div className="card">
            Recordatorios: el Titular y los administradores los crean en Compresores › Administrar recordatorios.
            Cada uno dice qué hay que hacer, cada cuántos días (u horas del horómetro), a qué compresores, con qué se
            reinicia (al registrar ese mantenimiento, o con el botón &quot;Hecho&quot;) y a quién le sale. Salen en
            Compresores, en Inicio y en la tarjeta de App Interno al entrar: en rojo los vencidos y en ámbar los que
            están por vencer.
          </div>
        </>
      ),
    });
  }

  // V37 -- Avisar al técnico por WhatsApp. V38: el aviso va al grupo.
  if (esTitular || !!permisos.equipos_clientes_asignar) {
    topics.push({
      key: "whatsapp-tecnico",
      title: "Avisarle al técnico por WhatsApp (en el grupo)",
      searchText: "whatsapp técnico asignar orden aviso avisado sin avisar bitácora grupo",
      body: (
        <>
          <div className="card">
            Al asignar una orden sale el botón verde &quot;Avisar en el grupo por WhatsApp&quot;: abre WhatsApp con el
            mensaje ya escrito (&quot;Hola Dany, tienes una orden asignada…&quot;). Escoges el grupo del taller, que sale
            arriba en los recientes, y le das Enviar. Sale desde el WhatsApp de quien asigna. Un link de WhatsApp no
            puede abrir un grupo directo, por eso hay que tocar el grupo.
          </div>
          <div className="card">
            Cada aviso queda anotado: en Registro de Órdenes cada orden asignada dice &quot;Avisado en el grupo&quot; o
            &quot;Sin avisar&quot; (con el botón para avisar), en la Bitácora de órdenes está la pestaña &quot;Avisos a
            técnicos&quot;, y en la ficha del técnico cuántos ha recibido. Si se reasigna la orden, hay que volver a
            avisar. El app sabe que se abrió WhatsApp, no si de verdad se le dio Enviar.
          </div>
        </>
      ),
    });
  }

  // V38 -- Menú del técnico.
  if (esTitular || esAdmin) {
    topics.push({
      key: "menu-tecnico",
      title: "El menú del técnico",
      searchText: "técnico menú mis trabajos lo que te toca informe compresores regulador listo hold",
      body: (
        <>
          <div className="card">
            Quien tiene el rol Técnico entra directo a su menú, &quot;Mis trabajos&quot;: sus órdenes asignadas (con el número de orden en grande), los
            recordatorios de compresores que le salen a él y las órdenes esperando al cliente. Cada orden se abre
            en su propia pantalla y se trabaja en pasos: los códigos usados en la orden, el informe (en reguladores),
            la nota interna (no la ve el cliente) y &quot;Mantenimiento listo&quot;. Al guardar el informe vuelve solo a la orden. Desde su menú también registra el mantenimiento de un compresor o de un regulador de la tienda, con
            botones grandes. Le sale según sus permisos.
          </div>
          <div className="card">
            En los reguladores, el técnico no puede poner listo sin el Informe de mantenimiento; a ti y a los
            administradores solo les sale un aviso. El técnico no ve el teléfono del cliente. Para verlo como lo ve él:
            ⚙ › &quot;Ver el menú del técnico&quot; en &quot;¿A dónde quieres entrar?&quot;, o &quot;Ver su menú de
            técnico&quot; en su ficha. Lo que hagas ahí queda a tu nombre.
          </div>
        </>
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
        <Breadcrumb items={[{ label: "Manual" }]} />

        <p style={{ margin: "0 0 16px", color: "var(--texto-suave)", fontSize: 14 }}>
          {intro}
        </p>

        <ManualClient topics={topics} />
      </div>
    </div>
  );
}
