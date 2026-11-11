import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarAvisoNuevaCuenta } from "@/lib/correo-nueva-cuenta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Aviso de cuenta nueva (V70, pedido explícito: "quiero que me llegue un
// correo a felipe@gusdivecenter.com cada vez que alguien se cree una
// cuenta ... para yo aprobarlo") -- lo llama /registro justo después de
// que supabase.auth.signUp() tiene éxito. No bloquea el registro: si el
// correo falla, la cuenta queda creada igual (el Titular la sigue viendo
// en "Usuarios nuevos").
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const nombre = String(body?.nombre || "").trim().slice(0, 200);
  const correo = String(body?.correo || "").trim().slice(0, 200);
  if (!nombre || !correo) return NextResponse.json({ ok: false, error: "Faltan datos." }, { status: 400 });

  const supabase = createServiceClient();
  const { data: config } = await supabase.from("app_config").select("nuevas_cuentas_correos").maybeSingle();

  const resultado = await enviarAvisoNuevaCuenta({
    nombre,
    correo,
    destinatarios: config?.nuevas_cuentas_correos || [],
  });

  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
}
