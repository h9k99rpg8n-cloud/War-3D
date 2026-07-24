import { obtenerPlantillaMundo } from "../generacion/plantillasMundo.js";
import { resolverPerfilRendimiento } from "../rendimiento/perfiles.js";
import { crearEditorHud } from "./editorHud.js";

const CLAVE_PREFERENCIAS = "war-3d:preferencias:container-v1";

export function crearSistemaAjustes(
  interfaz,
  opcionesMundo,
  inventario,
  controles,
  servicios = {},
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
    actualizarVistaJoystick();
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
  interfaz.botonEditorHudSecundario?.addEventListener("click", () => {
    cerrarPanel();
    inventario.cerrar();
    controles.reiniciar();
    editorHud.abrir();
  });

  llenarResumen();
  configurarRendimiento();
  actualizarVistaJoystick();

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

  function configurarRendimiento() {
    interfaz.perfilRendimiento.value = preferencias.perfilRendimiento;
    interfaz.limiteFps.value = String(preferencias.limiteFps);
    interfaz.resolucion.value = String(preferencias.escalaResolucion);
    interfaz.resolucionDinamica.checked = preferencias.resolucionDinamica;
    interfaz.controlDistanciaCarga.value = String(opcionesMundo.distanciaCarga);
    interfaz.volumen.value = String(preferencias.volumen);
    actualizarEtiquetasRendimiento();

    interfaz.perfilRendimiento.addEventListener("change", () => {
      const id = interfaz.perfilRendimiento.value;
      preferencias.perfilRendimiento = id;
      if (id !== "personalizado") {
        const perfil = resolverPerfilRendimiento(id);
        preferencias.escalaResolucion = perfil.pixelRatio;
        preferencias.limiteFps = perfil.fps;
        preferencias.resolucionDinamica = perfil.resolucionDinamica;
        interfaz.controlDistanciaCarga.value = String(perfil.distanciaCarga);
      }
      aplicarRendimiento();
    });
    interfaz.limiteFps.addEventListener("change", () => {
      preferencias.perfilRendimiento = "personalizado";
      preferencias.limiteFps = Number(interfaz.limiteFps.value);
      aplicarRendimiento();
    });
    interfaz.resolucion.addEventListener("input", () => {
      preferencias.perfilRendimiento = "personalizado";
      preferencias.escalaResolucion = Number(interfaz.resolucion.value);
      aplicarRendimiento();
    });
    interfaz.resolucionDinamica.addEventListener("change", () => {
      preferencias.resolucionDinamica = interfaz.resolucionDinamica.checked;
      aplicarRendimiento();
    });
    interfaz.controlDistanciaCarga.addEventListener("input", () => {
      preferencias.perfilRendimiento = "personalizado";
      aplicarRendimiento();
    });
    interfaz.volumen.addEventListener("input", () => {
      preferencias.volumen = Number(interfaz.volumen.value);
      guardarPreferencias(preferencias);
      actualizarEtiquetasRendimiento();
    });
  }

  function aplicarRendimiento() {
    guardarPreferencias(preferencias);
    interfaz.perfilRendimiento.value = preferencias.perfilRendimiento;
    interfaz.limiteFps.value = String(preferencias.limiteFps);
    interfaz.resolucion.value = String(preferencias.escalaResolucion);
    interfaz.resolucionDinamica.checked = preferencias.resolucionDinamica;
    servicios.alCambiarRendimiento?.({
      perfil: preferencias.perfilRendimiento,
      limiteFps: preferencias.limiteFps,
      pixelRatio: preferencias.escalaResolucion,
      resolucionDinamica: preferencias.resolucionDinamica,
      distanciaCarga: Number(interfaz.controlDistanciaCarga.value),
    });
    actualizarEtiquetasRendimiento();
  }

  function actualizarEtiquetasRendimiento() {
    interfaz.valorResolucion.textContent =
      `${Number(preferencias.escalaResolucion).toFixed(2).replace(/0$/, "")}×`;
    interfaz.valorVolumen.textContent = `${preferencias.volumen} %`;
    interfaz.ajusteDistanciaCarga.textContent =
      `${interfaz.controlDistanciaCarga.value} REGIONES`;
    interfaz.ajusteRendimiento.textContent =
      preferencias.perfilRendimiento.toUpperCase();
    interfaz.advertenciaRendimiento.textContent =
      Number(interfaz.controlDistanciaCarga.value) > 12
        ? "Una distancia alta aumenta memoria, GPU y consumo sostenido."
        : `${nombrePerfil(preferencias.perfilRendimiento)} está activo en este dispositivo.`;
  }

  function actualizarVistaJoystick() {
    const vista = document.querySelector("#settings-joystick-preview");
    if (!vista) return;
    vista.className =
      `joystick-preview joystick-preview--${preferencias.joystickSkin}`;
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

export function aplicarPreferencias(interfaz, preferencias) {
  interfaz.juego.dataset.joystickSkin = preferencias.joystickSkin;
  interfaz.juego.classList.toggle("controls-large", preferencias.controlesGrandes);
  interfaz.juego.classList.toggle("reduced-motion", preferencias.movimientoReducido);
}

function nombrePerfil(id) {
  if (id === "basico") return "Bajo";
  if (id === "alto") return "Alto";
  if (id === "personalizado") return "Personalizado";
  return "Equilibrado";
}

export function normalizarPreferencias(datos) {
  return {
    joystickSkin: ["traditional", "dark", "pixel"].includes(datos?.joystickSkin)
      ? datos.joystickSkin
      : "traditional",
    controlesGrandes: datos?.controlesGrandes === true,
    movimientoReducido: datos?.movimientoReducido === true,
    perfilRendimiento: ["basico", "equilibrado", "alto", "personalizado"].includes(
      datos?.perfilRendimiento,
    )
      ? datos.perfilRendimiento
      : "equilibrado",
    escalaResolucion: limitarNumero(datos?.escalaResolucion, 0.65, 1.8, 1.25),
    resolucionDinamica: datos?.resolucionDinamica !== false,
    limiteFps: [0, 30, 45, 60].includes(Number(datos?.limiteFps))
      ? Number(datos.limiteFps)
      : 45,
    volumen: limitarNumero(datos?.volumen, 0, 100, 80),
    modoDesarrollador: datos?.modoDesarrollador === true,
    hudLayout:
      datos?.hudLayout && typeof datos.hudLayout === "object"
        ? datos.hudLayout
        : {},
  };
}

function limitarNumero(valor, minimo, maximo, respaldo) {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? Math.max(minimo, Math.min(maximo, numero))
    : respaldo;
}
