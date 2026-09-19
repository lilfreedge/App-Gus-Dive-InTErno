import Link from "next/link";

// Tabs compartidos entre las tres secciones del Catálogo (Códigos,
// Reguladores de alquiler, Tanques de alquiler) para poder saltar entre
// ellas desde cualquiera de las tres páginas.
const TABS = [
  { href: "/catalogo", label: "Códigos" },
  { href: "/catalogo/reguladores", label: "Reguladores" },
  { href: "/catalogo/tanques", label: "Tanques" },
];

export default function CatalogoTabs({ activo }) {
  return (
    <div className="period-toggle" style={{ marginBottom: 20 }}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`period-btn ${activo === tab.href ? "period-btn-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
