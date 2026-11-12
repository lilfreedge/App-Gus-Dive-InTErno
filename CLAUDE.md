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

- En GitHub está la **V74 a V76** (subida el 12-nov; commit b091ebc en su Mac, carpeta `App-Gus-Dive-InTErno`). Lo próximo se arma con `git diff origin/main HEAD --name-status` en el working copy de Claude (ya no sirve comparar contra un commit viejo a mano: cada subida queda en un commit nuevo en su Mac, así que `origin/main` siempre es la referencia).
- **Cómo se sube (recordatorio para la próxima vez):** el working copy de Claude y el clon del Mac tienen historias de commits distintas (árboles de archivos iguales, hashes distintos) porque cada subida se arma como UN commit nuevo directo en el Mac, no como un push de los commits locales de Claude. Pasos: 1) en el working copy, `git diff origin/main HEAD --name-status` para ver qué cambió; 2) empacar esos archivos (tar) y pasarlos al clon del Mac con `device_commit_files`; 3) extraer encima (puede hacer falta `device_request_delete_permission` en esa carpeta, porque tar y git necesitan borrar/reemplazar archivos); 4) `git commit` ahí con `user.name="lilfreedge"` y `user.email="felipetorreira2@gmail.com"` (así quedan sus commits, no los de Claude); 5) `git push origin main` -- si falla por credenciales (este VM del Mac no tiene las suyas), avisarle para que le dé push él mismo desde su Terminal.
- SQL: ninguno pendiente de correr (las V68 a V76 no necesitaron SQL nuevo). Lo último con SQL fue `supabase/todo_v67_una_sola_vez.sql` (migraciones 91 a 94).

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
