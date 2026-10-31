import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderSimple from "@/components/HeaderSimple";
import ManualesLista from "@/components/ManualesLista";
import { cargarManuales } from "@/lib/manuales-server";
import { quienEs, primerNombre, sufijoComo, enlacesMenu } from "../datos";

// V51 -- Los manuales en la pantalla del técnico ("El rol de técnico debe de
// tener acceso a estos manuales"): la tarjeta "Manuales" de su Inicio lleva
// aquí.
export default async function TecnicoManualesPage({ searchParams }) {
  const supabase = createClient();
  const { yo, persona, viendoComo } = await quienEs(supabase, searchParams?.como);
  if (!persona) redirect("/tecnico");
  const sufijo = sufijoComo(viendoComo, persona);
  const manuales = await cargarManuales(supabase);
  return (
    <div>
      <HeaderSimple nombre={primerNombre(yo.full_name)} sinBarra esTitular={!!yo.es_titular} enlaces={enlacesMenu(yo)} inicio={`/tecnico${sufijo}`} />
      <div className="page tec" style={{ paddingTop: 12 }}>
        <Link href={`/tecnico${sufijo}`} className="tec-volver">
          ← Volver
        </Link>
        <div className="tec-hola" style={{ marginBottom: 10 }}>
          Manuales
        </div>
        <ManualesLista manuales={manuales} desde="tecnico" grande />
      </div>
    </div>
  );
}
