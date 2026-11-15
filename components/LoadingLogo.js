// Componente reutilizable para las pantallas de carga (loading.js) de cada
// ruta. Muestra el ícono chico de Gus centrado, con una animación sutil de
// pulso, mientras Next.js prepara los datos del server component.
// V69: el mismo diseño para cada app, con su color (fondo) y, si hace falta,
// el logo en blanco (filtro) para que se vea sobre un fondo de color fuerte.
// Sin props, sigue igual que siempre (navy, logo rojo y blanco): App Interno
// y App Equipos de clientes.
// V85: `src` para usar otro logo (Control Estudiantes usa el suyo).
export default function LoadingLogo({ fondo, blanco, src = "/logo-gus-icon.png" }) {
  return (
    <div className="loading-logo-wrap" style={fondo ? { background: fondo } : undefined}>
      <img src={src} alt="Cargando" className="loading-logo-icon" style={blanco ? { filter: "brightness(0) invert(1)" } : undefined} />
    </div>
  );
}
