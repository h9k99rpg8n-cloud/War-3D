import {
  VERSION_JUEGO,
  VERSION_RAPIER,
  VERSION_THREE,
} from "../configuracion.js";

export function obtenerInterfaz() {
  return {
    juego: document.querySelector("#game"),
    pantallaInicio: document.querySelector("#start-screen"),
    vistaPortada: document.querySelector("#launcher-cover"),
    vistaMundos: document.querySelector("#launcher-worlds"),
    vistaCrearMundo: document.querySelector("#launcher-create"),
    tituloAnimado: document.querySelector("#animated-title"),
    botonJugar: document.querySelector("#play-button"),
    botonVolverPortada: document.querySelector("#back-to-cover"),
    botonVolverMundos: document.querySelector("#back-to-worlds"),
    botonesCrearMundo: [
      document.querySelector("#create-first-world"),
      document.querySelector("#create-world-list"),
    ],
    botonCrearMundoLista: document.querySelector("#create-world-list"),
    listaMundos: document.querySelector("#world-list"),
    estadoVacio: document.querySelector("#empty-worlds"),
    estadoLanzador: document.querySelector("#launcher-status"),
    formularioMundo: document.querySelector("#world-form"),
    nombreMundo: document.querySelector("#world-name"),
    contadorNombre: document.querySelector("#world-name-count"),
    campoDificultad: document.querySelector("#difficulty-field"),
    opcionMundoPlano: document.querySelector("#flat-world-option"),
    mundoPlano: document.querySelector("#flat-world"),
    notaMundoPlano: document.querySelector("#flat-world-note"),
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
    espaciosInventario: [
      ...document.querySelectorAll("#inventory-bar .inventory-slot"),
    ],
    botonInventario: document.querySelector("#inventory-button"),
    insigniaInventario: document.querySelector("#inventory-badge"),
    panelInventario: document.querySelector("#inventory-panel"),
    cerrarInventario: document.querySelector("#inventory-close"),
    ordenarInventario: document.querySelector("#inventory-sort"),
    rejillaMochila: document.querySelector("#inventory-storage-grid"),
    rejillaAccesoRapido: document.querySelector("#inventory-panel-hotbar"),
    seccionCatalogoInventario: document.querySelector("#inventory-creative-section"),
    listaCatalogoInventario: document.querySelector("#inventory-catalog-list"),
    iconoInventarioSeleccionado: document.querySelector("#inventory-selected-icon"),
    nombreInventarioSeleccionado: document.querySelector("#inventory-selected-name"),
    metaInventarioSeleccionado: document.querySelector("#inventory-selected-meta"),
    resumenInventario: document.querySelector("#inventory-summary"),
    botonColocar: document.querySelector("#place-block"),
    etiquetaColocar: document.querySelector("#place-label"),
    botonSaltar: document.querySelector("#jump-button"),
    etiquetaSalto: document.querySelector("#jump-label"),
    botonVuelo: document.querySelector("#flight-button"),
    botonDescender: document.querySelector("#descend-button"),
    mensajeAccion: document.querySelector("#action-message"),
    salud: document.querySelector("#health-hud"),
    corazones: [...document.querySelectorAll("#health-hud .heart")],
    etiquetaSalud: document.querySelector("#health-label"),
    destelloDano: document.querySelector("#damage-flash"),
    panelMuerte: document.querySelector("#death-panel"),
    botonReaparecer: document.querySelector("#respawn-button"),
    botonMenuJuego: document.querySelector("#game-menu-button"),
    menuJuego: document.querySelector("#game-options-menu"),
    botonSalirMundo: document.querySelector("#exit-world-button"),
    estadoGuardado: document.querySelector("#save-status"),
    nombreMundoActual: document.querySelector("#current-world-name"),
  };
}

export function prepararInterfaz(interfaz) {
  interfaz.insigniaVersion.textContent =
    `v${VERSION_JUEGO} • THREE ${VERSION_THREE} • RAPIER ${VERSION_RAPIER}`;
}

export async function mostrarCargaMundo(interfaz, opcionesMundo) {
  const tamanoMundo = [64, 96, 128].includes(Number(opcionesMundo.tamanoMundo))
    ? Number(opcionesMundo.tamanoMundo)
    : 128;
  interfaz.textoCarga.textContent =
    `${opcionesMundo.progreso ? "Abriendo" : "Generando"} ${opcionesMundo.nombreMundo} · ${tamanoMundo}×${tamanoMundo}…`;
  interfaz.carga.hidden = false;
  interfaz.carga.classList.remove("is-leaving");
  interfaz.carga.dataset.origen = opcionesMundo.progreso ? "guardado" : "nuevo";
  // Fuerza que la capa de carga se pinte antes de retirar el lanzador.
  // Así nunca asoma la tarjeta anterior al abrir un mundo guardado.
  void interfaz.carga.offsetWidth;
  await new Promise((resolve) => requestAnimationFrame(resolve));
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
