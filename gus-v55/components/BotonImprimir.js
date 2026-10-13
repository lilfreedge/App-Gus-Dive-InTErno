"use client";

// Botón simple para imprimir/guardar como PDF la página actual (23-sep-2026,
// para Reportes de App Equipos de clientes). Usa el diálogo de impresión
// del navegador -- sin librería aparte.
export default function BotonImprimir() {
  return (
    <button className="btn secondary" type="button" onClick={() => window.print()} style={{ marginTop: 0 }}>
      Imprimir / Guardar PDF
    </button>
  );
}
