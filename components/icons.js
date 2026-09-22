// Íconos de línea simples (sin librería externa), en el color que herede del texto.

function Base({ children, size = 22, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconPackage(props) {
  return (
    <Base {...props}>
      <path d="M21 8L12 3 3 8v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </Base>
  );
}

export function IconTank(props) {
  return (
    <Base {...props}>
      <rect x="8" y="4" width="8" height="17" rx="4" />
      <path d="M10 4V2h4v2" />
      <path d="M8 9h8" />
    </Base>
  );
}

export function IconHistory(props) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4l3 2" />
    </Base>
  );
}

export function IconReport(props) {
  return (
    <Base {...props}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M15 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </Base>
  );
}

export function IconCatalog(props) {
  return (
    <Base {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2V5z" />
      <path d="M19 17H6a2 2 0 0 0-2 2" />
      <path d="M8 7h7" />
      <path d="M8 11h7" />
    </Base>
  );
}

export function IconUsers(props) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.2 3.2 0 0 1 0 6.2" />
      <path d="M18.5 20a6 6 0 0 0-3.5-8" />
    </Base>
  );
}

export function IconBook(props) {
  return (
    <Base {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7h7" />
      <path d="M9 11h7" />
    </Base>
  );
}

export function IconEdit(props) {
  return (
    <Base {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </Base>
  );
}

export function IconTrash(props) {
  return (
    <Base {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Base>
  );
}

export function IconPlus(props) {
  return (
    <Base {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Base>
  );
}

export function IconLogout(props) {
  return (
    <Base {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Base>
  );
}

export function IconArrowLeft(props) {
  return (
    <Base {...props}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </Base>
  );
}

export function IconArrowRight(props) {
  return (
    <Base {...props}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </Base>
  );
}

export function IconGear(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Base>
  );
}

export function IconSearch(props) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Base>
  );
}

export function IconAlert(props) {
  return (
    <Base {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9L2.6 18a1.5 1.5 0 0 0 1.3 2.3h16.2a1.5 1.5 0 0 0 1.3-2.3L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
    </Base>
  );
}

export function IconMinus(props) {
  return (
    <Base {...props}>
      <path d="M5 12h14" />
    </Base>
  );
}

// Tanque con una flecha entrando (llenado) -- distinto de IconTank, que es
// el tanque "genérico" (sin flecha) usado en Catálogo > Tanques.
export function IconTankFill(props) {
  return (
    <Base {...props}>
      <path d="M12 1v7" />
      <path d="M9 5l3 3 3-3" />
      <rect x="8" y="10" width="8" height="12" rx="3.5" />
      <path d="M8 14.5h8" />
    </Base>
  );
}

export function IconEye(props) {
  return (
    <Base {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function IconWrench(props) {
  return (
    <Base {...props}>
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z" />
    </Base>
  );
}

// Compresor: tanque horizontal ancho con dos patas de apoyo (sin
// manómetro -- versión simplificada a pedido, 2026-09-21).
export function IconCompressor(props) {
  return (
    <Base {...props}>
      <rect x="3" y="7" width="18" height="9" rx="4.5" />
      <path d="M8 16v3" />
      <path d="M16 16v3" />
    </Base>
  );
}

export function IconMail(props) {
  return (
    <Base {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 6.5l10 7 10-7" />
    </Base>
  );
}

export function IconReceipt(props) {
  return (
    <Base {...props}>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </Base>
  );
}

export function IconShuffle(props) {
  return (
    <Base {...props}>
      <path d="M3 6h4l7 12h4" />
      <path d="M14 6h4l1.5 2.5" />
      <path d="M3 18h4l3.2-5.5" />
      <path d="M17 3l3 3-3 3" />
      <path d="M17 15l3 3-3 3" />
    </Base>
  );
}
