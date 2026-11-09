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

## Estado (8-nov-2026)

- En GitHub está la **V61**. La **V62** está hecha en commits locales, sin subir. Súbela solo cuando él diga "súbela".
- SQL para correr cuando se suba: `supabase/todo_v62_una_sola_vez.sql` (migraciones 88, 89 y 90). Se puede correr más de una vez.
- Lista de verificación de la V62: 251–262 y 264 (la 234, B). Él dijo "al final verifico todo".
- Maquetas: `maqueta-v61.html` y la maqueta V62 ya están contestadas.

## Pendiente

**Aprobado y sin hacer (la próxima tanda):**
- **230, Recordatorios para técnicos** (App Interno, Equipos): una sola sección para compresores, inspección visual y mantenimiento de reguladores.
  - Cada recordatorio: qué hacer, cada cuánto y a quién le toca.
  - "Hacerlo" le sale solo a la persona asignada; el Titular y los administradores ven todos.
  - Avisos solo a la persona asignada: campanita (y WhatsApp o correo si se marca). Al asignarlo le llega "Te asignaron…".
- **162, Mi registro** (ver abajo).

**Preguntas abiertas:**
- **236, correos en spam:** (8-nov: "por ahora no he vuelto a ver, te mantengo al tanto"). Se cambió el correo de avisos de Buceos a un documento HTML completo. Si sigue cayendo en spam, pídele los encabezados completos de un correo ("Ver original") y que agregue tienda@gusdivecenter.com a los remitentes seguros. El cambio a `app.gusdivecenter.com` también ayuda, porque los links dejan de ser `vercel.app`.
- **217–228:** lista de verificación que todavía no contesta.
- **243 / 191:** el 404. Él avisa si le vuelve a salir.

**162, detalle:**
- 162, "Mi registro": el estudiante vuelve a entrar al link y ve su perfil.
  - Cambiar la foto y la firma solo cada 6 meses.
  - Ve sus datos y los puede cambiar.
  - Ve sus cursos con el avance; los pagos van dentro de cada curso, con un aviso de lo que debe.
  - El título es "Mis documentos".
  - Después, lo mismo para los buzos en Buceos ("perfiles de los buzos").

**Para más adelante (él lo dijo):**
- **232:** Alquiler, premios por lo acumulado.
- **247:** el link del buceo se queda como estaba (él dijo que no).
- **205:** Buceos › Más › Catálogo › La Caleta › "¿Llegas directo? (punto de encuentro)", llenar y Guardar.
- **206:** buscar una forma de saber si una cédula dominicana es real.
- **207:** botón "Entrar al grupo de WhatsApp" con el link de invitación de cada buceo o curso.

**De antes, diferido por él:**
- Cambiar el dominio a `app.gusdivecenter.com`.
- Pregunta 95.
- Las preguntas 86, 89 y 90.
- La lista 16–40.

Cuando él conteste una lista de verificación, termina tu respuesta con esta línea, tal cual:
"Todo lo demás queda anotado como pendiente: la dirección nueva, la pregunta 95, la 86, la 89, la 90 y la lista 16–40."
