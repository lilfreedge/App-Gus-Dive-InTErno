import Link from "next/link";

// V115 (maqueta V114, opción A + "también en la ficha"): aviso ámbar en una
// orden lista para entregar cuando al mismo cliente le falta otra orden que
// todavía no está lista. `faltan` sale de ordenesQueFaltan()
// (lib/ordenes-estado.js): [{ id, numero, donde }]. `grande` = versión de
// la ficha de la orden.
export default function AvisoOtraOrden({ faltan, grande = false }) {
  if (!faltan || faltan.length === 0) return null;

  const enlaces = faltan.map((o, i) => (
    <span key={o.id}>
      {i > 0 && (i === faltan.length - 1 ? " y " : ", ")}
      la{" "}
      <Link href={`/app-clientes/ordenes/${o.id}`} className="aviso-otra-link">
        No. {o.numero}
      </Link>{" "}
      ({o.donde})
    </span>
  ));

  if (grande) {
    const una = faltan.length === 1;
    return (
      <div className="aviso-otra-orden grande" role="note">
        <span className="aviso-otra-ic" aria-hidden="true">!</span>
        <div>
          <b>
            {una
              ? "Este cliente tiene otra orden que todavía no está lista."
              : `Este cliente tiene ${faltan.length} órdenes más que todavía no están listas.`}
          </b>
          <div>
            Le falta {enlaces}. Espera a que {una ? "esté lista" : "estén listas"} para avisarle que venga a buscar todo
            junto.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aviso-otra-orden" role="note">
      No contactar todavía: a este cliente le {faltan.length === 1 ? "falta" : "faltan"} {enlaces}.
    </div>
  );
}
