import {
  VERSION_JUEGO,
  VERSION_RAPIER,
  VERSION_THREE,
} from "../configuracion.js";
import { elegirConsejoCarga } from "./consejosCarga.js";

export function obtenerInterfaz() {
  return {
    juego: document.querySelector("#game"),
    pantallaInicio: document.querySelector("#start-screen"),
    vistaPortada: document.querySelector("#launcher-cover"),
    vistaMundos: document.querySelector("#launcher-worlds"),
    vistaCrearMundo: document.querySelector("#launcher-create"),
    vistaAjustesGlobales: document.querySelector("#launcher-settings"),
    tituloAnimado: document.querySelector("#animated-title"),
    botonJugar: document.querySelector("#play-button"),
    botonAjustesGlobales: document.querySelector("#launcher-settings-button"),
    botonVolverAjustesGlobales: document.querySelector("#launcher-settings-back"),
    pestanasAjustesGlobales: [
      ...document.querySelectorAll("[data-global-settings-tab]"),
    ],
    paginasAjustesGlobales: [
      ...document.querySelectorAll("[data-global-settings-page]"),
    ],
    vistasJoystickGlobales: [
      ...document.querySelectorAll("[data-joystick-preview]"),
    ],
    vistasRendimientoGlobales: [
      ...document.querySelectorAll("[data-performance-profile]"),
    ],
    resolucionGlobal: document.querySelector("#global-resolution"),
    valorResolucionGlobal: document.querySelector("#global-resolution-value"),
    resolucionDinamicaGlobal: document.querySelector("#global-dynamic-resolution"),
    limiteFpsGlobal: document.querySelector("#global-fps-limit"),
    controlesGrandesGlobal: document.querySelector("#global-large-controls"),
    volumenGlobal: document.querySelector("#global-volume"),
    valorVolumenGlobal: document.querySelector("#global-volume-value"),
    movimientoReducidoGlobal: document.querySelector("#global-reduced-motion"),
    modoDesarrolladorGlobal: document.querySelector("#global-developer-mode"),
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
    selectorPlantillaCampo: document.querySelector("#template-selector-field"),
    selectorPlantilla: document.querySelector("#world-template"),
    tituloPlantillaNormal: document.querySelector("#normal-template-title"),
    notaPlantillaNormal: document.querySelector("#normal-template-note"),
    consejoTamanoMundo: document.querySelector("#world-size-advice"),
    botonAjustesCreacion: document.querySelector("#creation-settings-button"),
    ajustesCreacion: document.querySelector("#creation-settings"),
    distanciaCargaCreacion: document.querySelector("#load-distance"),
    valorDistanciaCarga: document.querySelector("#load-distance-value"),
    avisoDistanciaCarga: document.querySelector("#load-distance-warning"),
    perfilRendimientoCreacion: document.querySelector("#performance-profile"),
    canvas: document.querySelector("#game-canvas"),
    carga: document.querySelector("#loading"),
    textoCarga: document.querySelector("#loading-text"),
    consejoCarga: document.querySelector("#loading-tip"),
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
    botonCrafteoInventario: document.querySelector("#inventory-crafting"),
    rejillaMochila: document.querySelector("#inventory-storage-grid"),
    rejillaAccesoRapido: document.querySelector("#inventory-panel-hotbar"),
    seccionCatalogoInventario: document.querySelector("#inventory-creative-section"),
    listaCatalogoInventario: document.querySelector("#inventory-catalog-list"),
    iconoInventarioSeleccionado: document.querySelector("#inventory-selected-icon"),
    nombreInventarioSeleccionado: document.querySelector("#inventory-selected-name"),
    metaInventarioSeleccionado: document.querySelector("#inventory-selected-meta"),
    resumenInventario: document.querySelector("#inventory-summary"),
    botonDividirInventario: document.querySelector("#inventory-split"),
    dialogoDividirStack: document.querySelector("#stack-split-dialog"),
    cantidadOriginalDivision: document.querySelector("#stack-split-original"),
    cantidadSeleccionadaDivision: document.querySelector("#stack-split-selected"),
    cantidadRestanteDivision: document.querySelector("#stack-split-remaining"),
    rangoDivision: document.querySelector("#stack-split-range"),
    reducirDivision: document.querySelector("#stack-split-less"),
    aumentarDivision: document.querySelector("#stack-split-more"),
    cancelarDivision: document.querySelector("#stack-split-cancel"),
    confirmarDivision: document.querySelector("#stack-split-confirm"),
    mensajeDivision: document.querySelector("#stack-split-message"),
    botonColocar: document.querySelector("#place-block"),
    etiquetaColocar: document.querySelector("#place-label"),
    botonSaltar: document.querySelector("#jump-button"),
    etiquetaSalto: document.querySelector("#jump-label"),
    botonVuelo: document.querySelector("#flight-button"),
    botonDescender: document.querySelector("#descend-button"),
    botonInteractuar: document.querySelector("#interact-button"),
    botonAtacar: document.querySelector("#attack-button"),
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
    botonAjustesMundo: document.querySelector("#world-settings-button"),
    estadoGuardado: document.querySelector("#save-status"),
    nombreMundoActual: document.querySelector("#current-world-name"),
    panelEstacion: document.querySelector("#station-panel"),
    cerrarEstacion: document.querySelector("#station-close"),
    tituloEstacion: document.querySelector("#station-title"),
    subtituloEstacion: document.querySelector("#station-kicker"),
    listaRecetas: document.querySelector("#recipe-list"),
    interfazMesaCrafteo: document.querySelector("#crafting-workbench"),
    rejillaCrafteo: document.querySelector("#crafting-grid"),
    inventarioMesaCrafteo: document.querySelector("#crafting-player-inventory"),
    resultadoCrafteo: document.querySelector("#crafting-result"),
    iconoResultadoCrafteo: document.querySelector("#crafting-result-icon"),
    etiquetaResultadoCrafteo: document.querySelector("#crafting-result-label"),
    botonLibroRecetas: document.querySelector("#recipe-book-open"),
    libroRecetas: document.querySelector("#recipe-book"),
    cerrarLibroRecetas: document.querySelector("#recipe-book-close"),
    listaLibroRecetas: document.querySelector("#recipe-book-list"),
    interfazHorno: document.querySelector("#furnace-interface"),
    entradaHorno: document.querySelector("#furnace-input"),
    combustibleHorno: document.querySelector("#furnace-fuel"),
    salidaHorno: document.querySelector("#furnace-output"),
    progresoHorno: document.querySelector("#furnace-progress"),
    estadoHorno: document.querySelector("#furnace-status"),
    botonArenaHorno: document.querySelector("#furnace-add-sand"),
    botonCarbonHorno: document.querySelector("#furnace-add-coal"),
    botonRecogerHorno: document.querySelector("#furnace-collect"),
    mensajeEstacion: document.querySelector("#station-message"),
    panelAjustes: document.querySelector("#settings-panel"),
    cerrarAjustes: document.querySelector("#settings-close"),
    pestanasAjustes: [...document.querySelectorAll("[data-settings-tab]")],
    paginasAjustes: [...document.querySelectorAll("[data-settings-page]")],
    ajusteModoJuego: document.querySelector("#settings-game-mode"),
    ajusteDificultad: document.querySelector("#settings-difficulty"),
    ajustePlantilla: document.querySelector("#settings-template"),
    ajusteTamanoMundo: document.querySelector("#settings-world-size"),
    ajusteRendimiento: document.querySelector("#settings-performance"),
    ajusteDistanciaCarga: document.querySelector("#settings-load-distance"),
    controlDistanciaCarga: document.querySelector("#settings-load-distance-control"),
    perfilRendimiento: document.querySelector("#settings-performance-profile"),
    limiteFps: document.querySelector("#settings-fps-limit"),
    resolucion: document.querySelector("#settings-resolution"),
    valorResolucion: document.querySelector("#settings-resolution-value"),
    resolucionDinamica: document.querySelector("#settings-dynamic-resolution"),
    advertenciaRendimiento: document.querySelector("#settings-performance-warning"),
    volumen: document.querySelector("#settings-volume"),
    valorVolumen: document.querySelector("#settings-volume-value"),
    ajusteAgua: document.querySelector("#settings-water"),
    ajustePixelar: document.querySelector("#settings-pixelar"),
    selectorJoystick: document.querySelector("#settings-joystick"),
    controlesGrandes: document.querySelector("#settings-large-controls"),
    movimientoReducido: document.querySelector("#settings-reduced-motion"),
    botonEditorHud: document.querySelector("#hud-editor-open"),
    botonEditorHudSecundario: document.querySelector("#hud-editor-open-secondary"),
    editorHud: document.querySelector("#hud-editor"),
    guardarEditorHud: document.querySelector("#hud-editor-save"),
    cancelarEditorHud: document.querySelector("#hud-editor-cancel"),
    restaurarEditorHud: document.querySelector("#hud-editor-reset"),
    aumentarEditorHud: document.querySelector("#hud-editor-larger"),
    reducirEditorHud: document.querySelector("#hud-editor-smaller"),
    ayudaEditorHud: document.querySelector("#hud-editor-help"),
    panelDesarrollador: document.querySelector("#developer-panel"),
    cerrarPanelDesarrollador: document.querySelector("#developer-panel-close"),
    metricasDesarrollador: document.querySelector("#developer-metrics"),
  };
}

export function prepararInterfaz(interfaz) {
  interfaz.insigniaVersion.textContent =
    `v${VERSION_JUEGO} • THREE ${VERSION_THREE} • RAPIER ${VERSION_RAPIER}`;
}

export async function mostrarCargaMundo(interfaz, opcionesMundo) {
  const tamanoMundo = [64, 96, 128, 192, 256].includes(
    Number(opcionesMundo.tamanoMundo),
  )
    ? Number(opcionesMundo.tamanoMundo)
    : 128;
  interfaz.textoCarga.textContent =
    `${opcionesMundo.progreso ? "Abriendo" : "Generando"} ${opcionesMundo.nombreMundo} · ${tamanoMundo}×${tamanoMundo}…`;
  if (interfaz.consejoCarga) {
    const funciones = new Set([
        "war:furnace_station",
        "furnace",
        "glass",
        "wooden_pickaxe",
        "coal",
        "hud_editor",
        "inventory",
        "caves",
        "iron",
        "threshold_skeleton",
        "screen_loading",
      ]);
    const semilla =
      String(opcionesMundo.id || opcionesMundo.nombreMundo)
        .split("")
        .reduce((total, letra) => total + letra.charCodeAt(0), 0) + Date.now();
    const consejo = elegirConsejoCarga({ funciones, semilla });
    interfaz.consejoCarga.textContent = consejo?.texto ?? "";
  }
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
