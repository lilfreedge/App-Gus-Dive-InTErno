"use client";

import { IconCamera } from "./icons";

// Campo de foto reutilizable (Compresores, migración 14): un input de
// archivo con cámara habilitada en móvil (capture="environment") que
// solo guarda el File en memoria -- la subida real a Storage pasa al
// enviar el formulario completo (ver lib/storage-client.js).
export default function CampoFoto({ id, label, file, onChange, required }) {
  return (
    <div>
      <label htmlFor={id} style={{ marginBottom: 6 }}>
        {label} {required && <span className="req">*</span>}
      </label>
      <label htmlFor={id} className="campo-foto-btn">
        <IconCamera size={16} />
        {file ? "Cambiar foto" : "Adjuntar foto"}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {file && <div className="hint-text" style={{ marginTop: 4, marginBottom: 0 }}>✓ {file.name}</div>}
    </div>
  );
}
