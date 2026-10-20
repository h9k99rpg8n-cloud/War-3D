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

    obtenerCantidadSensores() {
      return 0;
    },
  };
}
