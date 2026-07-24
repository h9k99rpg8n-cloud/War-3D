import { resolverPerfilRendimiento } from "../rendimiento/perfiles.js";
import {
  cargarPreferencias,
  guardarPreferencias,
} from "./ajustes.js";

/**
 * Controla únicamente preferencias del dispositivo. Los datos que alteran la
 * generación (plantilla, agua, modo y tamaño) siguen perteneciendo al mundo.
 */
export function crearAjustesGlobales(interfaz) {
  const preferencias = cargarPreferencias();
  let vistaAnterior = "portada";

  aplicarControles();
  sincronizarFormularioMundo();

  interfaz.botonAjustesGlobales?.addEventListener("click", () => {
    vistaAnterior = interfaz.vistaMundos?.hidden === false ? "mundos" : "portada";
    abrir();
  });
  interfaz.botonVolverAjustesGlobales?.addEventListener("click", cerrar);

  for (const pestana of interfaz.pestanasAjustesGlobales) {
    pestana.addEventListener("click", () =>
      seleccionarPestana(pestana.dataset.globalSettingsTab),
    );
  }
  for (const boton of interfaz.vistasJoystickGlobales) {
    boton.addEventListener("click", () => {
      preferencias.joystickSkin = boton.dataset.joystickPreview;
      persistir();
    });
  }
  for (const boton of interfaz.vistasRendimientoGlobales) {
    boton.addEventListener("click", () => {
      aplicarPerfil(boton.dataset.performanceProfile);
      persistir();
    });
  }

  conectarEntrada(
    interfaz.resolucionGlobal,
    (valor) => {
      preferencias.escalaResolucion = limitarNumero(valor, 0.65, 1.8, 1.25);
    },
    "input",
  );
  conectarEntrada(interfaz.resolucionDinamicaGlobal, (valor) => {
    preferencias.resolucionDinamica = valor === true;
  });
  conectarEntrada(interfaz.limiteFpsGlobal, (valor) => {
    preferencias.limiteFps = normalizarFps(valor);
  });
  conectarEntrada(interfaz.controlesGrandesGlobal, (valor) => {
    preferencias.controlesGrandes = valor === true;
  });
  conectarEntrada(
    interfaz.volumenGlobal,
    (valor) => {
      preferencias.volumen = limitarNumero(valor, 0, 100, 80);
    },
    "input",
  );
  conectarEntrada(interfaz.movimientoReducidoGlobal, (valor) => {
    preferencias.movimientoReducido = valor === true;
  });
  conectarEntrada(interfaz.modoDesarrolladorGlobal, (valor) => {
    preferencias.modoDesarrollador = valor === true;
  });

  return {
    obtenerPreferencias() {
      return { ...preferencias };
    },
  };

  function conectarEntrada(elemento, asignar, evento = "change") {
    elemento?.addEventListener(evento, () => {
      asignar(elemento.type === "checkbox" ? elemento.checked : elemento.value);
      persistir();
    });
  }

  function abrir() {
    for (const vista of [
      interfaz.vistaPortada,
      interfaz.vistaMundos,
      interfaz.vistaCrearMundo,
    ]) {
      if (vista) vista.hidden = true;
    }
    interfaz.vistaAjustesGlobales.hidden = false;
    interfaz.pantallaInicio.dataset.view = "ajustes";
    seleccionarPestana("juego");
    requestAnimationFrame(() =>
      interfaz.botonVolverAjustesGlobales.focus({ preventScroll: true }),
    );
  }

  function cerrar() {
    interfaz.vistaAjustesGlobales.hidden = true;
    const destino =
      vistaAnterior === "mundos" ? interfaz.vistaMundos : interfaz.vistaPortada;
    destino.hidden = false;
    interfaz.pantallaInicio.dataset.view = vistaAnterior;
  }

  function seleccionarPestana(id) {
    for (const pestana of interfaz.pestanasAjustesGlobales) {
      pestana.classList.toggle(
        "is-active",
        pestana.dataset.globalSettingsTab === id,
      );
    }
    for (const pagina of interfaz.paginasAjustesGlobales) {
      pagina.classList.toggle(
        "is-active",
        pagina.dataset.globalSettingsPage === id,
      );
    }
  }

  function aplicarPerfil(id) {
    const perfil = resolverPerfilRendimiento(id);
    preferencias.perfilRendimiento = perfil.id;
    preferencias.escalaResolucion = perfil.pixelRatio;
    preferencias.limiteFps = perfil.fps;
  }

  function persistir() {
    guardarPreferencias(preferencias);
    aplicarControles();
    sincronizarFormularioMundo();
  }

  function aplicarControles() {
    interfaz.resolucionGlobal.value = String(preferencias.escalaResolucion);
    interfaz.valorResolucionGlobal.textContent =
      `${preferencias.escalaResolucion.toFixed(2).replace(/0$/, "")}×`;
    interfaz.resolucionDinamicaGlobal.checked = preferencias.resolucionDinamica;
    interfaz.limiteFpsGlobal.value = String(preferencias.limiteFps);
    interfaz.controlesGrandesGlobal.checked = preferencias.controlesGrandes;
    interfaz.volumenGlobal.value = String(preferencias.volumen);
    interfaz.valorVolumenGlobal.textContent = `${preferencias.volumen} %`;
    interfaz.movimientoReducidoGlobal.checked = preferencias.movimientoReducido;
    interfaz.modoDesarrolladorGlobal.checked = preferencias.modoDesarrollador;
    for (const boton of interfaz.vistasJoystickGlobales) {
      boton.classList.toggle(
        "is-selected",
        boton.dataset.joystickPreview === preferencias.joystickSkin,
      );
    }
    for (const boton of interfaz.vistasRendimientoGlobales) {
      boton.classList.toggle(
        "is-selected",
        boton.dataset.performanceProfile === preferencias.perfilRendimiento,
      );
    }
  }

  function sincronizarFormularioMundo() {
    const selectorJoystick =
      interfaz.formularioMundo?.elements?.namedItem("joystickSkin");
    const selectorPerfil =
      interfaz.formularioMundo?.elements?.namedItem("performanceProfile");
    if (selectorJoystick) selectorJoystick.value = preferencias.joystickSkin;
    if (selectorPerfil) selectorPerfil.value = preferencias.perfilRendimiento;
  }
}

function normalizarFps(valor) {
  const fps = Number(valor);
  return [0, 30, 45, 60].includes(fps) ? fps : 45;
}

function limitarNumero(valor, minimo, maximo, respaldo) {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? Math.max(minimo, Math.min(maximo, numero))
    : respaldo;
}
