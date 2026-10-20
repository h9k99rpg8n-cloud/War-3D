export function crearFisicaAgua(terreno, { experimental = false } = {}) {
  if (!terreno || typeof terreno.estaEnAgua !== "function") {
    throw new TypeError("El agua necesita un terreno con celdas líquidas.");
  }
  return {
    usaRapier: false,
    modo: experimental ? "experimental" : "classic",

    estaEnAgua(worldX, worldZ, pies, cabeza) {
      // El modo experimental añade un margen de contacto pequeño para que la
      // flotación no parpadee cuando el jugador cruza la superficie del agua.
      const margen = experimental ? 0.08 : 0;
      return terreno.estaEnAgua(
        worldX,
        worldZ,
        pies - margen,
        cabeza + margen,
      );
    },

    obtenerCantidadSensores() {
      return 0;
    },
  };
}
