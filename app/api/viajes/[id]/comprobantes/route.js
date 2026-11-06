import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import { filaAViaje, filaAIns, filaABuzo } from "@/lib/viajes/datos";
import { permisosViajes, pagoEnDop, rd, fechaCorta } from "@/lib/viajes/modelo";
import { armarZip } from "@/lib/zip-simple";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V61 ("208. sí", nota del 2-nov: "exportar los comprobantes de pagos + el
// nombre del buzo, para enviarle al área de contabilidad"): un .zip con cada
// comprobante nombrado "Nombre del buzo - monto - fecha" y una lista en Excel.
const limpio = (t) => String(t || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

export async function GET(request, { params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const p = permisosViajes(profile);
  if (!p.pagos && !p.conciliar) return new Response("No autorizado", { status: 403 });

  const { data: vrow } = await supabase.from("viajes").select("*").eq("id", params.id).maybeSingle();
  if (!vrow) return new Response("Buceo no encontrado", { status: 404 });
  const v = filaAViaje(vrow);
  const { data: insRows } = await supabase.from("viajes_inscripciones").select("*").eq("viaje_id", v.id);
  const ins = (insRows || []).map(filaAIns).filter((x) => x.estado !== "quitado");
  const ids = [...new Set(ins.map((x) => x.buzoId))];
  const { data: buzoRows } = ids.length ? await supabase.from("viajes_buzos").select("*").in("id", ids) : { data: [] };
  const buzos = (buzoRows || []).map(filaABuzo);

  const archivos = [];
  const pagos = [];
  const comprobantes = [];
  const usados = new Set();
  for (const x of ins) {
    const b = buzos.find((y) => y.id === x.buzoId);
    const nombre = b?.nombre || "Sin nombre";
    const pagado = (x.pagos || []).reduce((a, pg) => a + pagoEnDop(v, pg), 0);
    for (const pg of x.pagos || []) {
      pagos.push({ Buzo: nombre, "Monto (RD$)": pagoEnDop(v, pg), Cuenta: pg.cuenta || "", Fecha: pg.fecha || "", Conciliado: pg.conciliado ? "Sí" : "No", Nota: pg.nota || "" });
    }
    for (const c of x.comprobantes || []) {
      if (!c.path) continue;
      const { data: blob } = await supabase.storage.from("viajes-comprobantes").download(c.path);
      if (!blob) continue;
      const ext = (String(c.nombre || c.path).split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const base = limpio(`${nombre} - ${pagado ? rd(pagado) : "sin pago registrado"} - ${c.fecha ? fechaCorta(c.fecha) : ""}`);
      let nom = `${base}.${ext}`;
      let n = 2;
      while (usados.has(nom)) nom = `${base} (${n++}).${ext}`;
      usados.add(nom);
      archivos.push({ nombre: nom, datos: Buffer.from(await blob.arrayBuffer()) });
      comprobantes.push({ Buzo: nombre, "Pagado (RD$)": pagado, "Subido el": c.fecha || "", "Lo subió": c.por === "Link" ? "El buzo" : c.por || "", Archivo: nom });
    }
  }
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(pagos.length ? pagos : [{ Buzo: "No hay pagos registrados" }]), "Pagos");
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(comprobantes.length ? comprobantes : [{ Buzo: "No hay comprobantes" }]), "Comprobantes");
  archivos.unshift({ nombre: `Lista de pagos - ${limpio(v.nombre)} ${v.fecha}.xlsx`, datos: Buffer.from(XLSX.write(libro, { type: "buffer", bookType: "xlsx" })) });

  const zip = armarZip(archivos);
  const nombreZip = `Comprobantes ${limpio(v.nombre)} ${v.fecha}.zip`;
  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="comprobantes-${v.fecha}.zip"; filename*=UTF-8''${encodeURIComponent(nombreZip)}`,
      "Cache-Control": "no-store",
    },
  });
}
