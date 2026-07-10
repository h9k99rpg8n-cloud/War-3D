import { VERSION_JUEGO, VERSION_THREE } from "../configuracion.js";

export function obtenerInterfaz() {
  return {
    juego: document.querySelector("#game"),
    pantallaInicio: document.querySelector("#start-screen"),
    formularioMundo: document.querySelector("#world-form"),
    nombreMundo: document.querySelector("#world-name"),
    canvas: document.querySelector("#game-canvas"),
    carga: document.querySelector("#loading"),
    textoCarga: document.querySelector("#loading-text"),
    panelError: document.querySelector("#error-panel"),
    mensajeError: document.querySelector("#error-message"),
    insigniaVersion: document.querySelector("#version-badge"),
    joystick: document.querySelector("#joystick"),
    perillaJoystick: document.querySelector("#joystick-knob"),
    zonaMirada: document.querySelector("#look-zone"),
    progresoRotura: document.querySelector("#break-progress"),
    etiquetaRotura: document.querySelector("#break-progress-label"),
    rellenoRotura: document.querySelector("#break-progress-fill"),
    barraInventario: document.querySelector("#inventory-bar"),
    espacioPasto: document.querySelector("#grass-slot"),
    contadorPasto: document.querySelector("#grass-count"),
    espacioHojas: document.querySelector("#leaves-slot"),
    contadorHojas: document.querySelector("#leaves-count"),
    espacioMadera: document.querySelector("#wood-slot"),
    contadorMadera: document.querySelector("#wood-count"),
    botonColocar: document.querySelector("#place-block"),
    mensajeAccion: document.querySelector("#action-message"),
  };
}

export function prepararInterfaz(interfaz) {
  interfaz.insigniaVersion.textContent = `v${VERSION_JUEGO} • THREE ${VERSION_THREE}`;
}

export function esperarCreacionMundo(interfaz) {
  return new Promise((resolve) => {
    interfaz.formularioMundo.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        const nombre = interfaz.nombreMundo.value.trim() || "Mi mundo";
        document.title = `War 3D — ${nombre}`;
        resolve(nombre.slice(0, 24));
      },
      { once: true },
    );
  });
}

export async function mostrarCargaMundo(interfaz, nombre) {
  interfaz.textoCarga.textContent = `Generando ${nombre}…`;
  interfaz.carga.hidden = false;
  interfaz.pantallaInicio.classList.add("is-leaving");
  await new Promise((resolve) => window.setTimeout(resolve, 280));
  interfaz.pantallaInicio.hidden = true;
}

export function ocultarCarga(interfaz) {
  requestAnimationFrame(() => {
    interfaz.carga.classList.add("is-leaving");
    window.setTimeout(() => {
      interfaz.carga.hidden = true;
    }, 460);
  });
}

export function mostrarError(interfaz, mensaje) {
  interfaz.carga.hidden = true;
  interfaz.panelError.hidden = false;
  interfaz.mensajeError.textContent = mensaje;
}
