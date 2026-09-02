"use client";

import Image from "next/image";
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
          <Image
            src="/logo-gus-icon.png"
            alt="Gus Dive"
            width={64}
            height={22}
            className="topbar-logo"
            priority
          />
          <div className="topbar-sub">Hola, {nombre}</div>
        </div>
        <button className="btn-link" onClick={salir}>
          Salir
        </button>
      </div>
    </div>
  );
}
