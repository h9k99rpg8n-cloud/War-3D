export const ESTILOS_VISUALES = Object.freeze(["traditional", "pixelar"]);

const recursos = new Map();
const avisosEmitidos = new Set();

export function registrarRecursoVisual(definicion) {
  const id = String(definicion?.id || "");
  if (!/^war:[a-z0-9_]+$/.test(id)) {
    throw new TypeError(`Identificador visual inválido: ${id || "(vacío)"}`);
  }
  if (!definicion.traditionalAsset || !definicion.fallbackAsset) {
    throw new TypeError(`${id} necesita recurso tradicional y fallback.`);
  }
  const registro = Object.freeze({
    id,
    traditionalAsset: String(definicion.traditionalAsset),
    pixelAsset: definicion.pixelAsset
      ? String(definicion.pixelAsset)
      : null,
    fallbackAsset: String(definicion.fallbackAsset),
  });
  recursos.set(id, registro);
  return registro;
}

export function resolverRecursoVisual(id, estilo = "traditional") {
  const registro = recursos.get(String(id));
  if (!registro) return null;
  if (estilo !== "pixelar") return registro.traditionalAsset;
  if (registro.pixelAsset) return registro.pixelAsset;
  if (!avisosEmitidos.has(registro.id)) {
    avisosEmitidos.add(registro.id);
    console.warn(
      `[Pixelar] ${registro.id} todavía usa un fallback controlado.`,
    );
  }
  return registro.fallbackAsset;
}

export function listarRecursosVisuales() {
  return [...recursos.values()];
}

for (const [id, tradicional, pixel] of [
  ["icon_play", "#icon-play", "#icon-play-pixel"],
  ["icon_settings", "#icon-settings", "#icon-settings-pixel"],
  ["icon_book", "#icon-recipe-book", "#icon-recipe-book-pixel"],
  ["icon_jump", "#icon-jump", "#icon-jump-pixel"],
  ["icon_attack", "#icon-sword", "#icon-sword-pixel"],
  ["icon_inventory", "#icon-bag", "#icon-bag-pixel"],
  ["icon_place", "#icon-plus", "#icon-plus-pixel"],
  ["sun", "sun-traditional", "sun-pixelar"],
  ["moon", "moon-traditional", "moon-pixelar"],
  ["water", "water-traditional", "water-pixelar"],
]) {
  registrarRecursoVisual({
    id: `war:${id}`,
    traditionalAsset: tradicional,
    pixelAsset: pixel,
    fallbackAsset: tradicional,
  });
}

const ICONOS_INTERFAZ = Object.freeze([
  ["#inventory-button use", "war:icon_inventory"],
  ["#jump-button use", "war:icon_jump"],
  ["#attack-button use", "war:icon_attack"],
  ["#place-block use", "war:icon_place"],
  ["#recipe-book-open use", "war:icon_book"],
  ["#world-settings-button use", "war:icon_settings"],
]);

export function aplicarRecursosVisualesInterfaz(
  raiz = document,
  estilo = "traditional",
) {
  for (const [selector, id] of ICONOS_INTERFAZ) {
    const recurso = resolverRecursoVisual(id, estilo);
    const elemento = raiz.querySelector(selector);
    if (!elemento || !recurso) continue;
    elemento.setAttribute("href", recurso);
  }
}
