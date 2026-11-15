# Cómo trabajar en este proyecto (para Claude)

App interna de **Gus Dive Center**. El dueño es Pipe (Freedge). Next.js 14 (App Router) + Supabase + Vercel.
Producción: `app-gus-dive-in-t-erno.vercel.app`. Vercel publica solo cada vez que se sube a `main`.

## Reglas que no se rompen

1. **No borres ni descartes nada sin avisarle primero.** Esto incluye archivos, datos, versiones y columnas. Los cambios de datos se le dan como SQL para que él lo corra; tú nunca corres nada en su base.
2. **Muéstrale una maqueta antes de programar cualquier cambio de pantalla.**
   - Tiene que ser una maqueta que se pueda tocar (HTML con pestañas), no fotos.
   - Guárdala en `public/maquetas/maqueta-vXX.html`, en tu rama de trabajo. Así él la abre en el link de vista previa que hace Vercel: `/maquetas/maqueta-vXX.html`.
   - Programa solo lo que él aprobó.
3. **No programes lo que él dejó como pregunta.** Si dice "¿qué propones?", propones con una maqueta y esperas su respuesta.
4. **Escríbele siempre en español**, sencillo, de "tú", sin palabras técnicas.
5. **Responde numerado, con su misma numeración**, y di de qué trata cada punto. Separa en secciones distintas:
   - lo que se hizo,
   - la lista para verificar (numerada; sigue el número donde quedó la anterior),
   - las preguntas.
   No mezcles. Si no contestó algo, vuelve a preguntarlo.
6. **Commit y push solo cuando él diga "súbelo" o "súbela".** Trabaja en una rama y pídele permiso antes de pasarla a `main`.
7. **Changelog dentro de la app:** `app/changelog/changelog-client.js` lleva una entrada nueva por cada versión (V60, V61…), arriba de todas.
8. **SQL:**
   - Cada cambio va en `supabase/migration_XX.sql`. Tiene que poder correrse más de una vez (`if not exists`, `drop policy if exists`) y no puede borrar datos.
   - Cuando hay varias migraciones pendientes, júntalas también en un solo archivo `supabase/todo_vXX_una_sola_vez.sql`. Él lo pega en Supabase › SQL Editor.
   - Si el código usa una columna nueva, haz que siga funcionando aunque él todavía no haya corrido el SQL.
9. **Nada de emojis en la app.** Usa los íconos de `components/icons.js`.
10. **No copies en respuestas ni en archivos cédulas, celulares ni números de cuenta** que salgan en sus capturas.
11. **Nunca entres a cuentas ni escribas contraseñas o llaves.**
12. **Antes de entregar, corre el build:**
    ```
    NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx next build
    ```
13. **Alquiler:** solo lo que él apruebe (ya aprobó y se hizo "Vino con problemas"; los premios, 232, quedan para más adelante).

## Las apps (en `/espacio` se escoge una)

- **App Interno:** salidas, llenados, equipos, tanques, reguladores, compresores. Barra grafito.
- **App Equipos de clientes:** órdenes de taller. Barra navy.
- **Control Estudiantes** (`components/estudiantes/`): barra amarilla SNSI. Links públicos: `/estudiante` y `/me-interesa`.
- **Buceos** (`components/viajes/`): azul `#4EBAE8`. Link público: `/inscripcion/[slug]`.
- **Alquiler** (`components/alquiler/`): rojo GUS.

Control Estudiantes, Buceos y Alquiler salen "En construcción" en `/espacio` (`app/espacio/page.js`, `EN_CONSTRUCCION`). Él avisa cuando se quita la etiqueta de cada una.

Los estudiantes y los buzos son la misma base de personas: la tabla `viajes_buzos`.

## Estado (12-nov-2026)

- En GitHub está la **V77** (subida el 12-nov; commit 87a7ff3 en su Mac, carpeta `App-Gus-Dive-InTErno`). Lo próximo se arma con `git diff origin/main HEAD --name-status` en el working copy de Claude (ya no sirve comparar contra un commit viejo a mano: cada subida queda en un commit nuevo en su Mac, así que `origin/main` siempre es la referencia).
- **Cómo se sube (recordatorio para la próxima vez):** el working copy de Claude y el clon del Mac tienen historias de commits distintas (árboles de archivos iguales, hashes distintos) porque cada subida se arma como UN commit nuevo directo en el Mac, no como un push de los commits locales de Claude. Pasos: 1) en el working copy, `git diff origin/main HEAD --name-status` para ver qué cambió; 2) empacar esos archivos (tar) y pasarlos al clon del Mac con `device_commit_files`; 3) extraer encima (puede hacer falta `device_request_delete_permission` en esa carpeta, porque tar y git necesitan borrar/reemplazar archivos); 4) `git commit` ahí con `user.name="lilfreedge"` y `user.email="felipetorreira2@gmail.com"` (así quedan sus commits, no los de Claude); 5) `git push origin main` -- si falla por credenciales (este VM del Mac no tiene las suyas), avisarle para que le dé push él mismo desde su Terminal.
- SQL: ninguno pendiente de correr (las V68 a V77 no necesitaron SQL nuevo). Lo último con SQL fue `supabase/todo_v67_una_sola_vez.sql` (migraciones 91 a 94).

## V68 (10-nov, subido)

- Lo próximo se sube con `git diff --name-only a579d56 HEAD`. La V68 no tiene SQL.
- Respuestas a la lista 29–70: "Asumamos que está bien". 42 ok · 43 ok · 47 explicado.
- Respuestas a la maqueta V68 (HECHO salvo lo marcado):
  - 9: pendiente para más adelante (premios del Alquiler).
  - 13 B: cédula que no pasa el dígito verificador no deja seguir, solo si la persona NO está en la base (`cedulaValida` en lib/viajes/modelo.js; en las APIs de estudiantes, interesado y viajes).
  - 14: solo Buceos. `linkGrupo` en los datos del buceo (Info › Grupo de WhatsApp), botón "Entrar al grupo de WhatsApp" en la pantalla final, en "ya estás inscrito" y en Mi perfil; el comprobante sigue igual. Control Estudiantes tendrá un link de pago más adelante.
  - 15: correo de lista de espera (estudiantes y buzos), `lib/correo-lista-espera.js`; en la ficha `etapas.correo_espera`; en Buceos, bitácora.
  - 16: textos de Documentos cambiados. PREGUNTA: los botones (A o B) no los contestó; el texto de la cédula ya dice "Una foto o un escaneo donde se lea bien (JPG, PNG, PDF o HEIC)" y ya acepta PDF; se le propuso otro texto.
  - 17 A: Cursos sin "Por etapa"; `PorEtapa` se abre desde los cuadros de Inicio (`cursos:<etapa>`).
  - 18: él quiere la B (Google Cloud). Se le explicó; falta que confirme y haga los pasos.
  - 19 A: celular al lado del nombre en la ficha.
  - 20: ya tienen un formato de correo; se le dijo cómo mandarlo.
  - 26 A: borrar compresor solo sin historial (`app/equipos/compresores/[id]/borrar-client.js`).
  - 27 "ok": se quitaron los grupos 2 y 3 (17 frases debajo del título; la explicación de cada permiso de App Interno queda como title). Se dejaron 4: bitácora de la orden y movimientos (son datos), Códigos a cobrar (él pidió dejarla) .
  - 72: Recordatorios solo en Más (migas: Más › Recordatorios).
  - 10: él da los precios. 11 ok (maqueta aparte). 12 explicado. 21 ok. 22: ¿para qué app? (se le preguntó). 23/24: dio permiso para leer su Drive: se encontró "Control Estudiantes" (de Gugi) y unos 20 sheets "Viaje … (Responses)". 25: sí lo pidió (23-oct). 28 ok.
- 10-nov, segunda vuelta: 83 "no entiendo, tengo que ver" → maqueta V69 (`public/maquetas/maqueta-v69.html`, pestaña 1 interactiva: Hoy / A / B). 84 HECHO: "Una foto o un escaneo donde se lea bien" (sin los formatos; sigue aceptando PDF). 85 "dime de la otra opción" → maqueta V69 pestaña 2 compara A (link, Google refresca cada horas hasta un día) y B (Google Cloud, al momento). 86 "ni yo recuerdo, busca": no se encontró dónde lo pidió (aparece por primera vez en la lista del 8-nov); se le preguntó si se queda o se quita. 87: ManyChat para después; por ahora correos.
- 10-nov, tercera vuelta: 83 A HECHO (un botón que cambia: "Lo hago después" / "Terminar"; sin "Puedes subirlos cuando quieras…"; con una subida dice "Te falta una; la puedes subir después."). 83 CERRADO: la frase "Si ahora no puedes, lo haces después entrando otra vez con tu cédula." se queda como está, no se toca. 85: escogió la B (Google Cloud, al momento) — **queda para la próxima actualización** (maqueta de los pasos para que él prepare Google Cloud). 20 (formato del correo de bienvenida): **queda para la próxima actualización.**
- **86, procedimiento de reguladores: se queda en la lista. Él pidió: "al momento que te comente algo relacionado tú me avisas a ver si me acuerdo". Cuando hable de reguladores, mantenimiento, informe del técnico o listas de pasos, recuérdaselo.**
- ManyChat: se le explicó (precios por contactos + Meta cobra por mensaje de plantilla; hay que confirmar coexistencia con el WhatsApp Business del celular).

## V69 (11-nov, subido)

- 89 logo nuevo de Alquiler (`public/logo-gus-alquiler.png`, solo en ese app) · 90 loading screen (App Interno/Equipos) también en Control Estudiantes, Buceos y Alquiler, con su color.
- Explicado sin cambio de código: 77 (correo de lista de espera), 79 ("no lo veo" — probable que mirara antes de que Vercel terminara de desplegar la V68, revisado el código y está bien), 88 (botón que cambia en Documentos), perfil del estudiante (ya existe en "Mis documentos": celular, correo, dirección, contacto de emergencia).
- Pendiente de investigar: 75, dice que un buceo reabierto aparece "lleno" en el link — falta el nombre del buceo de prueba para revisarlo (ver detalle en `claude/lista-nueva.md`).
- Preguntas con propuesta pendiente de maqueta: 91 (formulario de recordatorio más sencillo + "anuncio fijo"), 92 (que "Para hacer esta semana" diga de qué es cada recordatorio), 93 (texto del botón "Registrarme en un curso").

## V70 (11-nov, subido)

- Segunda tanda del 11-nov: 11 fotos de App Equipos de clientes (técnico, ficha de la orden, recibo) y una pregunta sobre estadísticas de compresores. Detalle completo (qué se hizo, qué quedó diagnosticado y las preguntas) en `claude/lista-nueva.md`, sección "Tanda del 11-nov, segunda".
- HECHO: 94 (técnico: solo puede quitar los códigos que puso él mismo, queda quién los puso), 95 (código en negrita, descripción no, en esa misma lista), 96 (recibo del cliente sin el folio abajo a la derecha), 97 (recibo del cliente sin "Descargar PDF" ni "Ver recibo completo").
- Maqueta `public/maquetas/maqueta-v70.html` (dos pestañas, sin programar todavía): resumir la parte de arriba de la orden del técnico + dónde va su nota sobre el regulador + "Mantenimiento" más destacado + ícono del informe junto al equipo (98-102), y el botón "Ver holds" con ventana (103) — este último también le da al técnico lo que antes no veía de los Holds.
- 104 CERRADO: confirmado con la orden 02199 (Tomás Checo) — son Holds de un formato viejo (antes de que se guardara la pregunta como texto); tienen la decisión y el comentario guardados y sí se ven en pantalla, solo con la etiqueta genérica "Consulta al cliente" en vez de la pregunta real (que nunca se guardó como texto en esos Holds viejos). No es un error, y no debería pasar con Holds nuevos (ya guardan la pregunta como texto, `consultas`).
- 105 CERRADO: se queda como está por ahora, no pidió ningún número nuevo de frecuencia para las estadísticas de compresores.
- 106 HECHO: aviso por correo de cuenta nueva a felipe@gusdivecenter.com, para que él la apruebe (`/api/avisos/nueva-cuenta`, `lib/correo-nueva-cuenta.js`, `migration_95.sql`; destinatarios editables en Administración › Correos automáticos).
- 107 HECHO (Equipos de clientes y App Interno; Control Estudiantes y Buceos para después): acceso "solo ver" — columna nueva en Accesos a apps (`profiles.permisos.solo_ver`, `migration_96.sql`). Se resolvió con un solo cambio central: `lib/roles.js` → `tieneAcceso()` apaga la lista `ACCIONES_BLOQUEADAS_SOLO_VER` (crear/editar/borrar/registrar/actualizar estado/etc. de esas 2 apps) cuando el permiso está prendido, sin tocar el acceso de entrar a la app ni los permisos de solo ver una sección — como casi todos los botones de ambas apps (incluido el menú del técnico) ya dependen de `tieneAcceso()`, quedan cubiertos sin tocarlos uno por uno. Dos pantallas (Solicitudes al almacén, Informe de mantenimiento) se ocultan enteras para esta persona porque su único permiso mezcla ver+hacer — pendiente de afinar si hace falta. Puede que algún botón suelto que no dependa de ningún permiso granular se haya quedado sin bloquear; avisarle si encuentra uno.

## V71 a V73 (11-nov, subido)

- Subidas en otra sesión; no quedó esta nota al día con el detalle. Ver `git log` en GitHub para lo que trae cada una (Holds resueltos con la respuesta, ficha de la orden reordenada, "Sin asignar" clickeable, técnico más sutil).

## V74 a V76 (12-nov, subido -- commit b091ebc)

- "Me interesa": título "Registro de interesado", mensaje final ya no promete info inmediata (ahora dice que se contacta cuando haya curso), pregunta "¿Cómo te enteraste?" y esa fuente se guarda de verdad.
- Interesados se movió en el menú, entre Inicio y Cursos.
- Celular: un dígito de más ya no cambia de país solo (se recorta a 10 dígitos mientras el país sea RD/EE.UU.).
- Interesados: "Compartir link" ahora dice "Compartir link de interesados" con su propio mensaje de WhatsApp.
- Interesados → Seguimiento rediseñado (maquetas V75/V76, propuesta D aprobada): selección rápida en una sola fila (qué pasó + comentario + Guardar); "Editar datos" arriba, discreto; Inscribir y WhatsApp más grandes y en ese orden; se quitó la fecha para recordar del formulario rápido; ya no sale "Nuevo, nadie le ha escrito" sin seguimiento. Encabezado de Interesados igual que el de Cursos abiertos.
- Inscribir (maqueta V77 aprobada): si la persona ya está en Buzos (por su celular) se usan sus datos, sin pedir la cédula de nuevo; antes de guardar, confirma sus datos (lo que falta en rojo) con botón de WhatsApp.
- `/estudiante` se puede instalar como su propia app (manifest aparte de la de personal).
- Link de cursos (maqueta V78 aprobada): reconoce a un interesado por su celular si no lo encuentra por cédula; le rellena el nombre y, al registrarse, el interesado queda resuelto.
- Control Estudiantes: se quitó el botón de Administración de "Más" (ya estaba en Settings).
- Sin SQL nuevo.

## V77 (12-nov, subido -- commit 87a7ff3)

- Control Estudiantes: "Lista de espera" de Cursos pasa a "Interesados" (junta a los interesados por curso); "Base de datos" pasa a "Catálogo de cursos"; "Me interesa" con saludo simple, sin botón de WhatsApp al final y lista nueva de "¿Cómo te enteraste de nosotros?" (`FUENTES`).
- Catálogo de cursos: paso nuevo "Caleta Nocturno" (`caletaNocturna`), precio con comas y "Precio con ITBIS incluidos (RD$)", pasos en dos grupos, y el itinerario ya no se escribe a mano: sale de los pasos (`semanaDePasos` en Cursos.js: Lun/Mar/Mié Teoría 1/2/3, Jue Examen, Vie Piscina, Sáb Caleta 1, Dom Caleta 2). Caleta Nocturno: martes de la semana siguiente (V81).
- Interesados: chips por curso en vez del filtro por estado (maqueta V74); en la ficha, Inscribir más grande, WhatsApp más chico y "Enviar link de curso a estudiante" (WhatsApp, lo anota en el seguimiento como `link_curso`). El chip "Ya es buzo de Gus" quedó como "Ya lo teníamos registrado".
- App Equipos de clientes: "Inspección visual realizada" es su propio paso después de "Fecha de retorno a tienda" (form-client.js; sin ella no se puede poner "listo" en una hidrostática); en Inicio, badge rojo "Le hace falta inspección visual" y los días se cuentan desde el retorno (`diasDesdeCampo="fecha_retorno_tienda"`).

## V78 (12-nov, commit 2ad795e armado en su Mac; confirmar con `git fetch` que él le dio push)

- "Me interesa": el correo es obligatorio (solo se puede dejar en blanco si ya teníamos el de esa persona: la acción "doc" devuelve `conCorreo`); la pantalla final dice que le llegará un correo con el link para inscribirse.
- Ficha del interesado: "Enviar link de curso por correo" (pide confirmar; `lib/correo-interesado-curso.js`, `/api/estudiantes/interesado/correo-curso`, que recibe solo el id y arma el link con la primera fecha próxima con cupo). Lo manda una persona con el botón; NO sale solo al crear una fecha. No se pudo probar el envío real desde aquí (no hay llave de Resend): él lo iba a probar.
- El correo del interesado se ve en la ficha y se edita en "Editar datos" / al agregar a mano (`interesadoAFila` ya guarda `correo`).
- Se quitó el chip "Ya lo teníamos registrado" (él: "¿en qué me aporta?" → "sí, quítalo"). `buzoId` se sigue guardando.
- Changelog del app al día (V69 a V78).
- Maqueta V79 contestada (13-nov): 1 B y "quitemos lista de espera"; 2 A (formato sencillo, el de hoy, sin cambios); 3 A. Foto 7: "no recuerdo, olvídalo" (cerrado).

## V79 (13-nov, sin subir hasta que él diga)

- Página del curso: la pestaña "Lista de espera" pasa a "Interesados" (`DetalleCurso` en Inicio.js): arriba los estudiantes en espera (con "Pasarlo a este curso"), debajo `components/estudiantes/InteresadosCurso.js` (los interesados de ese curso por nombre, sin inscrito/no) con "Avisarles por correo" → lista con marcas → `/api/estudiantes/interesado/correo-curso` con `{ ids, fechaId }` (un solo `resend.batch.send`, hasta 100; el servidor anota `link_curso` con `fechaId` en el seguimiento de cada uno, estado "va", y la bitácora). No se le manda dos veces la misma fecha a nadie; sin correo → WhatsApp. El contador de la tarjeta dice "interesados".
- Al crear un curso con interesados (Lista → FormCurso `alCrear`), sale "Curso creado… ¿Les avisas ahora?" → `curso:<id>:avisar` (rutas de 3 pedazos en rutaDeUrl/urlDeRuta).
- "Abrió el link" (3 A): todo link a un interesado lleva `?i=<id>` (`linkCursoPara` en Interesados.js y `linkDe` en el API). /estudiante lo manda desde el navegador (`accion: "abrio"` en /api/estudiantes/publico, prop `marcaInteresado`) y se anota `abrio_link` en `seguimiento` (una vez por envío). Chip azul "Abrió el link" (`abrioLink`) en Interesados y en la pestaña del curso. `guardarInteresado` trae antes los `abrio_link` de la base para no pisarlos. Sin SQL.
- App Equipos de clientes, Inicio: badge azul "Le hace falta llenado" (`falta_llenado`: hidrostática con retorno y con inspección visual, todavía sin fecha de listo).
- iPhone: `/estudiante` con `appleWebApp` + apple-touch-icon.
- Changelog: V79.
- **Maqueta V80 (`public/maquetas/maqueta-v80.html`), sin programar:** tarjeta "Ten tus cursos en tu celular" al final del registro y en "Mis documentos" (Android: botón Instalar; iPhone: 3 pasos). Él lo recordó: "la vaina flow app que la gente lo pueda tener en su cel". Preguntas: 1) ¿así, en esos dos lugares? 2) ¿también Buceos (perfil del buzo) y "Me interesa"?
- Sigue abierto: link general de registro de cursos (propuesta, sin ejecutar); Caleta Nocturno en el itinerario.

## V80 (14-nov, sin subir; su Mac tiene V78 2ad795e y V79 0ff3723 sin push)

- Él contestó la maqueta V80: sí, pero sin la frase "Instala 'Mis Cursos' y entra con un toque…", con otro título (no dijo cuál) y que en iPhone se vea igual que en Android; sí también para Buceos y para el link de interesados ("'Me interesa' realmente se llama 'interesados'"). Preguntó si es una app en la pantalla de inicio (sí).
- Sus notas de Apple Notes ("App Gus interno", sección "Notas 13-11-2026", 9 fotos) — HECHO directo: link de interesados sin cédula (una pantalla: nombre, celular, correo, curso, cómo se enteró; el API ya no busca persona ni guarda documento; dedup por celular); mensaje final "Quedaste anotado para X. Te contactaremos cuando tengamos un curso disponible."; "Agregar interesado" sin "Escribirle de nuevo el"; "Próximo seguimiento" (fecha) en la fila rápida del seguimiento → `recordar`; calendarios de Estudiantes y Buceos empiezan el lunes; Crear curso sin "(siempre lunes)" y con "lunes 16 nov 2026"; "Me interesa" → "link de interesados" en textos. Changelog V80.
- **Maqueta V81 (`public/maquetas/maqueta-v81.html`), sin programar:** 1) tarjeta para instalar (sin frase, mismo aspecto en iPhone; en iPhone "Instalar" abre los 3 pasos), 4 títulos para escoger; sale en Mis Cursos (final y Mis documentos), al final del link de interesados (instala Mis Cursos) y "Mis Buceos" (app aparte azul que abre con próximos buceos + Mi perfil); 2) Inscribir / "Enviar link de curso": primero escoger una fecha abierta (las del curso que le interesa primero, luego otras), después WhatsApp o correo (reemplaza los dos botones); sin curso: "No hay ningún curso abierto de X" + Crear curso; 3) calendario para la fecha del curso (solo lunes, en verde los que ya tienen ese curso); 4) "Inscribir" en Cursos › Interesados (él lo dejó tentativo).
- Notas que NO son del app (no tocar): lo demás de la nota (DEMA, tanquera, pedidos, etc.) son pendientes de la tienda.

- 14-nov, respuestas a la V81: 3 ok, 4 ok ("el calendario me gusta"), 5 ok → HECHO (V80 parte 2): `ElegirCurso` en Interesados.js (escoger fecha abierta antes de Inscribir → `nuevo:<interesado>:<fecha>`, o antes de mandar el link → WhatsApp o correo, el API single acepta `fechaId`; sin cursos: "No hay ningún curso abierto de X" + Crear curso); botón "Inscribir" en Cursos › Interesados (nombre → `interesados:<id>` abre la ficha); `CalendarioLunes` en FormCurso (Inicio.js). 2 (Mis Buceos) sin contestar: él dijo "debería ser un mismo app, no diferentes para interesados, buceos, etc". 1: "Instala El app Gus" o dame opciones; preguntó si se abre en el browser o tiene plataforma propia (se le explicó: se instala desde el navegador una vez y abre como app propia; mismo app/código, sin App Store).
- **Maqueta V82 (`public/maquetas/maqueta-v82.html`), sin programar:** una sola app para clientes. 1) nombre: Gus Dive / Gus / Mi Gus / Gus Dive Center (tarjeta "Instala el app de …"); 2) pantalla al abrirla: sin entrar, próximos cursos y buceos con "Inscribirme" + "Entrar con mi cédula" + "Avísanos que te interesa"; ya adentro (cédula + celular): Mis cursos / Mis buceos / Mi perfil. Técnico: hoy el manifest de /estudiante tiene scope /estudiante; la app única necesitaría una página nueva de inicio (p. ej. /gus) y un manifest con scope que cubra /estudiante, /me-interesa e /inscripcion (scope "/" con `id` propio, distinto del de personal).

## V81 (14-nov, sin subir) -- App Gus

- Respuestas a la V82: "1. app gus"; "2. ok" + "¿hay manera de que la gente ponga su cédula una vez y quede guardado para siempre? y que arriba diga 'hola fulano'".
- HECHO: `/gus` (app/gus/page.js + components/AppGus.js): sin entrar, próximos cursos (fechasProximas, cursos con en_link) y buceos (`web=true`, abiertos) + "Entrar con mi cédula" + link a /me-interesa; ya adentro: "Hola, X", Mis cursos (api/estudiantes/publico "estado"), Mis buceos y Mi perfil (`/api/app-gus`, copia del "perfil" de Buceos sin slug), Salir.
- "Queda guardado": `lib/app-gus.js` guarda en localStorage del celular {tipoDoc, doc, cel, primer} (clave `app-gus-persona`) solo después de que el servidor confirmó cédula + celular (App Gus, "Mis documentos" y registro en /estudiante, "Mi perfil" en Buceos). /estudiante y el link de Buceos lo usan para llenar la cédula y el celular; `/estudiante?mis=1` entra solo a Mis documentos. Si lo guardado ya no sirve, se olvida.
- Manifest `app/app-gus.webmanifest/route.js` (name "App Gus", id/start_url "/gus", scope "/", theme navy); lo enlazan /gus, /estudiante, /me-interesa e /inscripcion/[slug]. El viejo /estudiante-manifest.webmanifest se dejó (sin uso). Middleware: /gus y /app-gus.webmanifest públicos.
- `components/InstalarApp.js`: tarjeta "Instala App Gus" (Android: beforeinstallprompt; iPhone: hoja con 3 pasos; no sale si ya está instalada, si tocó "Ahora no" o en computadora). Sale en /gus, final y Mis documentos de /estudiante, final de /me-interesa, final y Mi perfil de Buceos.
- Probado en pantalla con datos de prueba (iPhone emulado): entrar, pestañas, volver a abrir y saluda solo, hoja de iPhone. No se probó con la base real.
- Mismo ícono que la app del personal ("Gus Dive"); si molesta tener dos iguales, hacer uno distinto.
- Caleta Nocturno en el itinerario: él dijo "normalmente lo hacemos un martes, el martes de la semana siguiente cuando empieza" → `DIA_PASO` en Cursos.js con 9 lugares (8 vacío, 9 = caletaNocturna) y `semanaDe` usa `i % 7`. El itinerario se guarda al darle Guardar al curso: Open Water hay que abrirlo y guardarlo una vez.

## V82 (15-nov, sin subir)

- Con foto del Inicio de App Equipos de clientes en su iPhone ("se ve apretado, algunos nombres no se leen bien... asegúrate de que se vea todo bien en el celular"): `ListaOrdenes` pasó a `app/app-clientes/lista-ordenes.js` (mismo código) y la fila usa `.orden-fila` (grid): computadora igual que antes; celular (<=640px) nombre + fecha arriba y las notas en su propia línea. La causa: título con `minWidth: 0` y notas con `flexShrink: 0` dejaban el título tan angosto que las palabras se montaban encima de las notas. Registro de Órdenes: en el celular el estado baja debajo del nombre (`.reg-sello-movil` / `.reg-sello-compu`), buscador y "Ordenar" uno debajo del otro (<=420px). Historial: filtros con `minmax(0, 1fr)` (las fechas se salían de la tarjeta). Probado con datos de prueba en iPhone SE, iPhone 13 y Pixel 7 sin scroll de lado; computadora sin cambios.
- Él preguntó si ya estaba la nota azul "Le hace falta llenado": sí, desde la V79 (todavía sin subir; en producción está la V77).
- Ícono de App Gus: él vio el de ahora (igual al de la app del personal) y dijo "déjalo igual, por ahora".

## Pendiente

**V63 a V67: SUBIDAS el 10-nov.** SQL: `supabase/todo_v67_una_sola_vez.sql` (migration_91, 92, 93 y 94; probado dos veces). Detalle en los docs del proyecto `claude/v64-pedidos.md`, `claude/v65-pedidos.md` y `claude/v66-pedidos.md`.
- V63: 230 Recordatorios para técnicos, 162 "Mis documentos".
- V64: perfil del buzo en el link de Buceos (275, 276, 278 A, 279, 281), cambiar el celular en Mis documentos, 282 No. de factura, 283 curso borrado, 285 cursos nuevos (SQL), 288 sin firma en el registro, 290, 291.
- V65: 284 celular con país y "Celular (WhatsApp)", 286 cursos por grupos con la "i", Agregar Nitrox / OXY y precios (SQL), 287 C, 292 Seguimiento de contacto. 302 A: se queda "Agregar Nitrox".
- V67: lista nueva desde el 1; 1 A dirección principal en los links, 2 B "Pendiente procesar", 3 seis permisos nuevos por sección, 4 Estadísticas con secciones cerradas, 5 lista 16–40 cerrada.
- V66: 303 B pantalla final de la lista de espera sencilla y grande, 312 A ("Adelantar mis documentos" como botón y WhatsApp chiquito), 313 link de cada curso (`/estudiante?curso=<fecha>`, sin escoger curso). 304 ok: Buceos se queda como está (se entra al perfil desde el link de cada buceo; no hay link fijo "Mi perfil").

**Lista nueva (10-nov):** él pidió "junta todo lo pendiente y usemos una secuencia nueva empezando desde el 1". Todo lo pendiente está renumerado en el doc del proyecto `claude/lista-nueva.md` y en `public/maquetas/maqueta-v67.html` (pestaña "Lista nueva"). Los números viejos ya no se usan; cada punto dice qué número tenía antes.
- **A (1–5), contestadas el 10-nov y HECHAS (V67):** 1 A links siempre con la dirección principal (`lib/direccion.js`: `urlPrincipal` en el navegador y `origenDe(request)` en el servidor; variable opcional NEXT_PUBLIC_DIRECCION_PRINCIPAL; los redirects de login quedan con la dirección por donde entró) · 2 B "Pendiente procesar" · 3 sí, los 6 permisos nuevos en orden por sección (`PERMISOS_EST` con `defecto`, `valorPermisoEst`; se esconden en pantalla; Borrar estudiantes necesita migration_94) · 4 Estadísticas con las secciones cerradas (`components/estudiantes/Estadisticas.js`; el pago al instructor no tiene monto en el app, así que dice a cuántos estudiantes falta pagarle) · 5 ok, la lista 16–40 se cerró.
- **B. Le toca a él (6–8):** 6 dirección nueva app.gusdivecenter.com · 7 correos en spam (antes 236; contesta después de ver la actualización) · 8 récord de entrenamiento, también el virtual (antes 288; para el miércoles 11-nov).
- **C. Para más adelante (9–28):** ver el doc.
- **D. Lista para verificar después de subir (29–70):** V61 a V67 por tema (la 217–228 vieja quedó dentro, rehecha por tema). 67–70 son de la V67. Se le da completa con la subida.
- Ya hecho, fuera de la lista: 126 teléfonos de otros países (V65).
- La línea de "Todo lo demás queda anotado como pendiente: la dirección nueva, la pregunta 95…" ya no se usa: esos puntos ahora son la A y la B.

**Spam (punto 7), detalle:** se cambió el correo de avisos de Buceos a un documento HTML completo. Si sigue cayendo en spam, pídele los encabezados completos de un correo ("Ver original") y que agregue tienda@gusdivecenter.com a los remitentes seguros. El cambio a `app.gusdivecenter.com` también ayuda, porque los links dejan de ser `vercel.app`.
