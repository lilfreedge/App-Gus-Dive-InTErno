import NavArrowsClientes from "./NavArrowsClientes";

// Wrapper de servidor (mismo patrón que NavArrowsServer.js de App
// Interno, para colocarlo igual en cada página). Por ahora no necesita
// resolver el perfil porque las 5 secciones de App Clientes son
// siempre visibles para cualquiera con acceso a la app -- se deja como
// componente de servidor aparte por si eso cambia más adelante.
export default function NavArrowsClientesServer() {
  return <NavArrowsClientes />;
}
