// @ts-check

/**
 * Instantánea de datos, no de recursos vivos (DOM, Map, Date, funciones, etc.).
 * Conserva referencias compartidas y ciclos; no ejecuta getters.
 * @param {unknown} valor
 * @param {WeakMap<object, object>} copias
 * @returns {unknown}
 */
export function copiarConfiguracionInmutable(valor, copias = new WeakMap()) {
  if (valor === null || valor === undefined || typeof valor === "string" || typeof valor === "boolean") return valor;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor !== "object") throw new TypeError("La configuración solo admite datos finitos.");
  if (copias.has(valor)) return copias.get(valor);
  const prototipo = Object.getPrototypeOf(valor);
  if (!Array.isArray(valor) && prototipo !== Object.prototype && prototipo !== null) {
    throw new TypeError("La configuración solo admite objetos planos y arrays.");
  }
  const copia = Array.isArray(valor) ? new Array(valor.length) : Object.create(prototipo);
  copias.set(valor, copia);
  for (const clave of Reflect.ownKeys(valor)) {
    if (Array.isArray(valor) && clave === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(valor, clave);
    if (typeof clave !== "string" || !descriptor || !("value" in descriptor)) {
      throw new TypeError("La configuración no admite símbolos ni accessors.");
    }
    Object.defineProperty(copia, clave, {
      value: copiarConfiguracionInmutable(descriptor.value, copias),
      enumerable: descriptor.enumerable === true,
    });
  }
  return Object.freeze(copia);
}

/**
 * Compara datos incluso si contienen ciclos, sin confundir arrays con objetos.
 * @param {unknown} izquierda
 * @param {unknown} derecha
 * @param {WeakMap<object, object>} parejas
 * @param {WeakMap<object, object>} inversas
 * @returns {boolean}
 */
export function configuracionesIguales(izquierda, derecha, parejas = new WeakMap(), inversas = new WeakMap()) {
  if (Object.is(izquierda, derecha)) return true;
  if (!izquierda || !derecha || typeof izquierda !== "object" || typeof derecha !== "object") return false;
  if (Object.getPrototypeOf(izquierda) !== Object.getPrototypeOf(derecha)) return false;
  if (parejas.has(izquierda) || inversas.has(derecha)) {
    return parejas.get(izquierda) === derecha && inversas.get(derecha) === izquierda;
  }
  parejas.set(izquierda, derecha);
  inversas.set(derecha, izquierda);
  const claves = Reflect.ownKeys(izquierda);
  if (claves.length !== Reflect.ownKeys(derecha).length) return false;
  return claves.every((clave) => {
    const a = Object.getOwnPropertyDescriptor(izquierda, clave);
    const b = Object.getOwnPropertyDescriptor(derecha, clave);
    return !!a && !!b && "value" in a && "value" in b &&
      a.enumerable === b.enumerable && configuracionesIguales(a.value, b.value, parejas, inversas);
  });
}
