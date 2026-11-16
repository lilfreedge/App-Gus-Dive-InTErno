import LoadingLogo from "@/components/LoadingLogo";

// V69: loading screen de Alquiler (rojo, logo en blanco).
export default function Loading() {
  // V85: con el logo de franjas transparentes (en blanco).
  return <LoadingLogo fondo="#cd392a" blanco src="/logo-gus-franjas.png" />;
}
