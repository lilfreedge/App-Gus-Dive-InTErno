import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Tablas incluidas en el respaldo. Se consulta cada una por separado y se
// ignora (sin tronar el resto) la que todavía no exista en este proyecto —
// V5 se está desplegando en paralelo por más de un agente, así que alguna
// tabla nueva (inspecciones_visuales, mantenimientos_reguladores, etc.)
// puede no estar creada todavía cuando esto se ejecuta.
const TABLAS = [
  "salidas",
  "llenados_tanques",
  "inspecciones_visuales",
  "mantenimientos_reguladores",
  "reguladores_alquiler",
  "tanques_alquiler",
  "articulos",
  "cambios_historial",
];

export async function GET() {
  // Verifica que quien llama sea el Titular usando el cliente con la
  // sesión del navegador (cookies), no el de servicio.
  const supabaseSesion = createClient();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: profile } = await supabaseSesion
    .from("profiles")
    .select("es_titular")
    .eq("id", user.id)
    .single();

  if (!profile?.es_titular) {
    return NextResponse.json({ error: "Solo el Titular puede descargar el respaldo" }, { status: 403 });
  }

  // El respaldo debe incluir todos los datos sin importar quién los creó,
  // así que se usa el cliente de servicio (sin RLS) a partir de aquí.
  const supabase = createServiceClient();

  const respaldo = {
    generado_en: new Date().toISOString(),
    generado_por: user.email || user.id,
  };

  for (const tabla of TABLAS) {
    try {
      const { data, error } = await supabase.from(tabla).select("*");
      if (error) continue;
      respaldo[tabla] = data || [];
    } catch {
      // Tabla no existe todavía o algún otro problema: se omite esta
      // clave del respaldo en vez de tronar la descarga completa.
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(respaldo, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="respaldo-gus-dive-${hoy}.json"`,
    },
  });
}
