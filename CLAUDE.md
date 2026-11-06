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
13. **Alquiler: no se toca hasta que él lo diga** (ver "Pendiente").

## Las apps (en `/espacio` se escoge una)

- **App Interno:** salidas, llenados, equipos, tanques, reguladores, compresores. Barra grafito.
- **App Equipos de clientes:** órdenes de taller. Barra navy.
- **Control Estudiantes** (`components/estudiantes/`): barra amarilla SNSI. Links públicos: `/estudiante` y `/me-interesa`.
- **Buceos** (`components/viajes/`): azul `#4EBAE8`. Link público: `/inscripcion/[slug]`.
- **Alquiler** (`components/alquiler/`): rojo GUS.

Control Estudiantes, Buceos y Alquiler salen "En construcción" en `/espacio` (`app/espacio/page.js`, `EN_CONSTRUCCION`). Él avisa cuando se quita la etiqueta de cada una.

Los estudiantes y los buzos son la misma base de personas: la tabla `viajes_buzos`.

## Estado (6-nov-2026)

- En GitHub está la **V59**. La **V60** y la **V61** están hechas y sin subir; él dijo "No lo subas". Súbelas juntas solo cuando diga "súbela".
- SQL para correr cuando se suba: `supabase/todo_v61_una_sola_vez.sql` (migraciones 83 a 87). Se puede correr más de una vez.
- Lista de verificación pendiente, en una sola lista con los dos grupos:
  - 189–197: V60.
  - 210 en adelante: V61.
  - Él dijo: "al final verifico todo".
- Maquetas en `public/maquetas/`:
  - `maqueta-v60.html`: ya contestada.
  - `maqueta-v61.html`: esperando su respuesta.

## Pendiente

**Esperando su respuesta a la maqueta V61:**
1. Registrar a un menor de edad (203).
2. Recordatorios para técnicos (compresores, inspección visual, mantenimiento de reguladores).
3. Página del buceo más ordenada.
4. Alquiler: premios por lo acumulado.
5. Alquiler: "Vino con problemas".

**Preguntas abiertas:**
- **200:** lista de Estudiantes: ¿A (una sola etiqueta) o B (texto con puntito)?
- **Correos en spam:** se cambió el correo de avisos de Buceos a un documento HTML completo. Si sigue cayendo en spam, pídele los encabezados completos de un correo ("Ver original") y que agregue tienda@gusdivecenter.com a los remitentes seguros. El cambio a `app.gusdivecenter.com` también ayuda, porque los links dejan de ser `vercel.app`.
- **205:** "¿Llegas directo?". Explicarle con pasos (ver abajo).

**Aprobado de antes y todavía sin hacer:**
- 162, "Mi registro": el estudiante vuelve a entrar al link y ve su perfil.
  - Cambiar la foto y la firma solo cada 6 meses.
  - Ve sus datos y los puede cambiar.
  - Ve sus cursos con el avance; los pagos van dentro de cada curso, con un aviso de lo que debe.
  - El título es "Mis documentos".
  - Después, lo mismo para los buzos en Buceos ("perfiles de los buzos").

**Para más adelante (él lo dijo):**
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
