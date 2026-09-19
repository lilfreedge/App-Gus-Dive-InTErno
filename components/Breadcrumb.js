import Link from "next/link";

// Miga de pan simple: fila angosta arriba del <h1 className="page-title">.
// items: [{label, href}] — el último (o cualquiera sin href) se muestra
// como texto plano, sin link, para indicar la página actual.
export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div
      style={{
        fontSize: 13,
        color: "var(--texto-suave)",
        marginBottom: 8,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
      }}
    >
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span>›</span>}
          {item.href ? (
            <Link href={item.href} style={{ color: "var(--texto-suave)" }}>
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
