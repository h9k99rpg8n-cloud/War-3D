export const ID_PLANTILLA_PLANA = "war:flat";
export const ID_PLANTILLA_LEGADA = "war:legacy_1_7";

export const PLANTILLAS_MUNDO = Object.freeze({
  "war:pond_grove": plantilla(
    "Arboleda del estanque",
    "Llanuras verdes con estanques y arboledas.",
    { lagos: 1.2, arena: 0.75, arboles: 1.15, montanas: 0.35, cuevas: 0.7 },
  ),
  "war:dry_plains": plantilla(
    "Llanura seca",
    "Terreno abierto sin agua y con vegetación escasa.",
    { lagos: 0, arena: 0.5, arboles: 0.55, montanas: 0.3, cuevas: 0.8 },
  ),
  "war:sandy_reaches": plantilla(
    "Extensión arenosa",
    "Más playas, arena y estanques poco profundos.",
    { lagos: 0.9, arena: 1.65, arboles: 0.7, montanas: 0.25, cuevas: 0.65 },
  ),
  "war:open_fields": plantilla(
    "Campos abiertos",
    "Grandes claros con muy pocos árboles.",
    { lagos: 0.55, arena: 0.65, arboles: 0.22, montanas: 0.45, cuevas: 0.75 },
  ),
  "war:stone_ridges": plantilla(
    "Sierras de piedra",
    "Relieve alto, montañas, cuevas y más minerales.",
    { lagos: 0.45, arena: 0.45, arboles: 0.72, montanas: 1.4, cuevas: 1.35 },
  ),
  [ID_PLANTILLA_PLANA]: Object.freeze({
    id: ID_PLANTILLA_PLANA,
    nombre: "Mundo plano",
    descripcion: "Superficie uniforme exclusiva del modo creativo.",
    soloCreativo: true,
    pesos: Object.freeze({
      lagos: 0,
      arena: 0,
      arboles: 0,
      montanas: 0,
      cuevas: 0,
    }),
  }),
  [ID_PLANTILLA_LEGADA]: Object.freeze({
    id: ID_PLANTILLA_LEGADA,
    nombre: "Generación clásica 1.7",
    descripcion: "Plantilla interna que conserva la forma de los mundos antiguos.",
    soloCreativo: false,
    legada: true,
    pesos: Object.freeze({
      lagos: 1,
      arena: 1,
      arboles: 1,
      montanas: 0,
      cuevas: 0,
    }),
  }),
});

export const IDS_PLANTILLAS_SUPERVIVENCIA = Object.freeze(
  Object.keys(PLANTILLAS_MUNDO).filter(
    (id) => id !== ID_PLANTILLA_PLANA && id !== ID_PLANTILLA_LEGADA,
  ),
);

export function seleccionarPlantillaMundo({
  modo = "supervivencia",
  plantillaId = null,
  semilla = 0,
} = {}) {
  const creativo = modo === "creativo";
  if (creativo && PLANTILLAS_MUNDO[plantillaId]) return plantillaId;
  if (creativo && plantillaId === ID_PLANTILLA_PLANA) return ID_PLANTILLA_PLANA;
  const indice = hashEntero(Number(semilla) || 0) % IDS_PLANTILLAS_SUPERVIVENCIA.length;
  return IDS_PLANTILLAS_SUPERVIVENCIA[indice];
}

export function obtenerPlantillaMundo(id) {
  return PLANTILLAS_MUNDO[id] ?? PLANTILLAS_MUNDO["war:pond_grove"];
}

export function esPlantillaPermitida(id, modo) {
  const plantillaActual = PLANTILLAS_MUNDO[id];
  if (!plantillaActual) return false;
  return modo === "creativo" || !plantillaActual.soloCreativo;
}

function plantilla(nombre, descripcion, pesos) {
  return Object.freeze({
    nombre,
    descripcion,
    soloCreativo: false,
    pesos: Object.freeze(pesos),
  });
}

function hashEntero(valor) {
  let numero = Math.floor(valor) >>> 0;
  numero ^= numero >>> 16;
  numero = Math.imul(numero, 0x7feb352d);
  numero ^= numero >>> 15;
  numero = Math.imul(numero, 0x846ca68b);
  numero ^= numero >>> 16;
  return numero >>> 0;
}
