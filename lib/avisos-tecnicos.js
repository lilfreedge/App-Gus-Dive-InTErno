// V37 -- Avisos por WhatsApp a los técnicos (tabla avisos_tecnicos,
// migration_70.sql). Pedido explícito: "quiero poder ver los avisos que se
// le hacen a los técnicos... algo tipo bitácora" -- se ven en la Bitácora de
// órdenes (pestaña), en Registro de Órdenes y en la ficha del técnico.

// Último aviso que vale para cada orden: al técnico que la tiene ahora y
// después de que se la asignaron (si la reasignan, hay que volver a avisar).
// Devuelve { [ordenId]: { created_at, avisado_por_nombre } }. Si la tabla
// todavía no existe, {}.
export async function ultimosAvisos(supabase, ordenes) {
  const conTecnico = (ordenes || []).filter((o) => o.tecnico_asignado_id);
  if (!conTecnico.length) return {};
  const res = {};
  for (let i = 0; i < conTecnico.length; i += 150) {
    const lote = conTecnico.slice(i, i + 150);
    const { data, error } = await supabase
      .from("avisos_tecnicos")
      .select("orden_id, tecnico_id, created_at, avisado_por_nombre, medio")
      .in(
        "orden_id",
        lote.map((o) => o.id)
      )
      .order("created_at", { ascending: false });
    if (error) return {};
    for (const a of data || []) {
      const o = lote.find((x) => x.id === a.orden_id);
      if (!o || a.tecnico_id !== o.tecnico_asignado_id) continue;
      if (o.asignada_en && a.created_at < o.asignada_en) continue;
      if (!res[a.orden_id])
        res[a.orden_id] = { created_at: a.created_at, avisado_por_nombre: a.avisado_por_nombre, medio: a.medio };
    }
  }
  return res;
}

const ZONA = "America/Santo_Domingo";

export function horaRD(ts) {
  return new Intl.DateTimeFormat("es-DO", { timeZone: ZONA, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(ts))
    .replace(/\s/g, " ");
}

export function fechaHoraRD(ts) {
  const f = new Intl.DateTimeFormat("es-DO", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(ts)
  );
  return `${f} ${horaRD(ts)}`;
}

// V38: "en el grupo" (los avisos desde la V38) o "por WhatsApp" (los de
// antes, que iban al chat del técnico).
export function dondeAviso(medio) {
  return medio === "whatsapp_grupo" ? "en el grupo" : "por WhatsApp";
}

// "Avisado en el grupo 3:42 p. m." si fue hoy; si no, "Avisado en el grupo 22/10".
export function textoAvisado(ts, medio) {
  const dia = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(t));
  const donde = medio === "whatsapp_grupo" ? " en el grupo" : "";
  if (dia(ts) === dia(Date.now())) return `Avisado${donde} ${horaRD(ts)}`;
  const d = dia(ts);
  return `Avisado${donde} ${d.slice(8, 10)}/${d.slice(5, 7)}`;
}
