import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import PreferenciasApariencia from "@/components/PreferenciasApariencia";
import PersonalizarMenu from "@/components/PersonalizarMenu";
import { formatFecha } from "@/lib/format";
import PerfilForm from "./form-client";

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name, menu_personalizado")
    .eq("id", user.id)
    .single();

  // Mi actividad: solo lo que este usuario ha registrado (auth.uid()), no
  // el listado completo de Salidas/Tanques.
  const [{ data: misSalidas }, { data: misLlenados }] = await Promise.all([
    supabase
      .from("salidas")
      .select("id, folio, articulo, motivo, cantidad, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("llenados_tanques")
      .select("id, folio, tipo_gas, cantidad, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const actividad = [
    ...(misSalidas || []).map((s) => ({ ...s, tipo: "salida" })),
    ...(misLlenados || []).map((l) => ({ ...l, tipo: "llenado" })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Mi Perfil</h1>

        <div className="section-title" style={{ marginTop: 0 }}>
          Mi actividad
        </div>
        <p className="hint-text" style={{ marginTop: 0, marginBottom: 10 }}>
          Tus propias salidas y llenados registrados, sin tener que buscarlos en Salidas/Tanques.
        </p>
        <div className="card">
          {actividad.length > 0 ? (
            actividad.map((a) =>
              a.tipo === "salida" ? (
                <div className="list-item" key={`salida-${a.id}`}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <span className="folio-tag">#{a.folio}</span>
                      {a.articulo}
                      <span className="badge">{a.motivo}</span>
                    </span>
                    <span className="list-item-qty">{a.cantidad}</span>
                  </div>
                  <div className="list-item-meta">Salida · {formatFecha(a.created_at)}</div>
                </div>
              ) : (
                <div className="list-item" key={`llenado-${a.id}`}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <span className="folio-tag">#{a.folio}</span>
                      Llenado de tanque
                      <span className="badge">{a.tipo_gas}</span>
                    </span>
                    <span className="list-item-qty">{a.cantidad} tanque(s)</span>
                  </div>
                  <div className="list-item-meta">Llenado · {formatFecha(a.created_at)}</div>
                </div>
              )
            )
          ) : (
            <div className="empty">Todavía no has registrado ninguna salida ni llenado.</div>
          )}
        </div>

        <PerfilForm userId={user.id} nombreActual={perfil?.full_name || ""} correo={user.email} />

        <div className="section-title" style={{ marginTop: 26 }}>
          Apariencia
        </div>
        <PreferenciasApariencia />

        <div className="section-title" style={{ marginTop: 26 }}>
          Personalizar mi menú
        </div>
        <PersonalizarMenu
          menuInicial={
            perfil?.menu_personalizado || {
              llenados: true,
              inspeccion_visual: false,
              tanques_hub: false,
              mantenimiento_reguladores: false,
            }
          }
        />
      </div>
    </div>
  );
}
