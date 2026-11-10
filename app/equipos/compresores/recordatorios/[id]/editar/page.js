import { redirect } from "next/navigation";

// V63 ("230"): ahora en Equipos › Recordatorios.
export default function EditarRecordatorioCompresorPage({ params }) {
  redirect(`/equipos/recordatorios/${params.id}/editar`);
}
