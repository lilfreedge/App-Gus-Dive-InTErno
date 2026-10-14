// V31 — Seguimiento de avisos en "Clientes por contactar" (migration_60.sql).
//
// Reglas acordadas con el usuario (10/12-oct-2026):
// - cada "Notificar vía WhatsApp" queda anotado; la tarjeta dice
//   "Notificado N de 3";
// - después de un aviso, el cliente sale de los pendientes y no vuelve
//   hasta 15 días después;
// - al 3er aviso sin que venga, se descarta (sale de la lista);
// - los descartados vuelven a aparecer después de 1 año en "Sin venir +12
//   meses", conservando el historial de avisos anteriores;
// - si el cliente vuelve y se le registra una orden, el conteo se reinicia
//   (solo cuentan los avisos posteriores a su última orden).

export const MAX_AVISOS = 3;
export const DIAS_ENTRE_AVISOS = 15;
export const MESES_DESCARTADO = 12;

function masDias(iso, dias) {
  return new Date(new Date(iso).getTime() + dias * 86400000);
}

function masMeses(iso, meses) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + meses);
  return d;
}

// avisos: [{ id, created_at, nombre_usuario_snapshot, motivo }] de UN cliente.
// ultimaOrdenISO: created_at de su orden más reciente (o null).
// ahora: Date.
export function estadoAvisos(avisos, ultimaOrdenISO, ahora = new Date()) {
  const lista = (avisos || [])
    .filter((a) => !ultimaOrdenISO || a.created_at > ultimaOrdenISO)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  let ciclo = [];
  let anteriores = [];
  for (const a of lista) {
    if (ciclo.length >= MAX_AVISOS && new Date(a.created_at) >= masMeses(ciclo[ciclo.length - 1].created_at, MESES_DESCARTADO)) {
      anteriores = anteriores.concat(ciclo);
      ciclo = [];
    }
    ciclo.push(a);
  }

  let descartadoHasta = null;
  let reaparece = false;
  if (ciclo.length >= MAX_AVISOS) {
    const vuelve = masMeses(ciclo[ciclo.length - 1].created_at, MESES_DESCARTADO);
    if (ahora >= vuelve) {
      anteriores = anteriores.concat(ciclo);
      ciclo = [];
      reaparece = true;
    } else {
      descartadoHasta = vuelve;
    }
  }

  const ultimo = ciclo.length ? ciclo[ciclo.length - 1] : null;
  let esperandoHasta = null;
  if (ultimo && !descartadoHasta) {
    const hasta = masDias(ultimo.created_at, DIAS_ENTRE_AVISOS);
    if (ahora < hasta) esperandoHasta = hasta;
  }

  return {
    n: ciclo.length,
    ciclo,
    ultimo,
    anteriores,
    ultimoAnterior: anteriores.length ? anteriores[anteriores.length - 1] : null,
    descartadoHasta,
    esperandoHasta,
    reaparece,
  };
}
