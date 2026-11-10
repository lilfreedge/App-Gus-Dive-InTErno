import { redirect } from "next/navigation";

// V63 ("230"): ahora en Equipos › Recordatorios.
export default function NuevoRecordatorioCompresorPage() {
  redirect("/equipos/recordatorios/nuevo");
}
