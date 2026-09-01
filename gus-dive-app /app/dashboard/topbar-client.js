"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TopbarClient({ nombre }) {
  const router = useRouter();
  const supabase = createClient();

  async function salir() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div>
          <div className="topbar-title">🤿 Gus Dive</div>
          <div className="topbar-sub">Hola, {nombre}</div>
        </div>
        <button className="btn-link" onClick={salir}>
          Salir
        </button>
      </div>
    </div>
  );
}
