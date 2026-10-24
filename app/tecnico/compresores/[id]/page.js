import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderSimple from "@/components/HeaderSimple";
import { ultimosHorometros } from "@/lib/compresores";
import { quienEs, accesosDe, primerNombre, sufijoComo, enlacesMenu } from "../../datos";
import CompresorPasos from "./form-client";

// V38 -- Registrar el mantenimiento de un compresor, en pasos y con botones
// grandes (maqueta-v38-3.html, A6). Guarda lo mismo que el formulario de
// siempre (app/equipos/compresores/mantenimiento/nueva).
export default async function TecnicoCompresorPage({ params, searchParams }) {
  const supabase = createClient();
  const { user, yo, persona, viendoComo } = await quienEs(supabase, searchParams?.como);
  if (!persona) redirect("/tecnico");
  const accesos = accesosDe(persona);
  const sufijo = sufijoComo(viendoComo, persona);
  if (!accesos.registrarCompresor) redirect(`/tecnico${sufijo}`);

  const [{ data: compresor }, { data: horometros }] = await Promise.all([
    supabase.from("compresores").select("id, codigo, descripcion, marca, modelo, activo").eq("id", params.id).maybeSingle(),
    supabase
      .from("mantenimientos_compresores")
      .select("compresor_id, horometro, fecha")
      .eq("compresor_id", params.id)
      .order("horometro", { ascending: false })
      .limit(1),
  ]);
  if (!compresor) notFound();

  const ultimo = ultimosHorometros(horometros || [])[compresor.id] || null;
  const tipoInicial = ["Inspección", "Mantenimiento preventivo", "Mantenimiento correctivo"].includes(searchParams?.tipo)
    ? searchParams.tipo
    : "";

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
        <Link href={`/tecnico/compresores${sufijo}`} className="tec-volver">
          ← Volver
        </Link>
        <CompresorPasos
          userId={user.id}
          nombreUsuario={yo.full_name || user.email}
          nombrePersona={persona.full_name || ""}
          compresor={compresor}
          ultimo={ultimo}
          tipoInicial={tipoInicial}
          esTitular={!!yo.es_titular}
          lecturaDisponible={!!process.env.ANTHROPIC_API_KEY}
          volverA={`/tecnico${sufijo}`}
        />
      </div>
    </div>
  );
}
