import LoadingLogo from "@/components/LoadingLogo";

// V84: también al entrar a Inicio de Alquiler.
export default function Loading() {
  // V85: con el logo de franjas transparentes (en blanco).
  return <LoadingLogo fondo="#cd392a" blanco src="/logo-gus-franjas.png" />;
}
