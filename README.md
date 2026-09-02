# Gus Dive — Control Interno

App interna para registrar salidas de piezas/artículos y llenados de tanques, con historial y usuarios propios. 100% gratis, corre en la nube (Supabase + Vercel).

## Qué incluye

- Login con usuario y contraseña por empleado (cualquiera puede crear su cuenta desde la pantalla de registro).
- Registrar salidas de piezas/uso interno: artículo (elegido de un catálogo), cantidad, motivo, quién autorizó (elegido entre los administradores) y nota.
- Historial completo de salidas, con quién lo sacó y cuándo.
- Registrar llenados de tanques (cantidad + nota), con totales por mes.
- Panel principal con vista por semana o por año, artículos más sacados y actividad reciente.
- **Administradores**: pueden editar o borrar cualquier salida/llenado (con historial de cambios), manejar el catálogo de artículos, dar/quitar permisos de administrador a otros usuarios, y exportar reportes (Excel o CSV) por rango de fechas.
- **Reporte semanal automático por correo**, con el resumen y un archivo Excel adjunto.

---

## Paso 1: Crear el proyecto en Supabase (gratis)

1. Ve a https://supabase.com y crea una cuenta gratis (puedes usar tu Google).
2. Clic en **New Project**.
   - Nombre: `gus-dive` (o el que quieras).
   - Contraseña de base de datos: genera una y guárdala en un lugar seguro (no la necesitarás de nuevo para esta app, pero consérvala).
   - Región: elige la más cercana (ej. `East US` o `South America`).
3. Espera 1-2 minutos a que el proyecto termine de crearse.
4. En el menú izquierdo, ve a **SQL Editor** → **New query**.
5. Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** su contenido, pégalo en el editor y dale **Run**. Esto crea las tablas de usuarios, salidas y tanques con sus permisos de seguridad.
5.1. Clic en **New query** otra vez, abre el archivo `supabase/migration_02.sql`, copia todo su contenido, pégalo y dale **Run**. Esto agrega roles de administrador, catálogo de artículos, e historial de cambios.
6. Ve a **Authentication** (ícono de candado en el menú izquierdo) → pestaña **Sign In / Providers** → haz clic en **Email** para expandirlo, y **desactiva** la opción "Confirm email" (así los empleados pueden entrar apenas se registran, sin necesitar revisar un correo). Baja y dale **Save**.
   - Si no ves la pestaña, entra a tu proyecto y agrega `/auth/providers` al final de la URL.
7. Ve a **Settings** (ícono de engranaje) → **API Keys**. Ahí vas a ver dos datos que necesitas para el siguiente paso:
   - `Project URL` (arriba de la página, a veces bajo "Project Settings" o "Data API")
   - La clave pública: puede aparecer como **`anon` `public`** o como **`publishable key`** (empieza con `sb_publishable_...`) — cualquiera de las dos sirve, usa la que te aparezca. **No copies la `service_role` / `secret` key**, esa es privada y nunca debe ir en la app.

---

## Paso 2: Subir el código a GitHub

1. Crea una cuenta gratis en https://github.com si no tienes.
2. Crea un repositorio nuevo (puede ser privado), por ejemplo `gus-dive-app`.
3. Sube todos los archivos de esta carpeta a ese repositorio (puedes arrastrar los archivos desde la web de GitHub con "uploading an existing file", o usar `git` si sabes usarlo).

---

## Paso 3: Desplegar en Vercel (gratis)

1. Ve a https://vercel.com y crea una cuenta gratis usando tu cuenta de GitHub.
2. Clic en **Add New** → **Project**.
3. Selecciona el repositorio `gus-dive-app` que subiste.
4. Antes de darle **Deploy**, abre la sección **Environment Variables** y agrega estas dos:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | (pega el `Project URL` de Supabase) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (pega la `anon public` key de Supabase) |

5. Clic en **Deploy**. En 1-2 minutos tendrás un link público, por ejemplo `https://gus-dive-app.vercel.app`.

Ese es el link que vas a compartir con tu equipo (guárdalo como acceso directo en el celular de cada quien).

---

## Paso 4: Crear las cuentas del equipo

1. Abre el link de la app y entra a **"Crear cuenta"**.
2. Cada empleado crea su propia cuenta con su nombre, correo y una contraseña.
3. Desde ese momento, todo lo que registren queda asociado a su nombre en el historial.

No hace falta que tú "crees" cada usuario manualmente — cada quien se registra una sola vez y luego usa su usuario y contraseña para entrar.

---

## Actualizaciones futuras

Si en algún momento quieres que yo le agregue algo más a la app, guarda este proyecto y pídemelo — trabajaré sobre este mismo código.

### Cómo subir una actualización a tu app ya publicada (usando github.dev)

Esta es la forma que ya usamos antes y funciona bien sin instalar nada:

1. Descomprime el zip nuevo en tu computadora.
2. Ve a tu repositorio en GitHub y presiona el punto `.` del teclado (o cambia `github.com` por `github.dev` en la URL). Esto abre un editor de código en el navegador.
3. En el panel de la izquierda, arrastra los archivos y carpetas nuevos hacia la raíz del repositorio, reemplazando los que tengan el mismo nombre.
4. Ve al ícono de **Source Control** (control de código fuente) en el panel izquierdo, escribe un mensaje corto (ej. "actualización de reportes"), y dale al ✓ (**Commit & Push**). Esto sube el cambio directo a `main`, no hace falta ningún paso extra.
5. Vercel detecta el cambio automáticamente y despliega la nueva versión solo, en 1-2 minutos.

---

## Actualización: administradores, catálogo, edición/borrado y reportes

Esta versión agrega: roles de administrador, catálogo de artículos (para que las salidas solo se puedan registrar con artículos ya dados de alta), edición y borrado de registros con historial de cambios, exportar reportes en Excel/CSV por rango de fechas, y un reporte semanal automático por correo.

Después de subir este código (con los pasos de arriba), hay que hacer esto **una sola vez**:

### 1. Correr la nueva migración en Supabase

1. Entra a tu proyecto en Supabase → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/migration_02.sql` de este proyecto, copia todo el contenido, pégalo y dale **Run**.

### 2. Convertirte en administrador

Por defecto nadie es administrador (ni siquiera tú), así que hay que activarlo manualmente la primera vez:

1. En Supabase, ve a **SQL Editor** → **New query**.
2. Pega esto, cambiando `TU-CORREO-AQUI` por el correo con el que creaste tu cuenta en la app, y dale **Run**:

   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'TU-CORREO-AQUI');
   ```
3. Sal de la app y vuelve a entrar (o refresca la página). Ahora verás en el menú superior las secciones de administrador: **Reportes**, **Catálogo**, **Administradores** e **Historial de cambios**.
4. Desde **Administradores** puedes darle (o quitarle) el mismo permiso a cualquier otro empleado cuando lo necesites, sin volver a tocar SQL.

### 3. Agregar tus artículos al catálogo

Antes de que alguien pueda registrar una salida, tú (como admin) debes agregar los artículos en **Catálogo** (menú superior). Cualquier artículo que no esté ahí no se podrá seleccionar al registrar una salida — así evitamos errores de escritura.

### 4. Configurar el reporte semanal automático (opcional, pero recomendado)

Este paso es opcional — si no lo haces, todo lo demás funciona igual, solo no recibirás el correo semanal automático. Puedes hacerlo después con calma.

1. Crea una cuenta gratis en https://resend.com (no piden tarjeta).
2. Dentro de Resend, ve a **API Keys** → **Create API Key** y copia la clave (empieza con `re_...`).
   - No hace falta crear ni verificar un correo/dominio propio para empezar: puedes usar el remitente de prueba `onboarding@resend.dev` que ya viene configurado, y mandarte el reporte a cualquier correo tuyo (Gmail, etc.) — no necesita usuario ni cuenta especial, es solo la dirección donde quieres recibirlo.
3. En Vercel, ve a tu proyecto → **Settings** → **Environment Variables** y agrega estas (todas como texto/"Plaintext"):

   | Name | Value |
   |---|---|
   | `SUPABASE_SERVICE_ROLE_KEY` | En Supabase: **Settings → API Keys**, pestaña "Legacy anon, service_role API keys" (o la nueva `secret key`). **Es privada, nunca la compartas.** |
   | `RESEND_API_KEY` | La clave `re_...` que copiaste de Resend. |
   | `REPORT_EMAIL_TO` | El correo (o correos, separados por coma) donde quieres recibir el reporte cada semana. |
   | `REPORT_EMAIL_FROM` | Déjalo como `Gus Dive <onboarding@resend.dev>` (o tu propio dominio verificado en Resend, si tienes uno). |
   | `CRON_SECRET` | Cualquier texto largo e inventado por ti (ej. una contraseña random). Sirve para que nadie más pueda disparar el envío del reporte. |

4. Dale **Redeploy** a tu proyecto en Vercel (Deployments → los tres puntos `...` de la última → **Redeploy**) para que tome las nuevas variables.
5. Listo — todos los lunes a las 9:00am (hora República Dominicana) llegará automáticamente un correo con el resumen de la semana y un Excel adjunto. Si en algún momento quieres cambiar el día/hora, dímelo y te ajusto el archivo `vercel.json`.

### Qué encontrarás nuevo en el día a día

- **Salidas**: ahora el artículo y quién autoriza se eligen de una lista (ya no se escriben a mano).
- **Reportes** (solo admins): elige tipo de dato, formato (Excel o CSV) y rango de fechas, y descarga.
- **Historial de cambios** (solo admins): registro de cada edición o borrado, con quién lo hizo y qué decía el registro antes del cambio.
- Los botones de editar/borrar aparecen junto a cada registro en Salidas y Tanques, solo para administradores.

## Desarrollo local (opcional, solo si quieres probarlo en tu computadora antes)

```bash
npm install
cp .env.local.example .env.local
# Llena .env.local con tus datos de Supabase
npm run dev
```

Abre http://localhost:3000
