const COMPONENTE_AGUA_PREDETERMINADO = Object.freeze({
  blocksFlow: true,
  allowsWaterInside: false,
  displaceableByWater: false,
  receivesWaterUpdates: false,
});

const COMPONENTES_AGUA = new Map([
  [
    "arena",
    Object.freeze({
      blocksFlow: true,
      allowsWaterInside: false,
      displaceableByWater: false,
      receivesWaterUpdates: true,
    }),
  ],
]);

export function registrarInteraccionAgua(idBloque, definicion) {
  const id = String(idBloque || "");
  if (!id) throw new TypeError("El componente de agua necesita un bloque.");
  const normalizada = normalizarInteraccionAgua(definicion);
  COMPONENTES_AGUA.set(id, Object.freeze(normalizada));
  return COMPONENTES_AGUA.get(id);
}

export function obtenerInteraccionAgua(idBloque) {
  return COMPONENTES_AGUA.get(String(idBloque)) ??
    COMPONENTE_AGUA_PREDETERMINADO;
}

export function puedeAguaOcuparCelda(idBloque) {
  if (!idBloque) return true;
  const componente = obtenerInteraccionAgua(idBloque);
  return componente.allowsWaterInside && !componente.blocksFlow;
}

export function resolverVecindadAgua(idBloque) {
  const componente = obtenerInteraccionAgua(idBloque);
  return Object.freeze({
    bloquea: componente.blocksFlow || !componente.allowsWaterInside,
    reemplaza: componente.displaceableByWater,
    encolaActualizacion: componente.receivesWaterUpdates,
  });
}

function normalizarInteraccionAgua(definicion = {}) {
  for (const propiedad of [
    "blocksFlow",
    "allowsWaterInside",
    "displaceableByWater",
    "receivesWaterUpdates",
  ]) {
    if (typeof definicion[propiedad] !== "boolean") {
      throw new TypeError(`war:water_interaction necesita ${propiedad}.`);
    }
  }
  if (definicion.blocksFlow && definicion.allowsWaterInside) {
    throw new TypeError(
      "Una celda no puede bloquear el flujo y contener agua simultáneamente.",
    );
  }
  return {
    blocksFlow: definicion.blocksFlow,
    allowsWaterInside: definicion.allowsWaterInside,
    displaceableByWater: definicion.displaceableByWater,
    receivesWaterUpdates: definicion.receivesWaterUpdates,
  };
}
