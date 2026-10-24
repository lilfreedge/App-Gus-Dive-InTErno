// V37 -- Recordatorios de compresores (pedido explícito: "ponme opción para
// mí y administradores para poder crear notificaciones en la sección de
// compresores... como una notificación de inspección cada 20 días y que
// estas notificaciones le salgan a los usuarios que uno marque";
// plan-v37.html 2C, aprobado). El aviso de inspección cada 14 días que ya
// tenía el app pasa a ser el primer recordatorio (migration_70.sql).
//
// Cada recordatorio dice qué hay que hacer, cada cuánto (días u horas del
// horómetro), a qué compresores (todos, algunos o ninguno), con qué se
// reinicia (al registrar ese tipo de mantenimiento, o con el botón
// "Hecho") y a quién le sale.

export const TIPOS_REINICIO = ["Inspección", "Mantenimiento preventivo", "Mantenimiento correctivo"];

const DIA_MS = 24 * 60 * 60 * 1000;

// Fecha (aaaa-mm-dd) en República Dominicana de un timestamp.
export function fechaRD(ts) {
  if (!ts) return null;
  return new Date(new Date(ts).getTime() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function masDias(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
}

function diasEntre(desdeIso, hastaIso) {
  return Math.round((Date.parse(`${hastaIso}T00:00:00Z`) - Date.parse(`${desdeIso}T00:00:00Z`)) / DIA_MS);
}

export function textoCada(r) {
  return `Cada ${r.cada} ${r.unidad === "horas" ? "horas del horómetro" : r.cada === 1 ? "día" : "días"}`;
}

export function textoReinicio(r) {
  return r.reinicia === "hecho" ? 'cuando alguien toca "Hecho"' : `al registrar ${r.reinicia === "Inspección" ? "una" : "un"} ${r.reinicia}`;
}

export function textoCompresores(r, compresores = []) {
  if (r.compresor_ids === null || r.compresor_ids === undefined) return "Todos los compresores";
  if (r.compresor_ids.length === 0) return "Sin compresor";
  const codigos = r.compresor_ids
    .map((id) => compresores.find((c) => c.id === id)?.codigo)
    .filter(Boolean)
    .sort();
  return codigos.length ? codigos.join(", ") : "—";
}

// Calcula, para cada recordatorio y cada compresor al que aplica, cuándo
// toca y si está vencido, por vencer ("pronto") o bien.
//   recordatorios: filas de recordatorios_compresores (solo las activas cuentan)
//   compresores:   [{ id, codigo, activo }]
//   mantenimientos:[{ compresor_id, tipo_mantenimiento, fecha, horometro }]
//   hechos:        [{ recordatorio_id, compresor_id, hecho_en }]
//   hoy:           "aaaa-mm-dd"
export function calcularRecordatorios({ recordatorios = [], compresores = [], mantenimientos = [], hechos = [], hoy }) {
  const activos = compresores.filter((c) => c.activo !== false);
  const porCompresor = {};
  for (const m of mantenimientos) {
    if (!m.compresor_id) continue;
    (porCompresor[m.compresor_id] ||= []).push(m);
  }
  const horometroActual = (cid) => {
    const lista = porCompresor[cid] || [];
    if (!lista.length) return null;
    return Math.max(...lista.map((m) => Number(m.horometro) || 0));
  };
  // Horómetro que tenía el compresor en una fecha (el más alto registrado hasta ese día).
  const horometroAl = (cid, iso) => {
    const lista = (porCompresor[cid] || []).filter((m) => m.fecha <= iso);
    if (!lista.length) return null;
    return Math.max(...lista.map((m) => Number(m.horometro) || 0));
  };

  const items = [];
  for (const r of recordatorios) {
    if (r.activo === false) continue;
    let destinos;
    if (r.compresor_ids === null || r.compresor_ids === undefined) destinos = activos;
    else if (r.compresor_ids.length === 0) destinos = [null];
    else destinos = activos.filter((c) => r.compresor_ids.includes(c.id));

    const creado = fechaRD(r.created_at) || hoy;

    for (const c of destinos) {
      const cid = c?.id || null;
      // Último evento que lo reinicia.
      let ultimo = null; // { fecha, horometro }
      if (r.reinicia === "hecho") {
        const hs = hechos.filter((h) => h.recordatorio_id === r.id && (h.compresor_id || null) === cid);
        for (const h of hs) {
          const f = fechaRD(h.hecho_en);
          if (!ultimo || f > ultimo.fecha) ultimo = { fecha: f, horometro: cid ? horometroAl(cid, f) : null };
        }
      } else if (cid) {
        for (const m of porCompresor[cid] || []) {
          if (m.tipo_mantenimiento !== r.reinicia) continue;
          if (!ultimo || m.fecha > ultimo.fecha || (m.fecha === ultimo.fecha && Number(m.horometro) > ultimo.horometro)) {
            ultimo = { fecha: m.fecha, horometro: Number(m.horometro) };
          }
        }
      }

      const item = { recordatorio: r, compresor: c, ultimo, nunca: !ultimo };

      if (r.unidad === "horas") {
        if (!cid) continue; // por horas solo tiene sentido con compresor
        const actual = horometroActual(cid);
        let base = ultimo?.horometro ?? null;
        if (base === null) {
          base = horometroAl(cid, creado);
          if (base === null) {
            const despues = (porCompresor[cid] || []).map((m) => Number(m.horometro) || 0);
            base = despues.length ? Math.min(...despues) : null;
          }
        }
        if (base === null || actual === null) {
          items.push({ ...item, estado: "sin_datos", texto: "Todavía no tiene horómetro registrado" });
          continue;
        }
        const toca = base + r.cada;
        const faltan = Math.round((toca - actual) * 10) / 10;
        item.tocaHoras = toca;
        item.faltanHoras = faltan;
        item.estado = faltan < 0 ? "vencido" : faltan <= r.avisar_antes ? "pronto" : "ok";
        item.texto =
          faltan < 0
            ? `pasado por ${Math.abs(faltan)} h (tocaba a las ${toca} h)`
            : faltan === 0
              ? `toca ahora (${toca} h)`
              : `en ${faltan} h (a las ${toca} h)`;
        items.push(item);
        continue;
      }

      // Por días.
      if (!ultimo && r.reinicia !== "hecho") {
        // Nunca se ha registrado ese mantenimiento: va como vencido (igual
        // que antes salía "Nunca inspeccionado").
        items.push({ ...item, estado: "vencido", proxima: null, texto: "nunca registrado" });
        continue;
      }
      const base = ultimo?.fecha || creado;
      const proxima = masDias(base, r.cada);
      const faltan = diasEntre(hoy, proxima);
      item.proxima = proxima;
      item.faltanDias = faltan;
      item.estado = faltan < 0 ? "vencido" : faltan <= r.avisar_antes ? "pronto" : "ok";
      items.push(item);
    }
  }

  const orden = { vencido: 0, pronto: 1, ok: 2, sin_datos: 3 };
  items.sort((a, b) => {
    const e = orden[a.estado] - orden[b.estado];
    if (e) return e;
    const pa = a.proxima || "";
    const pb = b.proxima || "";
    if (pa !== pb) return pa < pb ? -1 : 1;
    return (a.compresor?.codigo || "").localeCompare(b.compresor?.codigo || "");
  });
  return items;
}

// Trae lo necesario y calcula. Si `usuarioId` viene, solo los
// recordatorios que le salen a esa persona. Si la tabla todavía no existe
// (falta correr migration_70.sql), devuelve una lista vacía.
export async function cargarRecordatorios(supabase, { usuarioId = null, hoy }) {
  let q = supabase.from("recordatorios_compresores").select("*").eq("activo", true).order("created_at");
  if (usuarioId) q = q.contains("usuario_ids", [usuarioId]);
  const { data: recordatorios, error } = await q;
  if (error || !recordatorios || recordatorios.length === 0) return { items: [], recordatorios: [], error };

  const [{ data: compresores }, { data: mantenimientos }, { data: hechos }] = await Promise.all([
    supabase.from("compresores").select("id, codigo, activo").order("codigo"),
    supabase
      .from("mantenimientos_compresores")
      .select("compresor_id, tipo_mantenimiento, fecha, horometro")
      .order("fecha", { ascending: false })
      .limit(5000),
    supabase
      .from("recordatorios_hechos")
      .select("recordatorio_id, compresor_id, hecho_en")
      .in("recordatorio_id", recordatorios.map((r) => r.id))
      .order("hecho_en", { ascending: false })
      .limit(2000),
  ]);

  const items = calcularRecordatorios({
    recordatorios,
    compresores: compresores || [],
    mantenimientos: mantenimientos || [],
    hechos: hechos || [],
    hoy,
  });
  return { items, recordatorios, compresores: compresores || [] };
}

// Texto corto de una línea: "Inspección · 01 — vence 06/11/2026".
export function lineaRecordatorio(item, formatFecha) {
  const r = item.recordatorio;
  const quien = item.compresor ? ` · ${item.compresor.codigo}` : "";
  let cuando;
  if (r.unidad === "horas") cuando = item.texto;
  else if (item.nunca && r.reinicia !== "hecho") cuando = "nunca registrado";
  else if (item.faltanDias < 0) cuando = `vencido desde ${formatFecha(item.proxima)}`;
  else if (item.faltanDias === 0) cuando = "toca hoy";
  else cuando = `toca el ${formatFecha(item.proxima)}`;
  return `${r.titulo}${quien} — ${cuando}`;
}

// "Próxima inspección" de un compresor según los recordatorios que se
// reinician con una Inspección (el de cada 14 días u otro). Si hay varios,
// el que toca primero. null si no hay ninguno que aplique.
export function proximaInspeccionDe(items, compresorId) {
  const delCompresor = (items || []).filter(
    (it) =>
      it.compresor?.id === compresorId &&
      it.recordatorio.reinicia === "Inspección" &&
      it.recordatorio.unidad !== "horas"
  );
  if (!delCompresor.length) return null;
  const nunca = delCompresor.find((it) => it.nunca);
  if (nunca) return { nunca: true, proxima: null, estado: "vencido" };
  delCompresor.sort((a, b) => (a.proxima < b.proxima ? -1 : 1));
  return { nunca: false, proxima: delCompresor[0].proxima, estado: delCompresor[0].estado };
}
