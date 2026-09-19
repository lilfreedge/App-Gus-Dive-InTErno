import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import ChangelogClient from "./changelog-client";

export default function ChangelogPage() {
  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Changelog</h1>

        <ChangelogClient />
      </div>
    </div>
  );
}
