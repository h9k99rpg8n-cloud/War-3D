const ID_VALIDO = /^war:[a-z][a-z0-9_]*$/;

export class RegistroComportamientos {
  #registros = new Map();

  registrar(definicion) {
    const normalizada = validarDefinicion(definicion);
    if (this.#registros.has(normalizada.id)) {
      throw new Error(`El comportamiento ${normalizada.id} ya está registrado.`);
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
];

for (const definicion of definicionesIniciales) {
  comportamientosWar.registrar(definicion);
}

function comportamiento(
  id,
  category,
  experimental,
  validate = configuracionValida,
) {
  return {
    id,
    version: 1,
    category,
    experimental,
    validate,
  };
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
  return Object.freeze({
    ...definicion,
    id: String(definicion.id),
    version,
    category: String(definicion.category || "general"),
    experimental: Boolean(definicion.experimental),
  });
}

function configuracionValida(configuracion) {
  return configuracion === undefined || (
    configuracion !== null && typeof configuracion === "object"
  );
}
