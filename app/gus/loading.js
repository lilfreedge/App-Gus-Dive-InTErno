import LoadingLogo from "@/components/LoadingLogo";

// V84 (pedido explícito: "hace falta loading screen en el app de Gus Dive"): fondo blanco, como el del app al abrirse.
export default function Loading() {
  return <LoadingLogo fondo="#ffffff" />;
}
