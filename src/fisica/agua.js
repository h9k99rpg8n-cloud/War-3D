export function crearFisicaAgua(terreno, { experimental = false } = {}) {
  if (!terreno || typeof terreno.estaEnAgua !== "function") {
    throw new TypeError("El agua necesita un terreno con celdas líquidas.");
  }
  return {
    usaRapier: false,
    modo: experimental ? "experimental" : "classic",

    estaEnAgua(worldX, worldZ, pies, cabeza) {
      return terreno.estaEnAgua(worldX, worldZ, pies, cabeza);
    },

    obtenerParametrosMovimiento(base) {
      if (!base || typeof base !== "object") {
        throw new TypeError("El agua necesita parámetros de movimiento.");
      }
      if (!experimental) return base;
      return {
        ...base,
        multiplicadorMovimiento: Math.min(base.multiplicadorMovimiento, 0.44),
        gravedad: Math.max(base.gravedad, 5.2),
        velocidadAscenso: Math.max(base.velocidadAscenso, 4.5),
        velocidadHundimiento: Math.min(base.velocidadHundimiento, 0.72),
      };
    },

    obtenerCantidadSensores() {
      return 0;
    },
  };
}
