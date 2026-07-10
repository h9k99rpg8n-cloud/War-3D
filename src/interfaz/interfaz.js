import { VERSION_JUEGO, VERSION_THREE } from "../configuracion.js";

export function obtenerInterfaz() {
  return {
    juego: document.querySelector("#game"),
    canvas: document.querySelector("#game-canvas"),
    carga: document.querySelector("#loading"),
    textoCarga: document.querySelector("#loading-text"),
    panelError: document.querySelector("#error-panel"),
    mensajeError: document.querySelector("#error-message"),
    insigniaVersion: document.querySelector("#version-badge"),
    joystick: document.querySelector("#joystick"),
    perillaJoystick: document.querySelector("#joystick-knob"),
    zonaMirada: document.querySelector("#look-zone"),
  };
}

export function prepararInterfaz(interfaz) {
  interfaz.insigniaVersion.textContent = `v${VERSION_JUEGO} • THREE ${VERSION_THREE}`;
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
