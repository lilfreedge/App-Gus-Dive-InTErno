// Ayudante para leer métricas de uso reales del proyecto de Supabase,
// usando la Management API de Supabase (https://api.supabase.com).
//
// Requiere dos variables de entorno que el dueño configura cuando genera
// su "Personal Access Token" en la cuenta de Supabase:
//   - SUPABASE_ACCESS_TOKEN: el Personal Access Token (empieza con "sbp_").
//   - SUPABASE_PROJECT_REF: el "Project ID"/ref del proyecto (lo que sale
//     en la URL del dashboard, ej. https://supabase.com/dashboard/project/XXXXX).
//
// Mientras esas variables no existan, todo esto se salta y la página
// muestra un aviso amigable en vez de números falsos.
//
// Nota de investigación (septiembre 2026): la Management API de Supabase
// NO tiene un endpoint público documentado que devuelva directamente
// "espacio de base de datos usado", "almacenamiento de archivos usado" o
// "usuarios activos" como métricas de facturación. Por eso, para esas tres
// calculamos el número real nosotros mismos con un query SQL de solo
// lectura contra el propio proyecto, usando el endpoint sí documentado
// "Run a query" (POST /v1/projects/{ref}/database/query). Para "solicitudes
// a la base de datos" sí existe un endpoint de analítica documentado
// (GET /v1/projects/{ref}/analytics/endpoints/usage.api-counts) y lo usamos
// tal cual. Los límites del plan gratis (500 MB de base de datos, 1 GB de
// almacenamiento de archivos, 50,000 usuarios activos al mes) son los que
// Supabase publica en supabase.com/pricing.

const MANAGEMENT_API_BASE = "https://api.supabase.com";

export const LIMITE_DB_BYTES = 500 * 1024 * 1024; // 500 MB (plan gratis)
export const LIMITE_STORAGE_BYTES = 1024 * 1024 * 1024; // 1 GB (plan gratis)
export const LIMITE_USUARIOS_ACTIVOS = 50000; // plan gratis

// Lee las credenciales desde el entorno. Devuelve null si falta alguna.
export function credencialesManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) return null;
  return { token, ref };
}

async function runQuery({ token, ref }, sql) {
  const res = await fetch(
    `${MANAGEMENT_API_BASE}/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql, read_only: true }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Management API respondió ${res.status}`);
  }
  return res.json();
}

// Espacio de base de datos usado, en bytes.
export async function getEspacioBaseDeDatos(creds) {
  try {
    const filas = await runQuery(
      creds,
      "select pg_database_size(current_database()) as bytes;"
    );
    const bytes = Number(filas?.[0]?.bytes);
    if (!Number.isFinite(bytes)) return { disponible: false };
    return { disponible: true, bytes, limite: LIMITE_DB_BYTES };
  } catch {
    return { disponible: false };
  }
}

// Almacenamiento de archivos usado (bucket de Storage), en bytes.
export async function getAlmacenamientoArchivos(creds) {
  try {
    const filas = await runQuery(
      creds,
      "select coalesce(sum((metadata->>'size')::bigint), 0) as bytes from storage.objects;"
    );
    const bytes = Number(filas?.[0]?.bytes);
    if (!Number.isFinite(bytes)) return { disponible: false };
    return { disponible: true, bytes, limite: LIMITE_STORAGE_BYTES };
  } catch {
    return { disponible: false };
  }
}

// Usuarios distintos que iniciaron sesión en los últimos 30 días.
export async function getUsuariosActivos(creds) {
  try {
    const filas = await runQuery(
      creds,
      "select count(distinct id)::int as n from auth.users where last_sign_in_at >= now() - interval '30 days';"
    );
    const n = Number(filas?.[0]?.n);
    if (!Number.isFinite(n)) return { disponible: false };
    return { disponible: true, cantidad: n, limite: LIMITE_USUARIOS_ACTIVOS };
  } catch {
    return { disponible: false };
  }
}

// Solicitudes a la base de datos (vía la API de Supabase) en los últimos
// 30 días, usando el endpoint de analítica de uso de la Management API.
export async function getSolicitudesBaseDeDatos({ token, ref }) {
  try {
    const res = await fetch(
      `${MANAGEMENT_API_BASE}/v1/projects/${ref}/analytics/endpoints/usage.api-counts?interval=30day`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error(`Management API respondió ${res.status}`);
    const data = await res.json();
    const puntos = Array.isArray(data?.result) ? data.result : null;
    if (!puntos) return { disponible: false };

    const total = puntos.reduce((acc, p) => {
      return (
        acc +
        (Number(p.total_rest_requests) || 0) +
        (Number(p.total_auth_requests) || 0) +
        (Number(p.total_storage_requests) || 0) +
        (Number(p.total_realtime_requests) || 0)
      );
    }, 0);

    return { disponible: true, cantidad: total };
  } catch {
    return { disponible: false };
  }
}

// Formatea bytes a algo legible (MB/GB) para gente no técnica.
export function formatearBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatearNumero(n) {
  return n.toLocaleString("es-DO");
}
