// V81 -- "App Gus": una sola app para los clientes (estudiantes, buzos e
// interesados), maqueta V82 aprobada ("1. app gus", "2. ok"). Pedido
// explícito: "¿hay manera de que la gente pueda poner su cédula una vez y que
// quede guardado para siempre? y que arriba le diga 'hola fulano'".
//
// Se guarda en ESE celular (en el navegador de la persona, no en nuestra
// base): su documento, su celular y su primer nombre. Con eso la app entra
// sola, saluda por su nombre y llena la cédula en los links de cursos y
// buceos. "Salir" lo borra. Si un día el celular ya no coincide con el que
// tenemos, la app lo olvida y vuelve a pedirlo.
const CLAVE = "app-gus-persona";
const AHORA_NO = "app-gus-ahora-no";

export function leerPersona() {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE) || "null");
    return x && x.doc && x.cel ? x : null;
  } catch {
    return null;
  }
}
export function guardarPersona({ tipoDoc, doc, cel, primer }) {
  try {
    if (!doc || !cel) return;
    localStorage.setItem(CLAVE, JSON.stringify({ tipoDoc: tipoDoc === "pasaporte" ? "pasaporte" : "cedula", doc, cel, primer: primer || "" }));
  } catch {}
}
export function olvidarPersona() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {}
}
// ¿Ya está abierta como app (desde la pantalla de inicio)?
export function enApp() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}
export function dijoAhoraNo() {
  try {
    return localStorage.getItem(AHORA_NO) === "1";
  } catch {
    return false;
  }
}
export function marcarAhoraNo() {
  try {
    localStorage.setItem(AHORA_NO, "1");
  } catch {}
}
