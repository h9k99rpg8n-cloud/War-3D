const ID_VALIDO = /^war:[a-z][a-z0-9_]*$/;
const TIPOS_VALIDOS = new Set(["component", "subcomponent"]);

export class RegistroComportamientos {
  #registros = new Map();

  registrar(definicion) {
    const normalizada = validarDefinicion(definicion);
    if (this.#registros.has(normalizada.id)) {
      throw new Error(`El comportamiento ${normalizada.id} ya está registrado.`);
    }
    if (normalizada.parent && !this.#registros.has(normalizada.parent)) {
      throw new Error(
        `El subcomponente ${normalizada.id} necesita que exista primero ${normalizada.parent}.`,
      );
    }
    this.#registros.set(normalizada.id, normalizada);
    normalizada.onRegister?.();
    return normalizada;
  }

  obtener(id) {
    return this.#registros.get(String(id)) ?? null;
  }

  validar(id, configuracion = {}) {
    const definicion = this.obtener(id);
    if (!definicion) return false;
    try {
      return definicion.validate(configuracion) === true;
    } catch {
      return false;
    }
  }

  adjuntar(id, contexto, configuracion = {}) {
    const definicion = this.obtener(id);
    if (!definicion) throw new Error(`Comportamiento desconocido: ${id}`);
    if (!this.validar(id, configuracion)) {
      throw new TypeError(`Configuración inválida para ${id}`);
    }
    definicion.onAttach?.(contexto, configuracion);
    return Object.freeze({ definicion, contexto, configuracion });
  }

  listar() {
    return [...this.#registros.values()];
  }

  listarPorRama(rama) {
    return this.listar().filter((definicion) => definicion.branch === rama);
  }

  hijosDe(parent) {
    return this.listar().filter((definicion) => definicion.parent === parent);
  }
}

export const comportamientosWar = new RegistroComportamientos();

const definicionesIniciales = [
  comportamiento("war:water_flow", "liquido", true),
  comportamiento("war:water_collision", "bloque", true),
  comportamiento("war:water_permeable", "bloque", true, (configuracion) => {
    const valor = Number(configuracion?.permeability);
    return Number.isFinite(valor) && valor >= 0 && valor <= 1;
  }),
  comportamiento("war:water_interaction", "bloque", true, (configuracion) => {
    if (!configuracion || typeof configuracion !== "object") return false;
    return [
      "blocksFlow",
      "allowsWaterInside",
      "displaceableByWater",
      "receivesWaterUpdates",
    ].every((propiedad) => typeof configuracion[propiedad] === "boolean") &&
      !(configuracion.blocksFlow && configuracion.allowsWaterInside);
  }),
  comportamiento("war:player_held_item", "objeto", false, (configuracion) => {
    if (configuracion?.visible === undefined) return true;
    return (
      typeof configuracion.visible === "boolean" &&
      ["sprite", "model"].includes(configuracion.renderMode ?? "sprite")
    );
  }),
  comportamiento("war:world_template_selection", "mundo", false),
  comportamiento("war:crafting_station", "estacion", false),
  comportamiento("war:furnace_station", "estacion", false),
  comportamiento("war:mining_tool", "herramienta", false),
  comportamiento("war:ranged_attacker", "entidad", false),
  comportamiento("war:cave_spawn", "entidad", false),
  comportamiento("war:hostile_entity", "entidad", false),
  comportamiento("war:dropped_item", "objeto", false),
  comportamiento("war:spawn_egg", "objeto", false),
  comportamiento("war:solid_collision", "bloque", false),
  comportamiento("war:transparent_block", "bloque", false),

  // War Buildy 2.0.0-01: primera rama GUI declarativa. Esta buildy no cambia
  // todavía el aspecto del menú; enseña al registro qué capacidades puede leer.
  componenteGui("war:gui_menu"),
  subcomponenteGui("war:gui_menu_scrotch", "war:gui_menu"),
  subcomponenteGui("war:gui_menu_icon", "war:gui_menu", validarRecurso),
  subcomponenteGui("war:gui_menu_label", "war:gui_menu"),
  subcomponenteGui("war:gui_menu_label_color", "war:gui_menu_label", validarColor),
  subcomponenteGui("war:gui_menu_label_texture", "war:gui_menu_label", validarRecurso),
  subcomponenteGui("war:gui_menu_label_material", "war:gui_menu_label", validarRecurso),
  subcomponenteGui("war:gui_menu_label_bold", "war:gui_menu_label"),
  subcomponenteGui(
    "war:gui_menu_label_bold_color",
    "war:gui_menu_label_bold",
    validarColor,
  ),
  subcomponenteGui(
    "war:gui_menu_label_bold_texture",
    "war:gui_menu_label_bold",
    validarRecurso,
  ),
  subcomponenteGui(
    "war:gui_menu_label_bold_material",
    "war:gui_menu_label_bold",
    validarRecurso,
  ),
  subcomponenteGui(
    "war:gui_menu_label_animation",
    "war:gui_menu_label",
    validarAnimacion,
  ),
  subcomponenteGui("war:gui_menu_button", "war:gui_menu"),
  subcomponenteGui(
    "war:gui_menu_button_opacity",
    "war:gui_menu_button",
    validarOpacidad,
  ),
  subcomponenteGui(
    "war:gui_menu_button_animation",
    "war:gui_menu_button",
    validarAnimacion,
  ),
  subcomponenteGui(
    "war:gui_menu_scrotch_creation_preview",
    "war:gui_menu_scrotch",
  ),
  subcomponenteGui(
    "war:gui_menu_scrotch_creation_preview_2d",
    "war:gui_menu_scrotch_creation_preview",
  ),
  subcomponenteGui(
    "war:gui_menu_scrotch_creation_preview_3d",
    "war:gui_menu_scrotch_creation_preview",
  ),
  subcomponenteGui(
    "war:gui_menu_scrotch_creation_preview_pixel",
    "war:gui_menu_scrotch_creation_preview",
    validarResolucionPreview,
  ),
  subcomponenteGui(
    "war:gui_menu_scrotch_creation_preview_camera",
    "war:gui_menu_scrotch_creation_preview",
    validarCamaraPreview,
  ),
];

for (const definicion of definicionesIniciales) {
  comportamientosWar.registrar(definicion);
}

function comportamiento(
  id,
  category,
  experimental,
  validate = configuracionValida,
  metadatos = {},
) {
  return {
    id,
    version: 1,
    category,
    experimental,
    validate,
    kind: metadatos.kind ?? "component",
    branch: metadatos.branch ?? category,
    parent: metadatos.parent ?? null,
    internal: Boolean(metadatos.internal),
  };
}

function componenteGui(id, validate = configuracionValida) {
  return comportamiento(id, "interfaz", true, validate, {
    kind: "component",
    branch: "gui.menu",
  });
}

function subcomponenteGui(id, parent, validate = configuracionValida) {
  return comportamiento(id, "interfaz", true, validate, {
    kind: "subcomponent",
    branch: "gui.menu",
    parent,
  });
}

function validarDefinicion(definicion) {
  if (!definicion || typeof definicion !== "object") {
    throw new TypeError("La definición de comportamiento debe ser un objeto.");
  }
  if (!ID_VALIDO.test(String(definicion.id))) {
    throw new TypeError(`Identificador de comportamiento inválido: ${definicion.id}`);
  }
  const version = Math.floor(Number(definicion.version));
  if (!Number.isInteger(version) || version < 1) {
    throw new TypeError(`Versión inválida para ${definicion.id}`);
  }
  if (typeof definicion.validate !== "function") {
    throw new TypeError(`El comportamiento ${definicion.id} necesita validate().`);
  }
  const kind = String(definicion.kind || "component");
  if (!TIPOS_VALIDOS.has(kind)) {
    throw new TypeError(`Tipo de componente inválido para ${definicion.id}: ${kind}`);
  }
  const parent = definicion.parent ? String(definicion.parent) : null;
  if (parent && !ID_VALIDO.test(parent)) {
    throw new TypeError(`Componente padre inválido para ${definicion.id}: ${parent}`);
  }
  if (kind === "subcomponent" && !parent) {
    throw new TypeError(`El subcomponente ${definicion.id} necesita parent.`);
  }
  return Object.freeze({
    ...definicion,
    id: String(definicion.id),
    version,
    category: String(definicion.category || "general"),
    experimental: Boolean(definicion.experimental),
    kind,
    branch: String(definicion.branch || definicion.category || "general"),
    parent,
    internal: Boolean(definicion.internal),
  });
}

function configuracionValida(configuracion) {
  return configuracion === undefined || (
    configuracion !== null && typeof configuracion === "object"
  );
}

function validarColor(configuracion) {
  if (!configuracionValida(configuracion)) return false;
  if (configuracion?.color === undefined) return true;
  const color = String(configuracion.color).trim();
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color) || /^[a-z][a-z0-9_-]*$/i.test(color);
}

function validarRecurso(configuracion) {
  if (!configuracionValida(configuracion)) return false;
  if (configuracion?.source === undefined) return true;
  return typeof configuracion.source === "string" && configuracion.source.trim().length > 0;
}

function validarAnimacion(configuracion) {
  if (!configuracionValida(configuracion)) return false;
  if (configuracion?.name !== undefined && typeof configuracion.name !== "string") return false;
  if (configuracion?.durationMs !== undefined) {
    const duracion = Number(configuracion.durationMs);
    if (!Number.isFinite(duracion) || duracion < 0) return false;
  }
  return true;
}

function validarOpacidad(configuracion) {
  if (!configuracionValida(configuracion)) return false;
  const valor = Number(configuracion?.opacity ?? 1);
  return Number.isFinite(valor) && valor >= 0 && valor <= 1;
}

function validarResolucionPreview(configuracion) {
  if (!configuracionValida(configuracion)) return false;
  const ancho = Number(configuracion?.width ?? 64);
  const alto = Number(configuracion?.height ?? ancho);
  return [ancho, alto].every(
    (valor) => Number.isInteger(valor) && valor >= 8 && valor <= 2048,
  );
}

function validarCamaraPreview(configuracion) {
  if (!configuracionValida(configuracion)) return false;
  const distancia = Number(configuracion?.distance ?? 12);
  const velocidad = Number(configuracion?.speed ?? 0.2);
  return (
    Number.isFinite(distancia) &&
    distancia > 0 &&
    Number.isFinite(velocidad) &&
    velocidad >= 0
  );
}
