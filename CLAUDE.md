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

## Estado (10-nov-2026)

- En GitHub está la **V62** (subida el 8-nov, commit 6378629 en su Mac; mismo árbol que mi commit local 74f269a). Lo próximo se sube igual: solo cuando él diga "súbela".
- SQL de la V62: `supabase/todo_v62_una_sola_vez.sql` (migraciones 88, 89 y 90). Se le dio para correr una vez.
- Lista de verificación de la V62: 251–262 y 264 (la 234, B). Él dijo "al final verifico todo".
- Maquetas: `maqueta-v61.html` y la maqueta V62 ya están contestadas.

## Pendiente

**V63, V64, V65, V66 y V67 hechas en commits locales, sin subir** (desde 74f269a; él dijo "espera y subes junto"). SQL: `supabase/todo_v67_una_sola_vez.sql` (migration_91, 92, 93 y 94; probado dos veces). Detalle en los docs del proyecto `claude/v64-pedidos.md`, `claude/v65-pedidos.md` y `claude/v66-pedidos.md`.
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
