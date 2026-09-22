import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import ChangelogClient from "./changelog-client";

export default function ChangelogPage() {
  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Changelog" }]} />

        <ChangelogClient />
      </div>
    </div>
  );
}
