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

- En GitHub está hasta la **V60** (V58, V59 y V60 subidas). La siguiente versión es la **V61**.
- SQL que él tiene que correr si todavía no lo hizo: `supabase/todo_v60_una_sola_vez.sql` (migraciones 83 a 86). Se puede correr más de una vez.
- Última lista de verificación que se le mandó: 189–197 (V60). Las siguientes preguntas o puntos siguen desde el **210**.
- Las maquetas aprobadas están en `public/maquetas/` (la V60: `maqueta-v60.html`).

## Pendiente

**Aprobado en la maqueta V60 (hacer en la V61).** Sus respuestas tienen número:
- **198 "sí", link de Buceos:** al final, todo lo de la transferencia va en un solo cuadro, con filas: Banco, Cuenta, Número (con Copiar), A nombre de y Cédula (con Copiar). Es la pestaña 1.
- **199 "hm ok", ficha en lista de espera (Control Estudiantes):** opción A. Cada curso con cupo sale como una fila (fecha, curso, "0 de 6", instructor) con el botón "Pasarlo aquí". Abajo va "Escribirle por WhatsApp" en verde. Es la pestaña 2. Dijo "hm ok": enséñaselo y confirma que le gusta.
- **200 "ok", lista de Estudiantes:** no escogió entre A (una sola etiqueta "Open Water Diver · esperando fecha") y B (texto con puntito de color). **Pregúntale otra vez.** Es la pestaña 3.
- **201 "ok", link del estudiante:** si se anota en lista de espera (curso sin fecha), después de "Tus datos" va directo a "¡Listo, X! Ya estás anotado". Debajo sale, opcional, "¿Quieres adelantar?" con el botón "Adelantar mis documentos" (foto, documento y firma). Es la pestaña 4.
- **202 "A", fecha de nacimiento:** tres listas (día, mes, año) en vez del calendario. Va en todos lados donde se pide fecha de nacimiento: link del estudiante, link de Buceos y fichas. Es la pestaña 5.
- **203, menores de edad:** NO es lo de la pestaña 6. Él quiere que el adulto tenga una opción **"Registrar a un menor de edad"**, y que con 11 años o menos simplemente no deje inscribirlo. Hazle una maqueta primero.
- **204 "ok", ficha del buzo en Buceos:**
  - "Escribirle por WhatsApp" en verde.
  - El grupo como pregunta: "¿Está en el grupo de WhatsApp del buceo?" con No está / Ya está.
  - El pago con una línea grande ("Debe RD$X de RD$Y") y una barrita.
  - El comprobante nuevo resaltado ("Comprobante nuevo por revisar", con Ver y Ya lo vi).
  - Abajo, "+ Registrar pago" y "Adjuntar comprobante".
  - Es la pestaña 7.
- **208 "sí", Buceos:** botón "Descargar comprobantes" en cada buceo. Baja un ZIP con cada archivo nombrado "Nombre del buzo - monto - fecha", más una lista (nombre, monto, cuenta, fecha, conciliado), para contabilidad.

**Aprobado de antes y todavía sin hacer:**
- 162, "Mi registro": el estudiante vuelve a entrar al link y ve su perfil.
  - Cambiar la foto y la firma solo cada 6 meses.
  - Ve todos sus datos y los puede cambiar.
  - Ve sus cursos con el avance; los pagos van dentro de cada curso, con un aviso pequeño de lo que debe.
  - El título es "Mis documentos".
  - Después, lo mismo para los buzos en Buceos ("perfiles de los buzos").

**Para más adelante (él lo dijo):**
- **205, "¿Llegas directo?" no le aparece:** no entendió la explicación y quiere verlo. Explícale en pasos: Buceos › Más › Catálogo › La Caleta › "¿Llegas directo? (punto de encuentro)", llenar y Guardar.
- **206:** buscar una forma de saber si una cédula dominicana es real. Por ahora no se valida nada nuevo.
- **207:** botón "Entrar al grupo de WhatsApp" con el link de invitación de cada buceo o curso. Lo quiere, pero más adelante.

**Alquiler (él dijo que el viernes):**
- Etiqueta "Alquilado" en el tanque o regulador en App Interno, sin sección aparte.
- Proteger el número de factura para que no se cambie por error.
- Opción "Estudiante OWD" al alquilar (en los cursos el equipo va incluido).
- Premios por monto acumulado (por ejemplo, un tanque gratis).
- Número de factura para la mora, para ponerlo después de cobrar.
- Botón "Vino con problemas" para cobrar la inspección de un tanque vacío o un manómetro ahogado. Proponer primero.
- Pestaña Clientes entre Equipos y Más.
- Editar y borrar alquileres y clientes.
- Retornos: los últimos retornos abajo y un buscador por equipo o cliente, con una ventana parecida a la de Alquiler.

**De antes, diferido por él:**
- Cambiar el dominio a `app.gusdivecenter.com`.
- Pregunta 95.
- Las preguntas 86, 89 y 90.
- La lista 16–40.

Cuando él conteste una lista de verificación, termina tu respuesta con esta línea, tal cual:
"Todo lo demás queda anotado como pendiente: la dirección nueva, la pregunta 95, la 86, la 89, la 90 y la lista 16–40."
