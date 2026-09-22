// @ts-check
import { copiarConfiguracionInmutable, configuracionesIguales } from "./configuracionComponentes.js";

/** @typedef {import('../contratos/componentCore').WarComponentId} Id */
/** @typedef {import('../contratos/componentCore').WarComponentDefinition<unknown>} Definicion */
/** @typedef {import('../contratos/componentCore').WarComponentAttachment<unknown>} Adjunto */
/** @typedef {Omit<Definicion, 'family'|'type'|'parent'|'experimental'> & Partial<Pick<Definicion, 'family'|'type'|'parent'|'experimental'>>} Entrada */

const ID_VALIDO = /^war:[a-z][a-z0-9_]*$/;
const TIPOS_VALIDOS = new Set(["component", "subcomponent", "system", "api"]);

export class RegistroComponentes {
  /** @type {Map<string, Definicion>} */
  #registros = new Map();
  /** @type {WeakMap<object, Map<string, Adjunto>>} */
  #adjuntos = new WeakMap();
  /** @type {WeakMap<object, Set<string>>} */
  #adjuntando = new WeakMap();

  /** @param {Entrada} definicion */
  registrar(definicion) {
    const normalizada = validarDefinicion(definicion, this.#registros);
    if (this.#registros.has(normalizada.id)) {
      throw new Error(`El componente ${normalizada.id} ya está registrado.`);
    }
    const anteriores = new Map(this.#registros);
    this.#registros.set(normalizada.id, normalizada);
    try {
      normalizada.onRegister?.();
    } catch (error) {
      // También revierte registros anidados del hook: no deja hijos huérfanos.
      this.#registros = anteriores;
      throw error;
    }
    return normalizada;
  }

  /** @param {string} id */
  obtener(id) {
    return this.#registros.get(String(id)) ?? null;
  }

  /** @param {string} id @param {object} host */
  obtenerAdjunto(id, host) {
    return this.#adjuntos.get(host)?.get(id) ?? null;
  }

  /** @param {string} id @param {unknown} configuracion */
  validar(id, configuracion = {}) {
    const definicion = this.obtener(id);
    if (!definicion) return false;
    try {
      return definicion.validate(copiarConfiguracionInmutable(configuracion)) === true;
    } catch {
      return false;
    }
  }

  /** @param {string} id @param {object} host @param {unknown} configuracion */
  adjuntar(id, host, configuracion = {}) {
    const definicion = this.obtener(id);
    if (!definicion) throw new Error(`Componente desconocido: ${id}`);
    if ((typeof host !== "object" && typeof host !== "function") || host === null) {
      throw new TypeError(`Host inválido para ${id}`);
    }
    const configuracionInmutable = copiarConfiguracionInmutable(configuracion);
    if (!this.validar(id, configuracionInmutable)) {
      throw new TypeError(`Configuración inválida para ${id}`);
    }
    const actuales = this.#adjuntos.get(host) ?? new Map();
    const existente = actuales.get(id);
    if (existente) {
      if (!configuracionesIguales(existente.configuracion, configuracionInmutable)) {
        throw new TypeError(`El host ya tiene ${id} con otra configuración.`);
      }
      return existente;
    }
    const pendientes = this.#adjuntando.get(host) ?? new Set();
    if (pendientes.has(id)) throw new TypeError(`Adjunto recursivo de ${id}`);
    pendientes.add(id);
    this.#adjuntando.set(host, pendientes);
    this.#adjuntos.set(host, actuales);
    try {
      definicion.onAttach?.(host, configuracionInmutable);
      const adjunto = Object.freeze({ definicion, host, configuracion: configuracionInmutable });
      actuales.set(id, adjunto);
      return adjunto;
    } finally {
      pendientes.delete(id);
      if (!pendientes.size) this.#adjuntando.delete(host);
      if (!actuales.size) this.#adjuntos.delete(host);
    }
  }

  /** @param {{familia?: string, tipo?: Definicion['type'], experimental?: boolean}} filtros */
  listar(filtros = {}) {
    const { familia = null, tipo = null, experimental = null } = filtros;
    return [...this.#registros.values()].filter((definicion) => {
      if (familia && definicion.family !== familia) return false;
      if (tipo && definicion.type !== tipo) return false;
      if (experimental !== null && definicion.experimental !== experimental) return false;
      return true;
    });
  }

  /** @param {string} id @param {string} padreId */
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

  /** @param {string} id */
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

/** @param {Id} id @param {string} family @param {(config: unknown) => boolean} validate @returns {Definicion} */
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

/** @param {Id} id @param {Id} parent @param {string} family @param {(config: unknown) => boolean} validate @returns {Definicion} */
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

/** @param {Entrada} definicion @param {Map<string, Definicion>} registros @returns {Definicion} */
function validarDefinicion(definicion, registros) {
  if (!definicion || typeof definicion !== "object") {
    throw new TypeError("La definición de componente debe ser un objeto.");
  }
  const id = definicion.id;
  if (typeof id !== "string" || !ID_VALIDO.test(id)) {
    throw new TypeError(`Identificador de componente inválido: ${id}`);
  }
  const version = definicion.version;
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new TypeError(`Versión inválida para ${id}`);
  }
  const type = definicion.type ?? "component";
  if (!TIPOS_VALIDOS.has(type)) {
    throw new TypeError(`Tipo de componente inválido para ${id}: ${type}`);
  }
  const parent = definicion.parent ?? null;
  if (parent !== null && (typeof parent !== "string" || !ID_VALIDO.test(parent))) {
    throw new TypeError(`Padre inválido para ${id}`);
  }
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
  for (const hook of [definicion.onRegister, definicion.onAttach]) {
    if (hook !== undefined && typeof hook !== "function") throw new TypeError(`Hook inválido para ${id}`);
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

/** @param {unknown} configuracion */
function configuracionValida(configuracion) {
  return configuracion === undefined || (
    configuracion !== null && typeof configuracion === "object"
  );
}

/** @param {unknown} configuracion @returns {configuracion is Record<string, unknown>} */
function esObjeto(configuracion) {
  return configuracion !== null && typeof configuracion === "object" && !Array.isArray(configuracion);
}

/** @param {unknown} configuracion */
function validarColor(configuracion) {
  if (!esObjeto(configuracion)) return false;
  const valor = String(configuracion.value ?? configuracion.color ?? "").trim();
  return valor.length > 0 && valor.length <= 64;
}

/** @param {unknown} configuracion */
function validarRecurso(configuracion) {
  if (!esObjeto(configuracion)) return false;
  const recurso = String(
    configuracion.resource ?? configuracion.texture ?? configuracion.material ?? configuracion.icon ?? "",
  ).trim();
  return recurso.length > 0 && recurso.length <= 256;
}

/** @param {unknown} configuracion */
function validarBooleanoOpcional(configuracion) {
  if (configuracion === undefined || configuracion === null) return true;
  if (!esObjeto(configuracion)) return false;
  return configuracion.enabled === undefined || typeof configuracion.enabled === "boolean";
}

/** @param {unknown} configuracion */
function validarAnimacion(configuracion) {
  if (!esObjeto(configuracion)) return false;
  const nombre = String(configuracion.name ?? "").trim();
  const duracion = configuracion.durationMs === undefined ? 250 : Number(configuracion.durationMs);
  return nombre.length > 0 && Number.isFinite(duracion) && duracion >= 0 && duracion <= 60_000;
}

/** @param {unknown} configuracion */
function validarOpacidad(configuracion) {
  if (!esObjeto(configuracion)) return false;
  const valor = Number(configuracion.value ?? configuracion.opacity);
  return Number.isFinite(valor) && valor >= 0 && valor <= 1;
}

/** @param {unknown} configuracion */
function validarResolucionPixel(configuracion) {
  if (!esObjeto(configuracion)) return false;
  const ancho = configuracion.width;
  const alto = configuracion.height;
  return (
    typeof ancho === "number" && typeof alto === "number" &&
    Number.isInteger(ancho) &&
    Number.isInteger(alto) &&
    ancho >= 1 &&
    ancho <= 2048 &&
    alto >= 1 &&
    alto <= 2048 &&
    (configuracion.imageSmoothing === undefined || configuracion.imageSmoothing === false)
  );
}

/** @param {unknown} configuracion */
function validarCamaraPreview(configuracion) {
  if (!esObjeto(configuracion)) return false;
  const distancia = configuracion.distance ?? 12;
  const movimiento = String(configuracion.movement ?? "horizontal");
  return (
    typeof distancia === "number" &&
    Number.isFinite(distancia) &&
    distancia > 0 &&
    distancia <= 256 &&
    ["static", "horizontal", "orbit"].includes(movimiento)
  );
}
