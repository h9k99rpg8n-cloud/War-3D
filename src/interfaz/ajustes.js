import { obtenerPlantillaMundo } from "../generacion/plantillasMundo.js";
import { crearEditorHud } from "./editorHud.js";

const CLAVE_PREFERENCIAS = "war-3d:preferencias:container-v1";

export function crearSistemaAjustes(
  interfaz,
  opcionesMundo,
  inventario,
  controles,
) {
  const preferencias = cargarPreferencias();
  if (!preferencias.joystickSkin && opcionesMundo.joystickSkin) {
    preferencias.joystickSkin = opcionesMundo.joystickSkin;
  }
  aplicarPreferencias(interfaz, preferencias);
  const editorHud = crearEditorHud(
    interfaz,
    preferencias,
    guardarPreferencias,
  );
  let abierto = false;

  interfaz.panelAjustes.hidden = true;
  interfaz.botonAjustesMundo.addEventListener("click", abrirPanel);
  interfaz.cerrarAjustes.addEventListener("click", cerrarPanel);
  interfaz.panelAjustes.addEventListener("pointerdown", (event) => {
    if (event.target === interfaz.panelAjustes) cerrarPanel();
  });
  for (const pestana of interfaz.pestanasAjustes) {
    pestana.addEventListener("click", () =>
      seleccionarPestana(pestana.dataset.settingsTab),
    );
  }
  interfaz.selectorJoystick.value = preferencias.joystickSkin;
  interfaz.selectorJoystick.addEventListener("change", () => {
    preferencias.joystickSkin = interfaz.selectorJoystick.value;
    guardarPreferencias(preferencias);
    aplicarPreferencias(interfaz, preferencias);
  });
  interfaz.controlesGrandes.checked = preferencias.controlesGrandes;
  interfaz.controlesGrandes.addEventListener("change", () => {
    preferencias.controlesGrandes = interfaz.controlesGrandes.checked;
    guardarPreferencias(preferencias);
    aplicarPreferencias(interfaz, preferencias);
  });
  interfaz.movimientoReducido.checked = preferencias.movimientoReducido;
  interfaz.movimientoReducido.addEventListener("change", () => {
    preferencias.movimientoReducido = interfaz.movimientoReducido.checked;
    guardarPreferencias(preferencias);
    aplicarPreferencias(interfaz, preferencias);
  });
  interfaz.botonEditorHud.addEventListener("click", () => {
    cerrarPanel();
    inventario.cerrar();
    controles.reiniciar();
    editorHud.abrir();
  });

  llenarResumen();

  return {
    estaAbierto() {
      return abierto || editorHud.estaAbierto();
    },
    cerrar() {
      cerrarPanel();
      editorHud.cerrar();
    },
  };

  function abrirPanel() {
    inventario.cerrar();
    controles.reiniciar();
    interfaz.menuJuego.hidden = true;
    interfaz.botonMenuJuego.setAttribute("aria-expanded", "false");
    abierto = true;
    interfaz.panelAjustes.hidden = false;
    interfaz.juego.classList.add("settings-open");
    seleccionarPestana("juego");
    requestAnimationFrame(() => interfaz.cerrarAjustes.focus({ preventScroll: true }));
  }

  function cerrarPanel() {
    if (!abierto) return;
    abierto = false;
    interfaz.panelAjustes.hidden = true;
    interfaz.juego.classList.remove("settings-open");
  }

  function seleccionarPestana(id) {
    for (const pestana of interfaz.pestanasAjustes) {
      pestana.classList.toggle("is-active", pestana.dataset.settingsTab === id);
    }
    for (const pagina of interfaz.paginasAjustes) {
      pagina.classList.toggle("is-active", pagina.dataset.settingsPage === id);
    }
  }

  function llenarResumen() {
    const plantilla = obtenerPlantillaMundo(opcionesMundo.plantillaId);
    interfaz.ajusteModoJuego.textContent = opcionesMundo.modo.toUpperCase();
    interfaz.ajusteDificultad.textContent =
      opcionesMundo.modo === "creativo"
        ? "SIN HOSTILES"
        : opcionesMundo.dificultad.toUpperCase();
    interfaz.ajustePlantilla.textContent = plantilla.nombre.toUpperCase();
    interfaz.ajusteTamanoMundo.textContent =
      `${opcionesMundo.tamanoMundo}×${opcionesMundo.tamanoMundo}`;
    interfaz.ajusteRendimiento.textContent =
      opcionesMundo.perfilRendimiento.toUpperCase();
    interfaz.ajusteDistanciaCarga.textContent =
      `${opcionesMundo.distanciaCarga} REGIONES`;
    interfaz.ajusteAgua.textContent = opcionesMundo.aguaExperimental
      ? "ACTIVADA · EXPERIMENTAL"
      : "DESACTIVADA";
    interfaz.ajustePixelar.textContent =
      opcionesMundo.estiloVisual === "pixelar"
        ? "ACTIVADO · EXPERIMENTAL"
        : "DESACTIVADO";
  }
}

export function cargarPreferencias() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_PREFERENCIAS) || "{}");
    return normalizarPreferencias(datos);
  } catch {
    return normalizarPreferencias({});
  }
}

export function guardarPreferencias(preferencias) {
  const seguras = normalizarPreferencias(preferencias);
  try {
    localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(seguras));
  } catch {
    // Un Safari en modo privado puede bloquear localStorage; el juego continúa.
  }
  Object.assign(preferencias, seguras);
}

function aplicarPreferencias(interfaz, preferencias) {
  interfaz.juego.dataset.joystickSkin = preferencias.joystickSkin;
  interfaz.juego.classList.toggle("controls-large", preferencias.controlesGrandes);
  interfaz.juego.classList.toggle("reduced-motion", preferencias.movimientoReducido);
}

function normalizarPreferencias(datos) {
  return {
    joystickSkin: ["traditional", "dark", "pixel"].includes(datos?.joystickSkin)
      ? datos.joystickSkin
      : "traditional",
    controlesGrandes: datos?.controlesGrandes === true,
    movimientoReducido: datos?.movimientoReducido === true,
    hudLayout:
      datos?.hudLayout && typeof datos.hudLayout === "object"
        ? datos.hudLayout
        : {},
  };
}
