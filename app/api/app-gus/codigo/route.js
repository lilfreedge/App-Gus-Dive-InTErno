import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { filaABuzo } from "@/lib/viajes/datos";
import { primerNombre, celValido, celGuardar, soloDigitos } from "@/lib/viajes/modelo";
import { docValido, buscarPorDoc } from "@/lib/estudiantes/servidor";
import { mandarCodigo, correoOculto, correoOk } from "@/lib/correo-codigo";
import { origenDe } from "@/lib/direccion";
import { textoSinCuenta } from "@/lib/app-gus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V97 (maqueta V96, "16. C") -- entrar al app Gus Dive con la cédula (o el
// pasaporte) O con el celular, más un código de 6 números que le llega a su
// correo. Al confirmar el código, el servidor le devuelve su documento y su
// celular, y el app sigue igual que antes (los guarda en el celular y los manda
// en cada pedido). Si no tiene correo, o falta la tabla (migration_102), entra
// como antes: con las dos cosas.
//   { accion: "pedir", por: "celular", cel } o { accion: "pedir", tipoDoc, doc } -> { id, correo } | { sinCorreo } | { sinTabla }
//   { accion: "verificar", id, codigo } -> { tipoDoc, doc, cel, primer }
const VIGENCIA_MIN = 10;
const MAX_INTENTOS = 5;
const MAX_CODIGOS = 3; // cada 15 minutos, por persona
const clave = () => `${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}gus-codigo-v1`;
const hashDe = (id, codigo) => crypto.createHmac("sha256", clave()).update(`${id}:${codigo}`).digest("hex");
const json = (x, status = 200) => NextResponse.json(x, { status });

async function buscar(s, body) {
  if (body.por === "celular") {
    if (!celValido(body.cel)) return { error: "Revisa tu celular." };
    const { data } = await s.from("viajes_buzos").select("*").eq("celular", celGuardar(body.cel));
    // Los menores se guardan con el celular de quien los registró: no cuentan.
    const gente = (data || []).map(filaABuzo).filter((b) => !b.staff && !b.tutor);
    if (!gente.length) return { error: textoSinCuenta(), status: 404 };
    if (gente.length > 1) return { error: "Ese celular lo tiene más de una persona. Entra con tu cédula.", status: 409 };
    return { b: gente[0] };
  }
  const tipo = body.tipoDoc === "pasaporte" ? "pasaporte" : "cedula";
  if (!docValido(tipo, body.doc)) return { error: "Revisa tu cédula o pasaporte." };
  const b = await buscarPorDoc(s, tipo, body.doc);
  if (!b || b.staff) return { error: textoSinCuenta(), status: 404 };
  return { b };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const s = createServiceClient();

  if (body.accion === "pedir") {
    const r = await buscar(s, body);
    if (r.error) return json({ error: r.error }, r.status || 400);
    const b = r.b;
    if (!correoOk(b.correo)) return json({ sinCorreo: true });
    const desde = new Date(Date.now() - 15 * 60000).toISOString();
    const { count, error: eC } = await s.from("gus_codigos").select("id", { count: "exact", head: true }).eq("buzo_id", b.id).gte("creado_en", desde);
    if (eC) return json({ sinTabla: true });
    if ((count || 0) >= MAX_CODIGOS) return json({ error: "Ya te mandamos varios códigos. Espera unos minutos o entra con tu cédula y tu celular." }, 429);
    const id = crypto.randomUUID();
    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const { error: eI } = await s.from("gus_codigos").insert({ id, buzo_id: b.id, hash: hashDe(id, codigo), expira: new Date(Date.now() + VIGENCIA_MIN * 60000).toISOString() });
    if (eI) return json({ sinTabla: true });
    const ok = await mandarCodigo({ correo: b.correo, nombre: primerNombre(b.nombre), codigo, minutos: VIGENCIA_MIN, origen: origenDe(request) });
    if (!ok) return json({ error: "No pudimos mandar el correo. Entra con tu cédula y tu celular, o escríbenos." }, 502);
    return json({ id, correo: correoOculto(b.correo) });
  }

  if (body.accion === "verificar") {
    const id = String(body.id || "");
    const codigo = soloDigitos(body.codigo);
    if (!/^[0-9a-f-]{36}$/i.test(id) || codigo.length !== 6) return json({ error: "Escribe los 6 números del código." }, 400);
    const { data: c, error } = await s.from("gus_codigos").select("*").eq("id", id).maybeSingle();
    if (error || !c) return json({ error: "Ese código ya no sirve. Pide otro." }, 400);
    if (c.usado || new Date(c.expira) < new Date()) return json({ error: "Ese código ya venció. Pide otro." }, 400);
    if ((c.intentos || 0) >= MAX_INTENTOS) return json({ error: "Muchos intentos con ese código. Pide otro." }, 429);
    const bueno = crypto.timingSafeEqual(Buffer.from(hashDe(id, codigo)), Buffer.from(String(c.hash).padEnd(64, "0").slice(0, 64)));
    if (!bueno) {
      const quedan = MAX_INTENTOS - (c.intentos || 0) - 1;
      await s.from("gus_codigos").update({ intentos: (c.intentos || 0) + 1 }).eq("id", id);
      return json({ error: quedan > 0 ? `Ese código no es. Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`}.` : "Ese código no es. Pide otro." }, 400);
    }
    await s.from("gus_codigos").update({ usado: true }).eq("id", id);
    const { data: fila } = await s.from("viajes_buzos").select("*").eq("id", c.buzo_id).maybeSingle();
    const b = fila ? filaABuzo(fila) : null;
    const tipoDoc = b?.doc ? "cedula" : b?.pasaporte ? "pasaporte" : "";
    if (!b || b.staff || !tipoDoc || !celValido(b.cel)) return json({ error: "No pudimos entrar con ese código. Escríbenos por WhatsApp." }, 400);
    return json({ tipoDoc, doc: tipoDoc === "cedula" ? b.doc : b.pasaporte, cel: b.cel, primer: primerNombre(b.nombre) });
  }

  return json({ error: "Pedido no válido." }, 400);
}
