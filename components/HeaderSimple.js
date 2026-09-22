// Header liviano para pantallas fuera de "un espacio" (selector de espacio,
// placeholder de App Clientes) -- mismo look navy que el topbar normal
// (components/TopbarClient.js), pero sin el nav de pestañas ni el menú de
// ajustes, porque todavía no se ha elegido en qué espacio se está.
export default function HeaderSimple({ nombre, etiqueta }) {
  return (
    <div className="topbar" style={{ paddingBottom: 14 }}>
      <div className="topbar-inner">
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: 0.5 }}>GUS APP</div>
          <div className="topbar-sub">Hola, {nombre}</div>
        </div>
      </div>
      {etiqueta && <div className="topbar-appname">{etiqueta}</div>}
    </div>
  );
}
