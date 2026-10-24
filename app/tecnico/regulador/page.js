import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderSimple from "@/components/HeaderSimple";
import { quienEs, accesosDe, primerNombre, sufijoComo, enlacesMenu } from "../datos";
import ReguladorPasos from "./form-client";

// V38 -- Mantenimiento de un regulador de la tienda (alquiler), en pasos y
// con botones grandes (maqueta-v38-3.html, A7). Guarda lo mismo que el
// formulario de siempre (app/equipos/mantenimiento-reguladores/nueva).
export default async function TecnicoReguladorPage({ searchParams }) {
  const supabase = createClient();
  const { user, yo, persona, viendoComo } = await quienEs(supabase, searchParams?.como);
  if (!persona) redirect("/tecnico");
  const accesos = accesosDe(persona);
  const sufijo = sufijoComo(viendoComo, persona);
  if (!accesos.reguladores) redirect(`/tecnico${sufijo}`);

  const { data: reguladores } = await supabase
    .from("reguladores_alquiler")
    .select("id, codigo, descripcion")
    .eq("activo", true)
    .order("codigo");

  return (
    <div>
      <HeaderSimple
        nombre={primerNombre(yo.full_name)}
        sinBarra
        esTitular={!!yo.es_titular}
        enlaces={enlacesMenu(yo)}
        inicio={`/tecnico${sufijoComo(viendoComo, persona)}`}
      />
      <div className="page tec" style={{ paddingTop: 12 }}>
        <Link href={`/tecnico${sufijo}`} className="tec-volver">
          ← Volver
        </Link>
        <ReguladorPasos
          userId={user.id}
          nombreUsuario={yo.full_name || user.email}
          reguladores={reguladores || []}
          volverA={`/tecnico${sufijo}`}
        />
      </div>
    </div>
  );
}
