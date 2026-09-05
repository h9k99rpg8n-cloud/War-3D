import { componentesWar } from "../componentes/registroComponentes.js";

const COMPONENTES_POR_HOST = new WeakMap();

export function prepararComponentesMenu(interfaz) {
  marcarComponenteGUI(interfaz.pantallaInicio, "war:gui_menu", { role: "launcher" });
  marcarComponenteGUI(interfaz.pantallaInicio, "war:gui_menu_scrotch", {
    view: "launcher",
  });

  for (const vista of [
    interfaz.vistaPortada,
    interfaz.vistaMundos,
    interfaz.vistaCrearMundo,
    interfaz.vistaAjustesGlobales,
  ]) {
    marcarComponenteGUI(vista, "war:gui_menu_scrotch", { view: vista?.id || "screen" });
  }

  marcarComponenteGUI(interfaz.tituloAnimado, "war:gui_menu_label", { role: "title" });
  marcarComponenteGUI(interfaz.tituloAnimado, "war:gui_menu_label_bold", { enabled: true });
  marcarComponenteGUI(interfaz.tituloAnimado, "war:gui_menu_label_animation", {
    name: "typewriter",
    durationMs: 115,
  });

  prepararBotonMenu(interfaz.botonJugar, "play");
  prepararBotonMenu(interfaz.botonAjustesGlobales, "settings");
  prepararBotonMenu(interfaz.botonVolverAjustesGlobales, "back-home");
  prepararBotonMenu(interfaz.botonVolverPortada, "back-home");
  prepararBotonMenu(interfaz.botonVolverMundos, "back-worlds");
  prepararBotonMenu(interfaz.botonCrearMundoLista, "create-world");
  prepararBotonMenu(interfaz.botonAjustesCreacion, "creation-settings");
  for (const boton of interfaz.botonesCrearMundo ?? []) prepararBotonMenu(boton, "create-world");

  prepararPreviewsExistentes(interfaz.pantallaInicio);
}

export function prepararPreviewMenu(elemento, {
  mode = "2d",
  width = 160,
  height = 90,
  cameraDistance = 12,
  cameraMovement = "horizontal",
} = {}) {
  if (!elemento) return;
  if (!["2d", "3d"].includes(mode)) {
    throw new TypeError(`Modo de preview inválido: ${mode}`);
  }
  const actuales = obtenerComponentesGUI(elemento);
  const modoOpuesto = mode === "3d"
    ? "war:gui_menu_scrotch_creation_preview_2d"
    : "war:gui_menu_scrotch_creation_preview_3d";
  if (actuales.has(modoOpuesto)) {
    throw new TypeError("Un Preview no puede ser 2D y 3D al mismo tiempo.");
  }
  const solicitudes = [
    ["war:gui_menu_scrotch_creation_preview", {}],
    [`war:gui_menu_scrotch_creation_preview_${mode}`, {}],
    ["war:gui_menu_scrotch_creation_preview_pixel", {
      width,
      height,
      imageSmoothing: false,
    }],
    ["war:gui_menu_scrotch_creation_preview_camera", {
      distance: cameraDistance,
      movement: cameraMovement,
    }],
  ];
  for (const [id, configuracion] of solicitudes) {
    if (!componentesWar.validar(id, configuracion)) {
      throw new TypeError(`Configuración inválida para ${id}`);
    }
  }
  for (const [id, configuracion] of solicitudes) {
    marcarComponenteGUI(elemento, id, configuracion);
  }
}

export function marcarComponenteGUI(elemento, id, configuracion = {}) {
  if (!elemento) return null;
  const actuales = COMPONENTES_POR_HOST.get(elemento) ?? new Map();
  const existente = actuales.get(id);
  if (existente) {
    if (!configuracionesIguales(existente.configuracion, configuracion)) {
      throw new TypeError(`El host ya tiene ${id} con otra configuración.`);
    }
    return existente;
  }
  const adjunto = componentesWar.adjuntar(id, elemento, configuracion);
  actuales.set(id, adjunto);
  COMPONENTES_POR_HOST.set(elemento, actuales);
  if (elemento.dataset) {
    elemento.dataset.warComponents = [...actuales.keys()].join(" ");
  }
  return adjunto;
}

export function obtenerComponentesGUI(elemento) {
  return COMPONENTES_POR_HOST.has(elemento)
    ? new Map(COMPONENTES_POR_HOST.get(elemento))
    : new Map();
}

export function prepararBotonMenu(boton, action) {
  if (!boton) return;
  marcarComponenteGUI(boton, "war:gui_menu_button", { action });
  marcarComponenteGUI(boton, "war:gui_menu_button_opacity", { value: 1 });
  marcarComponenteGUI(boton, "war:gui_menu_button_animation", {
    name: "press",
    durationMs: 140,
  });
}

export function prepararPreviewMundo(preview) {
  if (!preview) return;
  prepararPreviewMenu(preview, {
    mode: "2d",
    width: Number(preview.width) || 160,
    height: Number(preview.height) || 90,
    cameraMovement: "static",
  });
}

function prepararPreviewsExistentes(raiz) {
  if (!raiz?.querySelectorAll) return;
  for (const preview of raiz.querySelectorAll(".world-card__preview")) {
    prepararPreviewMundo(preview);
  }
}

function configuracionesIguales(izquierda, derecha) {
  if (Object.is(izquierda, derecha)) return true;
  if (!izquierda || !derecha || typeof izquierda !== "object" || typeof derecha !== "object") {
    return false;
  }
  if (Array.isArray(izquierda) !== Array.isArray(derecha)) return false;
  const clavesIzquierda = Object.keys(izquierda);
  const clavesDerecha = Object.keys(derecha);
  if (clavesIzquierda.length !== clavesDerecha.length) return false;
  return clavesIzquierda.every((clave) =>
    Object.hasOwn(derecha, clave) &&
    configuracionesIguales(izquierda[clave], derecha[clave]),
  );
}
