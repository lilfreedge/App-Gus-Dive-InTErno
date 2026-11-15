import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { filaAViaje, filaAIns } from "@/lib/viajes/datos";
import { celOculto, primerNombre, estadoPago, celValido, celGuardar, linkGrupoValido } from "@/lib/viajes/modelo";
import { docValido, buscarPorDoc } from "@/lib/estudiantes/servidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V81 -- "App Gus" (maqueta V82): sus buceos y su perfil, con la cédula (o el
// pasaporte) y el celular que tenemos. Es lo mismo que "Mi perfil" del link
// de cada buceo (api/viajes/publico, "perfil"), pero sin tener que entrar
// por un buceo. Sus cursos salen de api/estudiantes/publico ("estado").
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const s = createServiceClient();
  const tipo = body.tipoDoc === "pasaporte" ? "pasaporte" : "cedula";
  if (!docValido(tipo, body.doc)) return NextResponse.json({ error: "Revisa tu cédula o pasaporte." }, { status: 400 });
  const b = await buscarPorDoc(s, tipo, body.doc);
  if (!b || b.staff) return NextResponse.json({ error: "No te encontramos con ese documento. Si es tu primera vez, inscríbete en un curso o un buceo." }, { status: 404 });
  if (!celValido(b.cel) || celGuardar(b.cel) !== celGuardar(body.cel)) return NextResponse.json({ error: "Ese celular no es el que tenemos con esa cédula. Escríbenos por WhatsApp." }, { status: 400 });

  const { data: ins } = await s.from("viajes_inscripciones").select("*").eq("buzo_id", b.id).neq("estado", "quitado");
  const ids = [...new Set((ins || []).map((x) => x.viaje_id))];
  const { data: vs } = ids.length ? await s.from("viajes").select("*").in("id", ids) : { data: [] };
  const porId = Object.fromEntries((vs || []).map((r) => [r.id, filaAViaje(r)]));
  const hoy = new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10);
  const lista = (ins || [])
    .map(filaAIns)
    .map((x) => ({ x, v: porId[x.viajeId] }))
    .filter((y) => y.v && y.v.estado !== "cancelado")
    .map(({ x, v }) => {
      const e = estadoPago(v, x);
      return { id: x.id, slug: v.slug, nombre: v.nombre, fecha: v.fecha, salida: v.salida || "", espera: x.estado === "espera", pago: { k: e.k, t: e.t, falta: e.falta || 0 }, linkGrupo: x.estado !== "espera" && linkGrupoValido(v.linkGrupo) ? v.linkGrupo : "" };
    })
    .sort((a, c) => a.fecha.localeCompare(c.fecha));

  return NextResponse.json({
    primer: primerNombre(b.nombre),
    perfil: { nombre: b.nombre, cel: celOculto(b.cel), correo: b.correo || "", nivel: b.nivel || "", agencia: b.agencia || "", cert: b.cert || "", tallas: b.tallas || {} },
    proximos: lista.filter((y) => y.fecha >= hoy),
    anteriores: lista.filter((y) => y.fecha < hoy).reverse().slice(0, 12),
  });
}
