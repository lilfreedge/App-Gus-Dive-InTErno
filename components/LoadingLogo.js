// Componente reutilizable para las pantallas de carga (loading.js) de
// cada ruta. Muestra el ícono chico de Gus centrado, con una animación
// sutil de pulso, mientras Next.js prepara los datos del server component.
export default function LoadingLogo() {
  return (
    <div className="loading-logo-wrap">
      <img
        src="/logo-gus-icon.png"
        alt="Cargando"
        className="loading-logo-icon"
      />
    </div>
  );
}
