import { VERSION_JUEGO, VERSION_THREE } from "../configuracion.js";

export function obtenerInterfaz() {
  return {
    juego: document.querySelector("#game"),
    pantallaInicio: document.querySelector("#start-screen"),
    formularioMundo: document.querySelector("#world-form"),
    nombreMundo: document.querySelector("#world-name"),
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
    espacioPasto: document.querySelector("#grass-slot"),
    contadorPasto: document.querySelector("#grass-count"),
    espacioHojas: document.querySelector("#leaves-slot"),
    contadorHojas: document.querySelector("#leaves-count"),
    espacioMadera: document.querySelector("#wood-slot"),
    contadorMadera: document.querySelector("#wood-count"),
    espacioArena: document.querySelector("#sand-slot"),
    contadorArena: document.querySelector("#sand-count"),
    botonColocar: document.querySelector("#place-block"),
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
  };
}

export function prepararInterfaz(interfaz) {
  interfaz.insigniaVersion.textContent = `v${VERSION_JUEGO} • THREE ${VERSION_THREE}`;
}

export function esperarCreacionMundo(interfaz) {
  configurarSelectorMundo(interfaz);
  return new Promise((resolve) => {
    interfaz.formularioMundo.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        const nombre = interfaz.nombreMundo.value.trim() || "Mi mundo";
        const datos = new FormData(interfaz.formularioMundo);
        const modo = datos.get("gameMode") === "creativo" ? "creativo" : "supervivencia";
        const tipoMundo =
          modo === "creativo" && datos.get("worldType") === "plano" ? "plano" : "normal";
        const tamanoSolicitado = Number(datos.get("worldSize"));
        const tamanoMundo = [64, 96, 128].includes(tamanoSolicitado)
          ? tamanoSolicitado
          : 128;
        document.title = `War 3D — ${nombre}`;
        resolve({ nombreMundo: nombre.slice(0, 24), modo, tipoMundo, tamanoMundo });
      },
      { once: true },
    );
  });
}

export async function mostrarCargaMundo(interfaz, opcionesMundo) {
  const tamanoMundo = [64, 96, 128].includes(Number(opcionesMundo.tamanoMundo))
    ? Number(opcionesMundo.tamanoMundo)
    : 128;
  interfaz.textoCarga.textContent =
    `Generando ${opcionesMundo.nombreMundo} · ${tamanoMundo}×${tamanoMundo}…`;
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

function configurarSelectorMundo(interfaz) {
  const opcionesModo = [
    ...interfaz.formularioMundo.querySelectorAll('input[name="gameMode"]'),
  ];

  const actualizar = () => {
    const creativo = opcionesModo.some(
      (opcion) => opcion.checked && opcion.value === "creativo",
    );
    interfaz.mundoPlano.disabled = !creativo;
    interfaz.opcionMundoPlano.classList.toggle("is-disabled", !creativo);
    interfaz.notaMundoPlano.textContent = creativo
      ? "Sin relieve ni árboles"
      : "Solo disponible en creativo";
    if (!creativo && interfaz.mundoPlano.checked) {
      interfaz.formularioMundo.querySelector('input[value="normal"]').checked = true;
    }
  };

  for (const opcion of opcionesModo) opcion.addEventListener("change", actualizar);
  actualizar();
}
