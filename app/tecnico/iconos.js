// V38 -- Íconos grandes del menú del técnico (los mismos de la maqueta).
function Base({ size = 22, children, fill = "none" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ICheck = (p) => (
  <Base {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Base>
);
export const IPlus = (p) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const IX = (p) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);
export const IFlecha = (p) => (
  <Base {...p}>
    <path d="M9 6l6 6-6 6" />
  </Base>
);
export const IAbajo = (p) => (
  <Base {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);
export const IMic = (p) => (
  <Base {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Base>
);
export const IDoc = (p) => (
  <Base {...p}>
    <path d="M7 3h7l4 4v14H7z" />
    <path d="M14 3v4h4M9.5 12h5M9.5 16h5" />
  </Base>
);
export const ILlave = (p) => (
  <Base {...p}>
    <path d="M14.5 6.5a4 4 0 0 0 5 5l-8 8a2.1 2.1 0 0 1-3-3l8-8a4 4 0 0 0-2-2z" />
  </Base>
);
export const IComp = (p) => (
  <Base {...p}>
    <rect x="3" y="9" width="13" height="9" rx="2" />
    <circle cx="19" cy="9" r="2.5" />
    <path d="M6 18v2M13 18v2M8 13h5" />
  </Base>
);
export const IReg = (p) => (
  <Base {...p}>
    <circle cx="9" cy="9" r="5" />
    <path d="M13 13l7 7M9 6.5v5M6.5 9h5" />
  </Base>
);
export const ICam = (p) => (
  <Base {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Base>
);
export const ILock = (p) => (
  <Base {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Base>
);
export const IAlarma = (p) => (
  <Base {...p}>
    <circle cx="12" cy="13" r="7" />
    <path d="M12 9.5V13l2.5 1.5M5 4L3 6M19 4l2 2" />
  </Base>
);
export function IPausa({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </svg>
  );
}
