# Backlog — próxima actualización (post V10)

Estado al 26 sep 2026: Compresores completo y refinado en v19-v23/V11, y App Equipos de clientes lleva ya 12 entregas seguidas (v24 a v36) el mismo hilo de trabajo. **Lo más urgente ahora mismo: confirmar con el usuario si ya corrió `migration_27.sql` y `migration_28.sql` (de v34/v35) y correr `migration_29.sql`/`migration_30.sql` (de v36, ver detalle en su propia sección abajo).** Los items 3 y 5 de la ronda de v36 (que habían quedado pendientes de aclaración) ya se resolvieron sin necesitar cambios de código — ver esa sección. Activo además: verificación de dominio en Resend (en proceso, ver `estado-proyecto.md`); Buceos Gus (sin definir); posible duda sin confirmar sobre Compresores y URLs de Vercel (preview vs. producción); y feedback en vivo sobre v36 una vez que el usuario la pruebe.

## ✅ Entregado en v36 / V11 (26 sep 2026) — 31 pedidos de una ronda larga de feedback sobre v35

Ronda de feedback acumulada en 31 puntos numerados por el propio usuario, juntados todos antes de tocar código — arrancó con la señal explícita "ok ya tenemos todo". Numeración igual a la que usó el usuario en el chat (por eso hay saltos e items "a"/"b").

1. **Item 4 — Repuestos utilizados, de vuelta a texto libre pero como lista:** el selector de casillas del catálogo de Piezas y repuestos (de v34/v35) se reemplazó por el mismo patrón de "escribir y agregar a una lista" que ya usa Notificaciones al cliente. Lo que ya estaba guardado en órdenes viejas (texto separado por comas) se sigue leyendo y mostrando igual.
2. **Item 7 — Editar/anular una orden ya registrada:** se revisó y ya estaba correctamente gateado a Titular/Administrador desde v35 — no hizo falta ningún cambio.
3. **Item 9 — "Accesos a apps" con resumen de conteos:** dos tarjetas nuevas arriba de la tabla muestran cuántos usuarios (sin contar al Titular) tienen marcado cada acceso, del total.
4. **Item 10 — "#" → "No.":** en toda App Equipos de clientes (Hub de Inicio, Registro de Órdenes, ficha de la orden). No se tocó App Interno (fuera del alcance de esta ronda).
5. **Item 11a — Miga de pan correcta desde el atajo de Registro:** el atajo directo a "Actualizar estado de orden" ahora lleva `?from=registro`, para mostrar "Registro de Órdenes" en la miga de pan en vez de "Listado de órdenes".
6. **Item 11b — Ícono distinto para ese mismo atajo:** de lápiz (confundía con "Editar/anular") a un check.
7. **Item 14 — Acceso al Reporte movido en la ficha de la orden:** de después de "Registrado por" a justo antes de "Seguimiento".
8. **Item 17 — No. de orden auto-sugerido:** arranca con el último número usado + 1, editable, con aviso si se cambia a otro.
9. **Item 18 — Botón "+ Registrar orden" quitado de Inicio:** ya se registra desde Registro de Órdenes.
10. **Item 20 — Before/after en Historial:** las ediciones en Historial (dentro de "Más") ahora muestran el valor de antes Y el de después, campo por campo — columna nueva `cambios_historial.datos_nuevos`, aplicada solo a las pantallas de edición de App Equipos de clientes dentro de este alcance (editar datos de la orden, editar equipo del cliente).
11. **Item 21 — "Servicio a realizar" filtrado por tipo de Equipo:** el desplegable solo muestra los servicios que aplican al tipo de equipo ya elegido. Columna nueva `servicios_catalogo.tipos_equipo` (checkboxes editables desde el Catálogo), con backfill automático por nombre para no dejar huérfano ningún servicio existente.
12. **Item 22 — "Autorización del cliente" solo para Reguladores:** ya no se muestra para Tanque/BC/Computadora; se limpia al guardar si el equipo cambia y deja de ser Regulador.
13. **Item 23 — Foto de la orden en ventana emergente:** en vez de pestaña nueva del navegador.
14. **Item 24 — Más prominencia visual:** No. de orden, Estado, Cliente y Equipo se ven más grandes y en negrita en la ficha.
15. **Item 25 — Aviso "Atrasada" en Inicio:** una orden en "Pendiente por trabajar" con más de 5 días sin avanzar muestra un aviso rojo.
16. **Item 26 — Resumen de la orden arriba en "Editar orden":** tarjeta chica con No. de orden, cliente y equipo, debajo del subtítulo.
17. **Item 27 (BUG corregido) — Prueba Hidrostática no aparecía en órdenes de Tanque:** la detección comparaba el texto del servicio sin quitar tildes, y el nombre real en el Catálogo lleva tilde ("Prueba Hidrostática"), así que nunca hacía match. Se corrigió centralizando la comparación (ignora tildes y mayúsculas) en un solo lugar, en vez de repetirla en 3 sitios distintos.
18. **Item 28 — Categorías reducidas en "Formatear registros":** se quitaron "Piezas y repuestos" y "Servicios".
19. **Item 29 — "Prueba Hidrostática" bloqueada en el Catálogo de servicios:** no se puede renombrar ni desactivar — el resto de la app depende de que se llame exactamente así.
20. **Item 30 — Folio digital movido al final de la ficha:** de arriba de todo a una línea discreta al final, alineada a la derecha.
21. **Item 31 — "Historial" consolidado en "Más":** los dos botones separados de Administración (historial de órdenes e historial de equipos) se juntaron en un solo botón "Historial", con las mismas dos secciones que ya usa App Interno (Movimientos anulados y Ediciones). El link viejo queda como redirección automática.
22. **Item 3 — Mensajes de validación ocultos hasta hacer click:** en "Actualizar estado de orden", los mensajes "Aún no puedes X porque falta Y" pasaron de estar siempre visibles a un botón "?" que los revela solo si se toca. Esto ya estaba correctamente construido, cita textual: "pon que no salga el mensaje y que solo salga si le hacen click, asi la seccion se ve mas limpia" — había quedado marcado como pendiente por una confusión al re-preguntar, no por faltar nada.
23. **Item 5 — Reporte de Reguladores, formato confirmado sin cambios:** el usuario confirmó que le gustó solo lo VISUAL del "Reporte general" de App Interno (franja azul + logo), no su contenido ("obviamente no va acorde con lo de equipos clientes"). El Reporte de Reguladores se queda como está — una orden a la vez, Campo/Valor, con ese mismo estilo desde v34/v35. Sin cambios de código.

**Migraciones para correr (independientes entre sí, en cualquier orden, o juntas con el archivo combinado):** `migration_29.sql` (tipos_equipo) y `migration_30.sql` (datos_nuevos) — también entregado `migration_29_y_30_combinado.sql` con las dos juntas.

## ✅ Entregado en v34/v35 / V11 (26 sep 2026) — 16 pedidos: quitar "Status", editar/anular órdenes y compresores, Accesos a apps, Reportes rediseñados + envío por correo

**v35 reemplaza a v34** — mismo código, solo se le agregó el párrafo del changelog in-app que faltaba en v34 (se armó minutos después). Usar v35.

Ronda larga de feedback acumulada en modo dictado (mensajes seguidos, sin construir hasta la señal de arranque), interrumpida a mitad de camino por el propio usuario para pedir explícitamente trabajar directo en el código en vez de armar antes una maqueta visual ("olvidalo" / "trabaja en el codigo directo dale para alla"). 16 puntos:

1. **Notas opcionales por notificación al cliente** — ya estaba hecho de una sesión anterior que nunca llegó a entregarse (ver nota de control de versiones en `estado-proyecto.md`); se verificó que funciona bien y no se tocó.
2. **Sección "Administradores" en Administración de App Equipos de clientes:** subsección nueva, filtrada a quienes ya son Administrador (sin contar al Titular), con las mismas casillas de permisos de la tabla principal — mismo patrón que la sección de Administradores de App Interno (`app/admin/usuarios/lista-client.js`).
3. **Mensajes de validación en cadena, estandarizados:** en toda "Actualizar estado de orden", cada campo que depende de otro para poder llenarse ahora explica con el mismo formato "Aún no puedes X porque falta Y" (antes cada uno tenía su propia redacción). **Nota (v36): esta parte se retomó como item 3 de la ronda siguiente — pasaron de estar siempre visibles a un botón "?" que las muestra solo si se toca, para no llenar el formulario de texto.**
4. **Repuestos utilizados, ligado al catálogo de Piezas y repuestos:** pasó de ser solo texto libre a un selector con casillas de las piezas del catálogo + un campo "Otro" para lo que no esté ahí. **Nota (v36): esto se revirtió — ver item 4 de v36 arriba, el usuario prefirió volver a texto libre pero manejado como lista.**
5. **Reporte de Reguladores, mismo formato visual que App Interno:** se rediseñó para usar la misma tabla con franja azul marino y logo que ya usan los reportes de App Interno (antes era un grid de Campos suelto). Se centralizó la construcción de las filas del reporte (`lib/reportes-clientes.js`) para que la vista en pantalla, el PDF descargable y el que se manda por correo muestren exactamente lo mismo siempre. **Nota (v36): el usuario pidió revisar de nuevo el formato de este reporte (item 5 de la ronda siguiente) — queda pendiente de aclaración, ver esa sección arriba.**
6. **Atajos opcionales del menú con el mismo estilo que App Interno:** los accesos directos que cada usuario puede activar desde "Personalizar mi menú" ahora se ven con el mismo recuadro de línea punteada que ya usaba el menú de App Interno (antes se veían igual que los botones fijos, sin distinguirse).
7. **Editar/anular una orden ya registrada** (cliente, equipo, servicio, No. de orden) — hasta ahora solo se podía corregir el seguimiento (fechas, envíos, etc.), no los datos con los que se creó la orden. Nueva pantalla `/app-clientes/ordenes/[id]/editar-datos`, gateada a Titular/Administrador (mismo criterio que ya exigía la base de datos para borrar una orden). El botón usa el mismo componente de anular con motivo obligatorio que ya se usa en toda la app (`RegistroActions`), y al anular regresa al Listado de órdenes en vez de refrescar la ficha que ya no existe.
8. **Editar/anular un mantenimiento de compresor ya registrado** — mismo patrón exacto que el punto 7, aplicado a `mantenimientos_compresores`. Al anular regresa al historial de mantenimientos de ese compresor.
9. **Rediseño de "Selecciona tu espacio" (`/espacio`) + nueva pantalla "Accesos a apps":** se quitó la casilla de acceso a Equipos de clientes de la Administración de esa app (quedaba rara ahí, mezclada con los permisos internos de la app) y se creó una pantalla nueva y centralizada, `/espacio/accesos` (solo Titular, se llega desde la tuerquita de ajustes de `/espacio`), con dos casillas por usuario: App Equipos de clientes y App Interno. Como App Interno nunca había tenido un permiso propio (cualquiera con sesión podía entrar a `/dashboard`), se hizo un backfill en la migración para que todos los perfiles que ya existían quedaran con ese acceso encendido. **Nota (v36): esta pantalla ganó un resumen de conteos arriba de la tabla, ver item 9 de v36 arriba.**
10. **No. de orden visible en el Hub de Inicio:** las filas de órdenes en todas las secciones de Inicio ahora muestran el No. de orden del talonario físico (o el folio digital si esa orden no tiene uno), igual que ya se veía en Registro de Órdenes y Listado de órdenes.
11. **Atajo directo desde Registro de Órdenes:** cada fila del listado ahora tiene, además del link a la ficha, un botón de ícono aparte que lleva directo a "Actualizar estado de orden". **Nota (v36): ver items 11a/11b arriba — se corrigió la miga de pan y se cambió el ícono.**
12. **Notas del técnico sobre el regulador:** campo de texto libre y opcional, nuevo, debajo de la caja de Repuestos utilizados en "Actualizar estado de orden" — pedido explícito, "para que el buzo lo tenga pendiente". Visible en la ficha de la orden y en el Reporte.
13. **Se quitó "Status" por completo** (pedido explícito: "en cuanto al status, quita esa seccion. quiero probar si sin eso podemos trabajar"): "Reparación" pasó a detectarse sola según el servicio de la orden, exactamente igual a como ya funcionaba "Prueba hidrostática" desde el 23-sep. **Nota (v36): esta misma detección por nombre tenía un bug de tildes — corregido en el item 27 de v36 arriba.**
14. **Ficha de la orden:** "Registrado por" se movió de la grilla principal a una línea discreta abajo a la derecha; se agregó un acceso directo para ver, descargar o enviar por correo el Reporte de esa orden, cuando aplica (Reguladores). **Nota (v36): ese acceso directo se movió de nuevo, ver item 14 de v36 arriba.**
15. **"Enviar por correo" el Reporte de una orden** (Resend) — mismo mecanismo exacto que ya usa App Interno para sus reportes (`from` configurable por variable de entorno, PDF adjunto en base64). Botón nuevo en la ficha del Reporte que se expande a un campo de correo + botón Enviar.
16. **Repuestos utilizados obligatorio antes de cerrar la orden** — se revisó el comportamiento ya entregado en v32 (obligatorio para poder poner la fecha de entrega al cliente) y sigue funcionando bien; no hizo falta ningún cambio.

**Migraciones para correr, en este orden:** `migration_27.sql` (el fix de "Formatear registros" que nunca se entregó, ver más abajo) y luego `migration_28.sql` (agrega `notas_tecnico_regulador`, hace el backfill de `acceso_app_interno`, recrea `ordenes_equipos_con_nombre`).

**Quedó pendiente, no bloquea la entrega:**
- Feedback en vivo de v35, todavía no probada por el usuario. **Resuelto en v36 (ver arriba) — el feedback llegó y se construyó.**
- Confirmar que "Formatear registros" ya funciona una vez corrida `migration_27.sql`.
- Nombre definitivo de "Administración" (sigue provisional desde v26).
- Editar un cliente ya creado.
- Mostrar marca/modelo/serie del equipo en las filas de Registro/Listado de órdenes/Hub (mejora menor, no pedida).

## ⚠️ `migration_27.sql` y el zip "v33" — nunca entregados, encontrados el 26-sep-2026 al preparar v34/v35

Se encontró en el servidor un `gus-dive-app-v33.zip` (armado el 24-sep a las 22:09) que no coincide con ninguna entrega registrada en el chat. Se comparó su código contra v32 sin tocar nada: la única diferencia es el punto 1 de la lista de arriba (notas por notificación), ya incluido en v34/v35 sin pérdida de nada.

Pero se encontró algo más serio, aparte del zip: en esa misma sesión, 51 minutos después de armar ese zip, se escribió `migration_27.sql` — la corrección a un bug real que el usuario había reportado en producción sobre "Formatear registros" de App Equipos de clientes (el botón entregado en v30): `"No se pudo formatear: DELETE requires a WHERE clause"`. Causa: Supabase exige que todo DELETE tenga una cláusula WHERE incluso dentro de una función `security definer` como la de `formatear_registros_clientes()` (protección estándar contra borrar una tabla entera por accidente) — los DELETE sin condición de `migration_24.sql` chocaban con esa regla. El arreglo (agregar `where true` a cada DELETE, que sigue borrando la tabla completa igual que antes, solo con la sintaxis que exige Supabase) se escribió, pero **esa migración nunca se empaquetó en ningún zip ni se entregó por separado** — quedó como archivo suelto en el servidor. Se corrige de paso el mismo problema en `formatear_registros()` de App Interno (nunca se había usado en producción, pero tenía el mismo bug latente).

No se borró ni se sobreescribió nada de esto — se entregó junto con la tanda v34/v35, con la recomendación de correrla primero.

## ✅ Entregado en v32 / V11 (23-24 sep 2026) — Status unificado, Autorización del cliente, notificaciones en lista, validación en cadena, Repuestos obligatorio, Reportes

Tanda grande de pedidos en vivo, el mismo día que v30 y v31.

- **"Status" (unión de "Envío a" + "En espera"):** el check "En espera" se unió al selector "Envío a", que se renombró a "Status" con solo 2 opciones (En espera / Reparación; en blanco es Normal). "Prueba hidrostática" dejó de ser una opción manual de ese selector — pasó a detectarse sola según el servicio de la orden, con su propia "Fecha de envío a prueba hidrostática" (separada de la de Reparación, aunque las dos comparten "Fecha de retorno a tienda"). **Esto se revirtió por completo en v34/v35** (ver arriba) — el usuario probó "Status" en vivo y pidió quitarlo.
- **Autorización del cliente:** campo nuevo al registrar una orden — si el cliente autoriza cualquier cambio necesario en el equipo o solo lo indicado, con notas libres para el detalle (pensado para casos como "hay que cambiarle la manguera pero eso no fue lo pedido"). **Nota (v36): este campo pasó a verse solo para equipos Regulador — ver item 22 de v36 arriba.**
- **Notificaciones al cliente, como lista:** pasaron de una sola fecha a poder registrar varias, cada una con su fecha y medio (Llamada, WhatsApp, Correo, Otro).
- **Orden obligatorio de validación en "Actualizar estado de orden":** no se puede poner "Verificado por" sin "Fecha de listo para entrega" antes; no se puede notificar al cliente sin haber verificado; no se puede poner "Fecha de entrega al cliente" sin al menos una notificación; no se puede anotar quién recibe sin la fecha de entrega. "Verificado por" quedó restringido a Titular/Administrador.
- **Repuestos utilizados:** se movió a su propia caja destacada (formulario y ficha) y pasó a ser obligatorio para poder cerrar la orden (poner la fecha de entrega al cliente).
- **Reportes, nuevo en "Más":** por ahora solo para Reguladores — reporte de solo lectura por orden, armado con lo ya guardado en Seguimiento (no pide nada nuevo), con botón para imprimir o guardar como PDF. Como en App Interno, se puede activar un acceso directo a Reportes desde "Personalizar mi menú" (Mi Perfil).
- Ficha de la orden: la parte de arriba (cliente, equipo, fecha de ingreso) se hizo más compacta en pantallas anchas.
- Migración: `migration_26.sql`.
- **Ajuste posterior, 25-sep (quedó sin entregar, ver sección de arriba):** cada notificación al cliente ganó una nota corta opcional.

## ✅ Entregado en v31 / V11 (23 sep 2026) — Menú reordenado, No. de Serie en el buscador de equipo, Inspección visual realizada

Segunda ronda de ajustes el mismo día que v30, todavía en vivo.

- **Menú de App Equipos de clientes reorganizado:** "Registro" se renombró a "Registro de Órdenes"; "Listado de órdenes" se sacó del menú superior y se mudó a una tarjeta con ícono propio dentro de "Más" — el menú de arriba quedó en 4 botones fijos en cuanto a posición (Inicio, Registro de Órdenes, Listado de clientes, Más).
- **Buscador de "Equipo" con No. de Serie:** al registrar una orden, el selector de Equipo del cliente ahora muestra también el número de serie entre paréntesis, para distinguir dos equipos de la misma marca que antes se veían idénticos en la lista.
- **"Inspección visual realizada":** sección nueva en "Actualizar estado de orden", justo después de "Fecha de retorno a tienda", con la opción "Listo" — solo aparece cuando el servicio es Prueba hidrostática (esas pruebas incluyen una inspección visual).
- Migración: `migration_25.sql`.

## ✅ Entregado en v30 / V11 (23 sep 2026) — 2 bugs en vivo corregidos + editar Equipo + Rol + Formatear registros + renombrar la app

Arreglo de los 2 bugs reportados sobre v29, más la ronda de pedidos que había quedado en modo dictado.

- **Bug corregido — "Changelog" caía en la pantalla de App Interno:** `/changelog` ahora sabe desde qué app se abrió y muestra el header y el "← Volver" que corresponde.
- **Bug corregido — un click reordenaba el menú solo:** el drag & drop nativo del navegador (que se activaba con el más mínimo movimiento del mouse durante un click, muy común con trackpad) se reemplazó por un arrastre manual con un umbral mínimo de movimiento, en los dos menús (App Clientes y App Interno).
- **Editar un Equipo del cliente ya creado** (tipo, marca/fabricante, modelo, No. Serie) desde su propia ficha, con un permiso granular nuevo (`equipos_clientes_editar_equipo`) para dárselo a otros usuarios además del Titular. La edición queda anotada en una sección nueva y separada de Administración, "Historial de ediciones de Equipos" (aparte de la de órdenes). **Nota (v36): este historial se consolidó con el de órdenes en un solo botón "Historial" — ver item 31 de v36 arriba.**
- **Columna "Rol" en la tabla de Permisos de App Equipos de clientes** (Administrador/Usuario — el mismo `is_admin` de toda la cuenta, no uno aparte), igual que ya tenía App Interno. Rol y casillas de permisos quedan independientes entre sí, mismo criterio que App Interno.
- **"Formatear registros" para App Equipos de clientes**, en la Zona de peligro de Administración — a diferencia de App Interno, deja elegir exactamente qué borrar: Órdenes, Piezas y repuestos, Servicios, o Clientes y sus equipos (marcando Clientes se borran también sus Órdenes, por la relación entre las tablas — se explica en la confirmación). De paso, "Formatear registros" de App Interno también se volvió granular (Salidas y Llenados de tanque, cada uno opcional — antes siempre borraba los dos juntos). **Salió con un bug real** (`DELETE requires a WHERE clause`), corregido en `migration_27.sql` — ver la sección de arriba. **Nota (v36): las categorías "Piezas y repuestos" y "Servicios" se quitaron de esta pantalla — ver item 28 de v36 arriba.**
- **Renombrado "App Clientes" → "App Equipos de clientes"** en toda la app: tarjeta de `/espacio`, nombre en la barra superior, migas de pan (~30 archivos).
- **Notificaciones de `/espacio` completas:** la tarjeta ahora muestra también órdenes en espera, en prueba hidrostática y enviadas a reparación (antes solo pendientes por trabajar/despachar); el hub de Inicio de esa app dejó de repetir el nombre de la app como título.
- **No. de orden como número principal:** en los listados de órdenes, el No. de orden del talonario físico pasó a ser el número que se ve grande; el folio digital se sigue mostrando, pero chico y discreto. **Nota (v36): "#" se cambió por "No." en todas estas pantallas — ver item 10 de v36 arriba.**
- **"Base de datos" (Servicios y Piezas) ahora requiere permiso para verla**, no solo para agregar/editar — sin el permiso, la tarjeta ya ni aparece en "Más".
- Migración: `migration_24.sql`.

## 🔴 `migration_22.sql` falló en Supabase — usar `migration_23.sql` (23 sep 2026, resuelto)

El usuario corrió `migration_22.sql` (entregada con v29) en el SQL Editor de Supabase y falló con `ERROR: 42P16: cannot change name of view column "full_name" to "equipo_id"`. Causa: el paso que recreaba la vista `ordenes_equipos_con_nombre` usaba `create or replace view`, y Postgres no permite eso una vez que las columnas de la tabla de abajo crecieron desde que la vista se creó por primera vez. Como Supabase corre el script pegado como una sola transacción, el error deshizo TODA la migración.

Se entregó `migration_23.sql`: mismo contenido completo, con ese único paso arreglado (`drop view` + `create view`). Ya corrida por el usuario — resuelto. Este mismo gotcha de Postgres se repite en cada migración que toca esa vista (`migration_25.sql`, `migration_26.sql`, `migration_28.sql`).

## ✅ Entregado en v29 / V11 (23 sep 2026) — Tanda grande: Base de datos, navegación, permisos granulares, Mi Perfil completo, y 2 bugs en vivo corregidos

- **Bug — no dejaba crear equipo Tanque/Computadora:** faltaba la columna `serie` en la base de datos real; se volvió a agregar (idempotente) en `migration_22.sql`/`migration_23.sql`, y los formularios ahora muestran el error real si algo falla.
- **Bug — Seguimiento no se actualizaba en pantalla:** la vista `ordenes_equipos_con_nombre` no tomaba columnas nuevas de la tabla de abajo sin recrearse — corregido.
- **"Catálogo" → "Base de datos":** hub con dos secciones, Servicios y Piezas y repuestos (nuevo).
- **"Historial de órdenes" → "Listado de órdenes"** en menú y migas de pan.
- **Flechas de navegación** (‹ ›) entre las 5 pantallas principales, reemplazando "← Volver".
- **Menú reordenable con drag & drop** (columna propia, `profiles.orden_menu_clientes`).
- **Órdenes en espera:** check + motivo, con aviso rojo y sección propia en Inicio.
- **Fecha de última vez en tienda** por equipo, en "Equipos registrados".
- **Repuestos utilizados:** campo de texto libre (ligado al catálogo en v34/v35, y de vuelta a lista de texto libre en v36).
- **Rediseño del hub de Inicio:** secciones de hidrostática/reparación al final con contador y fecha correcta cada una; sin duplicar en "Pendientes por trabajar".
- **Envío a preseleccionado** según el servicio (Prueba hidrostática).
- **Changelog** en el menú de ajustes de App Clientes.
- **4 permisos granulares:** Registrar orden, Agregar equipo, Agregar cliente, Base de datos.
- **Mi Perfil completo:** nombre editable, Mi actividad, Apariencia, Personalizar mi menú.
- **Badge "Titular"** en vez de "Tú" en Permisos.
- Migración: `migration_22.sql`, reemplazada por `migration_23.sql` (ver sección arriba).

## ✅ Entregado en v28 / V11 (23 sep 2026) — Fecha de envío + avisos en Inicio, singular "Regulador"/"Tanque", "No. de orden" del talonario, y Catálogo de servicios

- **Fecha de envío** (columna nueva) cuando "Envío a" es hidrostática o reparación, con aviso en Inicio mientras la orden sigue afuera.
- **"Regulador"/"Tanque" en singular** en toda la UI de App Clientes (el valor guardado sigue en plural).
- **"No. de orden" del talonario físico:** primer campo de "Registrar orden", distinto del folio digital.
- **Botón "Más" + Catálogo de servicios** editable (luego ampliado a "Base de datos" en v29).
- Migraciones: `migration_19.sql`, `migration_20.sql`, `migration_21.sql`.

## ✅ Entregado en v27 / V11 (23 sep 2026) — Feedback en vivo de v26 (6 puntos) + pedidos sueltos

- Servicio a realizar como lista fija + Otro; "Actualizar seguimiento" (renombrado, luego otra vez a "Actualizar estado de orden" en v29) movido arriba de los campos.
- Fecha de retorno a tienda condicional a "Envío a".
- Bug corregido: la ficha no reflejaba lo recién guardado (caché de rutas).
- Tarjetas de la ficha unidas en una sola.
- "Pendientes por despachar" → "Órdenes pendientes por entregar".
- Bug corregido: ediciones del Titular no quedaban en el historial (RLS).
- Loading screen, orden en listados, No. de Serie en Equipo del cliente, Tanques simplificado a Fabricante + No. Serie, agregar varios equipos a un cliente ya existente.
- Migración: `migration_18.sql`.

## ✅ Entregado en v26 / V11 (23 sep 2026) — Equipo del cliente, seguimiento extendido con estado automático, y Administración

- **Equipo del cliente** (tabla `equipos_del_cliente`): historial completo por equipo, no solo por cliente.
- **Seguimiento extendido:** 8 campos opcionales (Envío a, fechas, verificado por, notificación, entrega, quien recibe, factura).
- **Estado automático**, ya no manual — se calcula solo según qué campos estén llenos.
- **Historial de ediciones, Titular-only**, dentro de la nueva **Administración de App Clientes**.
- Migración: `migration_17.sql`.

## ✅ Entregado en v25 / V11 (23 sep 2026) — Ajustes tras probar v24 en vivo

- "Registro" pasó de formulario directo a cola de trabajo con pestañas (Abiertas / Pendientes por trabajar / Pendientes por entregar).
- "Mi Perfil" de App Clientes se independizó de App Interno.
- Sin migración nueva.

## ✅ Entregado en v24 / V11 (23 sep 2026) — App Equipos de Clientes, primera versión real

Hub de órdenes con "Pendientes por trabajar"/"por despachar", Registrar orden (cliente, fecha, tipo de equipo, servicio, notas, foto), menú (Registro, Listado de clientes, Historial de órdenes), permiso `equipos_clientes`, Storage propio (bucket `equipos-clientes`). Migración: `migration_16.sql`.

## ✅ Entregado en v19-v23 / V11 (23 sep 2026) — Compresores completo y refinado

**v19:** catálogo de compresores con foto, ficha con horómetro/historial/registrar mantenimiento, campos condicionales por tipo de mantenimiento, Storage propio (`migration_14.sql`).
**v20:** botones reorganizados, aviso de inspección próxima a vencer (`migration_15.sql`).
**v21:** ficha tipo dashboard (última inspección/preventivo/correctivo), editar compresor, historial en acordeón (revertido en v22).
**v22:** historial de mantenimientos con ficha propia por registro (ya no acordeón), código escondido de la fila, breadcrumb más chico en toda la app.
**v23:** aviso de inspección rediseñado como una sola lista tipo dashboard ("Hacer inspección de...").

**Quedó pendiente, resuelto en v34/v35:** editar/anular un mantenimiento de compresor ya registrado.

## ✅ Entregado en v17-v18 / V10 (23 sep 2026)

Avisos de vencido con el link correcto, etiqueta "Selecciona tu espacio" más arriba, Administradores reales (no plantilla) en Administración, avisos de pendientes/próximos a vencer en las dos pantallas de Equipos.

## Sin cambios / explicados

**El correo sigue sin poder mandarse a cualquier destinatario libremente** hasta terminar la verificación de dominio en Resend (ver `estado-proyecto.md`) — no es un bug de código.

## Verificación del dominio en Resend (@gusdivecenter.com) — 🟢 EN PROCESO

Decisión final: se sigue con gusdivecenter.com. Falta confirmar con el hermano de Freedge si ya recibió/aplicó los registros DNS vía "Forward instructions". Detalle completo en `claude/estado-proyecto.md`.

## Buceos Gus — sin definir

Confirmado: integración en vivo con Google Sheets. Faltan: link/estructura del Sheet, campos del reporte por viaje, granularidad de confirmación de pago. No se ha empezado a construir. Ver detalle en `claude/estado-proyecto.md`.

---

## Fuera de alcance — parqueado, no se toca

- **El dominio propio (app.gusdivecenter.com) — DESCARTADO.** Freedge decidió explícitamente que no lo quiere.
- Bug del "Reporte instantáneo" con contenido incorrecto (versión vieja, columnas ya no usadas) — diagnóstico parcial hecho, ver `estado-proyecto.md`.
- Estado del sistema con datos reales (falta el Personal Access Token de Supabase).
- Botón "Solicitud" para pedir piezas a la tienda.
- Pantalla de inicio personalizable por usuario (Mi Perfil de App Interno).
- Modo oscuro automático después de las 8pm.
