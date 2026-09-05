import { componentesWar } from "../componentes/registroComponentes.js";

const CLAVE_COMPONENTES = Symbol("warGuiComponents");

export function prepararComponentesMenu(interfaz) {
  marcarComponenteGUI(interfaz.pantallaInicio, "war:gui_menu", { role: "launcher" });
  marcarComponenteGUI(interfaz.pantallaInicio, "war:gui_menu_scrotch", {
    view: "launcher",
  });

  for (const vista of [interfaz.vistaPortada, interfaz.vistaMundos, interfaz.vistaCrearMundo]) {
    marcarComponenteGUI(vista, "war:gui_menu_scrotch", { view: vista?.id || "screen" });
  }

  marcarComponenteGUI(interfaz.tituloAnimado, "war:gui_menu_label", { role: "title" });
  marcarComponenteGUI(interfaz.tituloAnimado, "war:gui_menu_label_bold", { enabled: true });
  marcarComponenteGUI(interfaz.tituloAnimado, "war:gui_menu_label_animation", {
    name: "typewriter",
    durationMs: 115,
  });

  marcarBoton(interfaz.botonJugar, "play");
  marcarBoton(interfaz.botonVolverPortada, "back-home");
  marcarBoton(interfaz.botonVolverMundos, "back-worlds");
  marcarBoton(interfaz.botonCrearMundoLista, "create-world");
  marcarBoton(interfaz.botonAjustesCreacion, "creation-settings");
  for (const boton of interfaz.botonesCrearMundo ?? []) marcarBoton(boton, "create-world");
}

export function prepararPreviewMenu(elemento, {
  mode = "2d",
  width = 160,
  height = 90,
  cameraDistance = 12,
  cameraMovement = "horizontal",
} = {}) {
  marcarComponenteGUI(elemento, "war:gui_menu_scrotch_creation_preview", {});
  marcarComponenteGUI(
    elemento,
    mode === "3d"
      ? "war:gui_menu_scrotch_creation_preview_3d"
      : "war:gui_menu_scrotch_creation_preview_2d",
    {},
  );
  marcarComponenteGUI(elemento, "war:gui_menu_scrotch_creation_preview_pixel", {
    width,
    height,
  });
  marcarComponenteGUI(elemento, "war:gui_menu_scrotch_creation_preview_camera", {
    distance: cameraDistance,
    movement: cameraMovement,
  });
}

export function marcarComponenteGUI(elemento, id, configuracion = {}) {
  if (!elemento) return null;
  const adjunto = componentesWar.adjuntar(id, elemento, configuracion);
  const actuales = elemento[CLAVE_COMPONENTES] ?? new Map();
  actuales.set(id, adjunto);
  elemento[CLAVE_COMPONENTES] = actuales;
  elemento.dataset.warComponents = [...actuales.keys()].join(" ");
  return adjunto;
}

export function obtenerComponentesGUI(elemento) {
  return elemento?.[CLAVE_COMPONENTES]
    ? new Map(elemento[CLAVE_COMPONENTES])
    : new Map();
}

function marcarBoton(boton, action) {
  if (!boton) return;
  marcarComponenteGUI(boton, "war:gui_menu_button", { action });
  marcarComponenteGUI(boton, "war:gui_menu_button_opacity", { value: 1 });
  marcarComponenteGUI(boton, "war:gui_menu_button_animation", {
    name: "press",
    durationMs: 140,
  });
}
