import LoadingLogo from "@/components/LoadingLogo";

// V84: también al entrar a Inicio de Control Estudiantes (antes solo en las otras pantallas).
// V85: con el logo de Control Estudiantes (franjas transparentes).
export default function Loading() {
  return <LoadingLogo fondo="#f6ce46" src="/logo-gus-estudiantes-transparente.png" />;
}
