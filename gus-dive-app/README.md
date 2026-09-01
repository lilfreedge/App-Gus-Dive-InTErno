# Gus Dive — Control Interno

App interna para registrar salidas de piezas/artículos y llenados de tanques, con historial y usuarios propios. 100% gratis, corre en la nube (Supabase + Vercel).

## Qué incluye

- Login con usuario y contraseña por empleado (cualquiera puede crear su cuenta desde la pantalla de registro).
- Registrar salidas de piezas/uso interno: artículo, cantidad, motivo, quién autorizó y nota.
- Historial completo de salidas, con quién lo sacó y cuándo.
- Registrar llenados de tanques (cantidad + nota), con totales por mes.
- Panel principal con accesos rápidos y actividad reciente.

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
6. Ve a **Authentication** → **Providers** → **Email**, y **desactiva** la opción "Confirm email" (así los empleados pueden entrar apenas se registran, sin necesitar revisar un correo). Guarda los cambios.
7. Ve a **Settings** → **API**. Ahí vas a ver dos datos que necesitas para el siguiente paso:
   - `Project URL`
   - `anon public` key (una clave larga)

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

Si en algún momento quieres que yo le agregue algo más a la app (por ejemplo, exportar a Excel, editar/borrar registros, reportes por fecha, etc.), guarda este proyecto y pídemelo — trabajaré sobre este mismo código.

## Desarrollo local (opcional, solo si quieres probarlo en tu computadora antes)

```bash
npm install
cp .env.local.example .env.local
# Llena .env.local con tus datos de Supabase
npm run dev
```

Abre http://localhost:3000
