# Gus Dive Center — estado del proyecto (app interna)

Última actualización: 26 de septiembre, 2026 — entregado **v36** / V11 (ronda larga de feedback sobre v35 probada en vivo: 31 puntos numerados por el usuario, juntados todos antes de tocar código, con la señal explícita "ok ya tenemos todo" para arrancar a construir). Corrige un bug real (Prueba Hidrostática no aparecía en órdenes de Tanque), filtra "Servicio a realizar" por tipo de equipo, agrega before/after a Historial, consolida los historiales en un solo botón, bloquea "Prueba Hidrostática" en el Catálogo, y más — ver el detalle completo abajo. **Los items 3 y 5 de esa ronda, que habían quedado pendientes de aclaración, ya se resolvieron sin necesitar ningún cambio de código** — ver el detalle en la propia sección de v36.

Versión anterior para contexto: **v35** (tanda muy grande de 16 pedidos sobre App Equipos de clientes: quitar "Status", auto-detección de Reparación, notas del técnico sobre el regulador, editar/anular órdenes y mantenimientos de compresor, nueva pantalla "Accesos a apps", Reportes de Reguladores rediseñados + envío por correo, y más). **v35 reemplazó a v34** (mismo código, se mandaron minutos aparte solo porque a v34 le faltó el texto del changelog actualizado — ver nota de control de versiones abajo).

## Qué es esto
App interna de Gus Dive Center (Next.js 14 + Supabase + Vercel, correo con Resend), rebautizada en el código/UI como **"Gus App"** desde V8 (el negocio sigue siendo "Gus Dive Center" — eso no cambió, solo el nombre del software). Código fuente completo en `/home/claude/gus-dive-app` dentro de la sesión de Claude (recreado desde el zip v35 que subió el usuario, tras perderse el contenedor anterior — ver nota abajo); el repo real es `lilfreedge/App-Gus-Dive-InTErno` (deploy vía GitHub Desktop, clonado en `~/Documents/GitHub/App-Gus-Dive-InTErno`, rama `main`).

## Flujo de trabajo estándar
1. Se construye directo en el código real → se verifica con `npm run build`.
2. Se empaqueta como `gus-dive-app-v{N}.zip` (excluyendo siempre `node_modules/`, `.next/`, `.git/` y `.env.local` — se verifica con `unzip -l` antes de entregar).
3. Si hay migración SQL nueva, se entrega aparte (el usuario la corre en Supabase > SQL Editor antes de actualizar el código en producción). Las migraciones son siempre hacia adelante — nunca se edita una ya entregada. Si hay más de una migración nueva en la misma entrega, también se manda un archivo combinado con las dos juntas.
4. Se actualiza este documento del Project.
5. Resumen en español, breve, en el chat, con listado de cambios uno por uno, numerados igual que los pidió el usuario.

**`.env.local` en el contenedor de Claude es un placeholder** (URLs/keys falsas) — no sirve para consultar la base de datos real. Las credenciales reales solo están en las variables de entorno de Vercel.

**⚠️ Nota sobre continuidad del contenedor de Claude:** el contenedor donde vive el código (`/home/claude/gus-dive-app`) es efímero — si la sesión de Claude se reinicia entre una conversación y otra, el código se pierde y hay que reconstruirlo desde el último zip entregado (`gus-dive-app-v{N}.zip`, el que el usuario tenga descargado). Pasó exactamente eso antes de armar v36: se le pidió al usuario el zip de v35 para poder seguir. **El usuario debe conservar siempre el zip de la última versión entregada**, por si hace falta reconstruir.

## Versión actual: V11 de la app (zip de entrega: v36, 26 sep 2026)

### Novedades de v36 (esta entrega, 26 sep 2026) — 31 pedidos de una ronda larga de feedback sobre v35

Numeración igual a la que usó el usuario en el chat (por eso hay saltos e items "a"/"b" — corresponden a mensajes de seguimiento sobre el mismo punto).

- **Item 3 — Mensajes de validación ocultos hasta hacer click:** en "Actualizar estado de orden", los mensajes de "Aún no puedes X porque falta Y" ya no se muestran siempre que el campo está deshabilitado — ahora hay un botón "?" junto al campo que los revela solo si se toca, para que la pantalla se vea más limpia. Esto ya estaba correctamente construido (cita textual del pedido: "pon que no salga el mensaje y que solo salga si le hacen click, asi la seccion se ve mas limpia") — quedó marcado como pendiente por una confusión en cómo se re-preguntó, no porque faltara nada.
- **Item 4 — Repuestos utilizados, de vuelta a texto libre pero como lista:** el selector de casillas del catálogo de Piezas y repuestos (de v34/v35) se reemplazó por el mismo patrón de "escribir y agregar a una lista" que ya usa Notificaciones al cliente — se escribe el nombre de la pieza/repuesto y se agrega, con botón para quitar. Lo que ya estaba guardado en órdenes viejas (texto separado por comas) se sigue leyendo y mostrando igual, sin perder nada.
- **Item 5 — Reporte de Reguladores, formato confirmado sin cambios:** el usuario mostró el "Reporte general" de App Interno (listado multi-fila por rango de fechas) diciendo "que bonito" — se confirmó que le gustó solo lo VISUAL (la franja azul con el logo), no el contenido de ese reporte en particular, que "obviamente no va acorde con lo de equipos clientes". El Reporte de Reguladores se queda como está: una orden a la vez, Campo/Valor, ya con ese mismo estilo visual desde v34/v35. Sin cambios de código.
- **Item 7 — Editar/anular una orden ya registrada:** se revisó y ya estaba correctamente gateado a Titular/Administrador desde v35 (mismo criterio que la base de datos exige para poder anular) — no hizo falta ningún cambio.
- **Item 9 — "Accesos a apps" con resumen de conteos:** arriba de la tabla de checks por usuario, dos tarjetas nuevas muestran cuántos usuarios (sin contar al Titular, que siempre tiene acceso) tienen marcado cada acceso, del total — por ejemplo "3 de 5" para Equipos de clientes y "5 de 5" para App Interno.
- **Item 10 — "#" → "No.":** en toda App Equipos de clientes (Hub de Inicio, Registro de Órdenes, ficha de la orden), donde se mostraba "#123" ahora dice "No. 123" — más claro para quien no está familiarizado con esa abreviatura. No se tocó ninguna pantalla de App Interno (esa app usa su propio "folio-tag", fuera del alcance de esta ronda).
- **Item 11a — Miga de pan correcta desde el atajo de Registro:** el atajo directo desde Registro de Órdenes a "Actualizar estado de orden" ahora lleva un `?from=registro` en el link, para que esa pantalla sepa mostrar "Registro de Órdenes" en la miga de pan (en vez de "Listado de órdenes", que es lo que muestra si se entra desde la ficha normal).
- **Item 11b — Ícono distinto para ese mismo atajo:** cambió de lápiz (el mismo que usa "Editar/anular la orden", que confundía) a un ícono de check, para diferenciarlo de un vistazo.
- **Item 14 — Acceso al Reporte movido en la ficha de la orden:** el link para ver/descargar/enviar el Reporte de la orden se movió de después de "Registrado por" (al final de la tarjeta) a justo antes de la sección "Seguimiento", más visible y natural en el flujo de lectura.
- **Item 17 — No. de orden auto-sugerido:** al registrar una nueva orden, el campo "No. de orden" ahora arranca con el número esperado (el último que se usó + 1), editable como siempre; si se cambia a otro número, aparece un aviso amarillo pidiendo verificar que sea el correcto.
- **Item 18 — Botón "+ Registrar orden" quitado de Inicio:** ya se registra desde Registro de Órdenes, que tiene su propio botón — el de Inicio quedaba redundante.
- **Item 20 — Before/after en Historial:** las ediciones que se muestran en Historial (dentro de "Más") ahora muestran, campo por campo, el valor de antes Y el de después, uno junto al otro — antes solo se veía "antes". Se agregó guardando el "después" además del "antes" al momento de editar (columna nueva, `cambios_historial.datos_nuevos`, ver migración abajo) — se aplicó solo a las 3 pantallas de edición de App Equipos de clientes que corresponden a este alcance (editar datos de la orden, editar equipo del cliente); el resto de historiales de la app (Catálogo, compresores, etc.) sigue igual, sin este campo.
- **Item 21 — "Servicio a realizar" filtrado por tipo de Equipo:** al registrar o editar una orden, el desplegable de servicio ya no muestra todos los servicios del catálogo siempre — solo los que aplican al tipo de Equipo ya elegido (Tanque, Regulador, BC o Computadora). Cada servicio del Catálogo ahora se marca con casillas para decir a qué tipo(s) de equipo aplica (columna nueva, `servicios_catalogo.tipos_equipo`, ver migración abajo, con un backfill automático para no dejar huérfano ningún servicio ya existente). Si el equipo aún no está elegido, el campo de servicio queda deshabilitado con el texto "Selecciona un equipo primero".
- **Item 22 — "Autorización del cliente" solo para Reguladores:** ese campo (al registrar o editar una orden) ahora solo aparece cuando el equipo elegido es un Regulador — para Tanque/BC/Computadora no se muestra, y si había algo guardado de una elección anterior, se limpia al guardar para no dejar datos huérfanos.
- **Item 23 — Foto de la orden en ventana emergente:** en vez de abrir en una pestaña nueva del navegador, la foto de la orden ahora se ve en una ventana emergente dentro de la misma pantalla (clic para abrir, clic afuera o en la X para cerrar) — mismo patrón visual que ya se usa en otras partes de la app.
- **Item 24 — Más prominencia visual a los datos clave de la ficha:** No. de orden, Estado, Cliente y Equipo se ven ahora con letra más grande y en negrita, para que resalten del resto de los campos.
- **Item 25 — Aviso "Atrasada" en Inicio:** una orden en "Pendiente por trabajar" que lleve más de 5 días sin que nadie le ponga la mano ahora muestra un aviso rojo, "Atrasada — lleva X días sin trabajar", en el Hub de Inicio.
- **Item 26 — Resumen de la orden arriba en "Editar orden":** se agregó una tarjeta chica (No. de orden, cliente, equipo) justo debajo del subtítulo, para saber en qué orden se está sin tener que volver a la ficha primero.
- **Item 27 (BUG corregido) — Prueba Hidrostática no aparecía en órdenes de Tanque:** el problema real era que la detección de "es una orden de Prueba Hidrostática" comparaba el texto del servicio sin quitarle los acentos, y el nombre real en el Catálogo (editable desde v29) lleva tilde ("Prueba Hidrostática") — así que la comparación nunca hacía match y los campos de fecha de esa prueba nunca aparecían. Se corrigió centralizando la comparación (ahora ignora tildes y mayúsculas) en un solo lugar, usado en los 3 sitios donde antes se repetía este chequeo por separado.
- **Item 28 — Categorías reducidas en "Formatear registros":** se quitaron "Piezas y repuestos" y "Servicios" de las opciones para borrar — ya no tenía sentido borrarlas por separado tras los rediseños de los items 4 y 21.
- **Item 29 — "Prueba Hidrostática" bloqueada en el Catálogo de servicios:** ese servicio en particular ya no se puede renombrar ni desactivar desde el Catálogo (el nombre queda deshabilitado y el botón "Desactivar" también, con una nota explicando por qué) — el resto de la app depende de que se siga llamando exactamente así para poder detectarlo.
- **Item 30 — Folio digital movido al final de la ficha:** "folio #X" se quitó de arriba de la ficha de la orden y se puso al final de todo, discreto y alineado a la derecha — el dato principal ahora es el No. de orden del talonario.
- **Item 31 — "Historial" consolidado en "Más":** los dos botones separados que había en Administración ("Historial de ediciones (órdenes)" y "Historial de ediciones de Equipos") se juntaron en un solo botón "Historial", movido a "Más" — con las mismas dos secciones que ya usa App Interno en su propio Historial: "Movimientos anulados" y "Ediciones". El link viejo (`administracion/historial-equipos`) se dejó como redirección automática a la pantalla nueva, para no romper nada que ya apunte ahí.

**Migraciones a correr con esta entrega (independientes entre sí, se pueden correr en cualquier orden, o juntas con el archivo combinado):**
- `migration_29.sql` — agrega `servicios_catalogo.tipos_equipo` (item 21) con backfill automático por nombre.
- `migration_30.sql` — agrega `cambios_historial.datos_nuevos` (item 20, before/after en Historial).
- `migration_29_y_30_combinado.sql` — las dos anteriores juntas en un solo archivo, por comodidad.

### Resumen de v30 a v35 (ver detalle punto por punto en `claude/backlog-proxima-actualizacion.md`)

v30 (2 bugs en vivo + editar Equipo + Rol + Formatear registros + renombrar la app), v31 (menú reordenado + No. de Serie en el buscador + Inspección visual realizada), v32 ("Status" unificado + Autorización del cliente + notificaciones en lista + validación en cadena), y v34/v35 (16 pedidos: Administradores en Administración, mensajes de validación estandarizados, Repuestos ligados al catálogo, Reportes rediseñados + envío por correo, editar/anular órdenes y compresores, Accesos a apps, quitar "Status", y más) ya están documentadas en detalle en el backlog. **`migration_27.sql`** (fix de "Formatear registros") y **`migration_28.sql`** (notas del técnico, Accesos a apps) debían correrse con v34/v35 — confirmar con el usuario si ya se corrieron, si no es lo más urgente de correr antes que `migration_29`/`migration_30`.

**Compresores, completo (v19-v23) y refinado — sin cambios de fondo desde entonces, ver `claude/backlog-proxima-actualizacion.md` para el detalle completo de cada versión.**

## `migration_22.sql` falló en Supabase — corregida en `migration_23.sql` (23 sep 2026, historial)

El usuario corrió `migration_22.sql` en el SQL Editor de Supabase y falló con:
```
ERROR: 42P16: cannot change name of view column "full_name" to "equipo_id"
HINT: Use ALTER VIEW ... RENAME COLUMN ... to change name of view column instead.
```
**Causa:** el paso que recreaba la vista `ordenes_equipos_con_nombre` usaba `create or replace view`, y Postgres no permite eso si las columnas de la tabla de abajo crecieron desde que la vista se creó por primera vez (y sí crecieron, con varias migraciones desde entonces). Como Supabase corre el script pegado como una sola transacción, el error deshizo TODA la migración.

**Solución entregada:** `migration_23.sql`, mismo contenido con ese paso arreglado (`drop view` + `create view`). Ya corrida por el usuario — resuelto. Este gotcha de Postgres (una vista con `select o.*` no ve columnas nuevas sin recrearse con `drop view` + `create view`) se repitió y se sigue aplicando en cada migración nueva que toca una vista (incluyendo `migration_25.sql`, `migration_26.sql` y `migration_28.sql`).

## Pedidos anotados para la próxima actualización

Activos ahora mismo, ninguno bloquea nada construido hasta ahora:
- **Correr `migration_27.sql`, `migration_28.sql`, `migration_29.sql` y `migration_30.sql`** — confirmar con el usuario cuáles ya corrió.
- **Verificación de dominio en Resend (@gusdivecenter.com)** — en proceso, ver sección propia abajo. Falta confirmar con el hermano del usuario si ya recibió/aplicó los registros DNS vía "Forward instructions".
- **Compresores — posible preocupación de pérdida de datos sin confirmar:** quedó pendiente de una sesión anterior aclarar si hay alguna diferencia entre la URL de Vercel usada en pruebas (preview) y la de producción que pudiera afectar dónde quedaron guardados algunos registros de Compresores. No confirmado todavía, no se ha tocado nada de código por esto.
- **Buceos Gus** — sin definir aún, ver sección propia abajo.
- Feedback en vivo de v36, una vez que el usuario la pruebe.

Ver `claude/backlog-proxima-actualizacion.md` para el detalle punto por punto de cada versión entregada.

## Verificación de dominio en Resend (@gusdivecenter.com) — 🟢 EN PROCESO

Freedge consideró brevemente conseguir un dominio nuevo en vez de gusdivecenter.com, para no depender de su hermano/Cloudflare. Se le explicó que no existe una opción gratis confiable (Freenom cerró en 2024) y que los dominios gratis dañan la entrega de correo (caen en spam). Con esa información, **decidió seguir con gusdivecenter.com** — dominio propio para la APP sigue descartado, esto es solo para el envío de correo.

Avance: dominio `gusdivecenter.com` ya agregado en resend.com/domains (estado "Not Started"). Se descartó "Auto configure" (pide credenciales de Cloudflare). El plan es usar **"Forward instructions"** (menú "..." del dominio en Resend) para que Resend le mande los registros DNS directo por correo al hermano de Freedge (quien administra Cloudflare), sin que Freedge tenga que tocar Cloudflare ni copiar nada a mano.

**Pendiente:** no se sabe con certeza si "Forward instructions" ya se usó / si el hermano ya recibió o aplicó los registros. Sin confirmación todavía en el chat.

Pasos que faltan:
1. Confirmar con el hermano si ya recibió los registros por "Forward instructions" (o mandárselos ahora si no se había hecho).
2. El hermano los agrega en Cloudflare, sin tocar el registro MX existente (el dominio ya recibe correo por otra vía).
3. Verificado en Resend → cambiar `REPORT_EMAIL_FROM` en Vercel a una dirección `@gusdivecenter.com`.

- Mockup de referencia (Design canvas, ya usado para construir el ítem 2 de V8): `https://claude.ai/artifact/1FmKf9d5KH4pvjuwWZEPcM`.

## Buceos Gus — sin definir aún

Viajes de buceo: reporte por viaje, confirmación de pago por cliente, integración en vivo con Google Sheets (confirmado, no manual/CSV) para traer los buzos. Preguntas de Claude aún sin responder: link/estructura de columnas del Sheet, campos del reporte por viaje, granularidad de confirmación de pago (check simple vs. monto+método). La app en producción también necesitará una configuración de Google Cloud service account, que solo Freedge puede hacer. No se ha empezado a construir.
