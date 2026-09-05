const ID_VALIDO = /^war:[a-z][a-z0-9_]*$/;
const TIPOS_VALIDOS = new Set(["component", "subcomponent", "system", "api"]);

export class RegistroComponentes {
  #registros = new Map();

  registrar(definicion) {
    const normalizada = validarDefinicion(definicion, this.#registros);
    if (this.#registros.has(normalizada.id)) {
      throw new Error(`El componente ${normalizada.id} ya está registrado.`);
    }
    this.#registros.set(normalizada.id, normalizada);
    try {
      normalizada.onRegister?.();
    } catch (error) {
      this.#registros.delete(normalizada.id);
      throw error;
    }
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

  adjuntar(id, host, configuracion = {}) {
    const definicion = this.obtener(id);
    if (!definicion) throw new Error(`Componente desconocido: ${id}`);
    if ((typeof host !== "object" && typeof host !== "function") || host === null) {
      throw new TypeError(`Host inválido para ${id}`);
    }
    if (!this.validar(id, configuracion)) {
      throw new TypeError(`Configuración inválida para ${id}`);
    }
    const configuracionInmutable = copiarConfiguracionInmutable(configuracion);
    definicion.onAttach?.(host, configuracionInmutable);
    return Object.freeze({ definicion, host, configuracion: configuracionInmutable });
  }

  listar(filtros = {}) {
    const { familia = null, tipo = null, experimental = null } = filtros;
    return [...this.#registros.values()].filter((definicion) => {
      if (familia && definicion.family !== familia) return false;
      if (tipo && definicion.type !== tipo) return false;
      if (experimental !== null && definicion.experimental !== experimental) return false;
      return true;
    });
  }

  esDescendiente(id, padreId) {
    let actual = this.obtener(id);
    const objetivo = String(padreId);
    const visitados = new Set();
    while (actual?.parent) {
      if (visitados.has(actual.id)) return false;
      visitados.add(actual.id);
      if (actual.parent === objetivo) return true;
      actual = this.obtener(actual.parent);
    }
    return false;
  }

  listarDescendientes(id, { directos = false } = {}) {
    const padreId = String(id);
    if (!this.#registros.has(padreId)) return [];
    return [...this.#registros.values()].filter((definicion) =>
      directos
        ? definicion.parent === padreId
        : this.esDescendiente(definicion.id, padreId),
    );
  }
}

export const componentesWar = new RegistroComponentes();

const definicionesIniciales = [
  componente("war:gui_menu", "gui"),
  subcomponente("war:gui_menu_scrotch", "war:gui_menu", "gui"),

  subcomponente("war:gui_menu_label", "war:gui_menu", "gui"),
  subcomponente("war:gui_menu_label_color", "war:gui_menu_label", "gui", validarColor),
  subcomponente("war:gui_menu_label_texture", "war:gui_menu_label", "gui", validarRecurso),
  subcomponente("war:gui_menu_label_material", "war:gui_menu_label", "gui", validarRecurso),
  subcomponente("war:gui_menu_label_bold", "war:gui_menu_label", "gui", validarBooleanoOpcional),
  subcomponente("war:gui_menu_label_bold_color", "war:gui_menu_label_bold", "gui", validarColor),
  subcomponente("war:gui_menu_label_bold_texture", "war:gui_menu_label_bold", "gui", validarRecurso),
  subcomponente("war:gui_menu_label_bold_material", "war:gui_menu_label_bold", "gui", validarRecurso),
  subcomponente("war:gui_menu_label_animation", "war:gui_menu_label", "gui", validarAnimacion),

  subcomponente("war:gui_menu_icon", "war:gui_menu", "gui", validarRecurso),

  subcomponente("war:gui_menu_button", "war:gui_menu", "gui"),
  subcomponente("war:gui_menu_button_opacity", "war:gui_menu_button", "gui", validarOpacidad),
  subcomponente("war:gui_menu_button_animation", "war:gui_menu_button", "gui", validarAnimacion),

  subcomponente(
    "war:gui_menu_scrotch_creation_preview",
    "war:gui_menu_scrotch",
    "gui",
  ),
  subcomponente(
    "war:gui_menu_scrotch_creation_preview_2d",
    "war:gui_menu_scrotch_creation_preview",
    "gui",
  ),
  subcomponente(
    "war:gui_menu_scrotch_creation_preview_3d",
    "war:gui_menu_scrotch_creation_preview",
    "gui",
  ),
  subcomponente(
    "war:gui_menu_scrotch_creation_preview_pixel",
    "war:gui_menu_scrotch_creation_preview",
    "gui",
    validarResolucionPixel,
  ),
  subcomponente(
    "war:gui_menu_scrotch_creation_preview_camera",
    "war:gui_menu_scrotch_creation_preview",
    "gui",
    validarCamaraPreview,
  ),
];

for (const definicion of definicionesIniciales) {
  componentesWar.registrar(definicion);
}

function componente(id, family, validate = configuracionValida) {
  return {
    id,
    version: 1,
    family,
    type: "component",
    parent: null,
    experimental: true,
    validate,
  };
}

function subcomponente(id, parent, family, validate = configuracionValida) {
  return {
    id,
    version: 1,
    family,
    type: "subcomponent",
    parent,
    experimental: true,
    validate,
  };
}

function validarDefinicion(definicion, registros) {
  if (!definicion || typeof definicion !== "object") {
    throw new TypeError("La definición de componente debe ser un objeto.");
  }
  const id = String(definicion.id);
  if (!ID_VALIDO.test(id)) {
    throw new TypeError(`Identificador de componente inválido: ${id}`);
  }
  const version = Math.floor(Number(definicion.version));
  if (!Number.isInteger(version) || version < 1) {
    throw new TypeError(`Versión inválida para ${id}`);
  }
  const type = String(definicion.type || "component");
  if (!TIPOS_VALIDOS.has(type)) {
    throw new TypeError(`Tipo de componente inválido para ${id}: ${type}`);
  }
  const parent = definicion.parent ? String(definicion.parent) : null;
  if (type === "subcomponent" && !parent) {
    throw new TypeError(`El subcomponente ${id} necesita un componente padre.`);
  }
  if (type !== "subcomponent" && parent) {
    throw new TypeError(`Solo un subcomponente puede declarar padre: ${id}`);
  }
  const definicionPadre = parent ? registros.get(parent) : null;
  if (parent && !definicionPadre) {
    throw new TypeError(`El padre ${parent} de ${id} todavía no está registrado.`);
  }
  if (definicionPadre && !["component", "subcomponent"].includes(definicionPadre.type)) {
    throw new TypeError(`El padre ${parent} de ${id} no es un componente.`);
  }
  if (typeof definicion.validate !== "function") {
    throw new TypeError(`El componente ${id} necesita validate().`);
  }
  const family = String(definicion.family || "general");
  if (definicionPadre && definicionPadre.family !== family) {
    throw new TypeError(`La familia de ${id} no coincide con la de ${parent}.`);
  }
  return Object.freeze({
    ...definicion,
    id,
    version,
    family,
    type,
    parent,
    experimental: Boolean(definicion.experimental),
  });
}

function configuracionValida(configuracion) {
  return configuracion === undefined || (
    configuracion !== null && typeof configuracion === "object"
  );
}

function validarColor(configuracion) {
  if (!configuracion || typeof configuracion !== "object") return false;
  const valor = String(configuracion.value ?? configuracion.color ?? "").trim();
  return valor.length > 0 && valor.length <= 64;
}

function validarRecurso(configuracion) {
  if (!configuracion || typeof configuracion !== "object") return false;
  const recurso = String(
    configuracion.resource ?? configuracion.texture ?? configuracion.material ?? configuracion.icon ?? "",
  ).trim();
  return recurso.length > 0 && recurso.length <= 256;
}

function validarBooleanoOpcional(configuracion) {
  if (configuracion === undefined || configuracion === null) return true;
  if (typeof configuracion !== "object") return false;
  return configuracion.enabled === undefined || typeof configuracion.enabled === "boolean";
}

function validarAnimacion(configuracion) {
  if (!configuracion || typeof configuracion !== "object") return false;
  const nombre = String(configuracion.name ?? "").trim();
  const duracion = configuracion.durationMs === undefined ? 250 : Number(configuracion.durationMs);
  return nombre.length > 0 && Number.isFinite(duracion) && duracion >= 0 && duracion <= 60_000;
}

function validarOpacidad(configuracion) {
  if (!configuracion || typeof configuracion !== "object") return false;
  const valor = Number(configuracion.value ?? configuracion.opacity);
  return Number.isFinite(valor) && valor >= 0 && valor <= 1;
}

function validarResolucionPixel(configuracion) {
  if (!configuracion || typeof configuracion !== "object") return false;
  const ancho = Number(configuracion.width);
  const alto = Number(configuracion.height);
  return (
    Number.isInteger(ancho) &&
    Number.isInteger(alto) &&
    ancho >= 1 &&
    ancho <= 2048 &&
    alto >= 1 &&
    alto <= 2048 &&
    (configuracion.imageSmoothing === undefined || configuracion.imageSmoothing === false)
  );
}

function validarCamaraPreview(configuracion) {
  if (!configuracion || typeof configuracion !== "object") return false;
  const distancia = Number(configuracion.distance ?? 12);
  const movimiento = String(configuracion.movement ?? "horizontal");
  return (
    Number.isFinite(distancia) &&
    distancia > 0 &&
    distancia <= 256 &&
    ["static", "horizontal", "orbit"].includes(movimiento)
  );
}

function copiarConfiguracionInmutable(valor, copias = new WeakMap()) {
  if (valor === null || typeof valor !== "object") return valor;
  if (copias.has(valor)) return copias.get(valor);
  const prototipo = Object.getPrototypeOf(valor);
  if (!Array.isArray(valor) && prototipo !== Object.prototype && prototipo !== null) {
    return valor;
  }
  const copia = Array.isArray(valor) ? [] : Object.create(prototipo);
  copias.set(valor, copia);
  for (const [clave, contenido] of Object.entries(valor)) {
    copia[clave] = copiarConfiguracionInmutable(contenido, copias);
  }
  return Object.freeze(copia);
}
