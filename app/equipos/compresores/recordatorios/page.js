import { redirect } from "next/navigation";

// V63 ("230"): los recordatorios ahora están todos juntos en Equipos ›
// Recordatorios (compresores, tanques, reguladores y otras cosas).
export default function RecordatoriosCompresoresPage() {
  redirect("/equipos/recordatorios");
}
