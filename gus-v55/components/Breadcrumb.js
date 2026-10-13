import Link from "next/link";

// Miga de pan + título de la página, todo en una sola línea (mismo
// patrón que la maqueta): las secciones "padre" se muestran como
// enlaces en negrita separados por ">" y, al final, la página actual
// resaltada en un azul más claro. Este componente YA incluye el <h1
// className="page-title">, así que las páginas que lo usan no deben
// poner su propio <h1> aparte.
// items: [{label, href}] — el último (o cualquiera sin href) es la
// página actual, sin link.
export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  const actual = items[items.length - 1];
  const padres = items.slice(0, -1);

  return (
    <h1 className="page-title breadcrumb-title">
      {padres.map((item, i) =>
        item.href ? (
          <span key={i}>
            <Link href={item.href} className="breadcrumb-crumb">
              {item.label}
            </Link>
            <span className="breadcrumb-sep">&gt;</span>
          </span>
        ) : (
          <span key={i}>
            <span className="breadcrumb-crumb">{item.label}</span>
            <span className="breadcrumb-sep">&gt;</span>
          </span>
        )
      )}
      <span className="breadcrumb-current">{actual.label}</span>
    </h1>
  );
}
