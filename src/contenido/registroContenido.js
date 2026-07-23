const LIMITE_PILA_PREDETERMINADO = 32;

const contenido = {
  pasto: bloque("Bloque de pasto", "inventory-tile--grass", 35, {
    dureza: 0.75,
    familia: "tierra",
  }),
  hojas: bloque("Bloque de hojas", "inventory-tile--leaves", 36, {
    dureza: 0.35,
    familia: "vegetacion",
    transparente: true,
  }),
  madera: bloque("Bloque de madera", "inventory-tile--wood", 37, {
    dureza: 1.65,
    familia: "madera",
  }),
  arena: bloque("Bloque de arena", "inventory-tile--sand", 47, {
    dureza: 0.7,
    familia: "arena",
    gravedad: true,
  }),
  tierra: bloque("Bloque de tierra", "inventory-tile--dirt", 40, {
    dureza: 0.8,
    familia: "tierra",
  }),
  piedra: bloque("Piedra", "inventory-tile--stone", 48, {
    dureza: 3.2,
    familia: "piedra",
    herramientaRecomendada: "pico",
  }),
  piedra_lisa: bloque("Piedra lisa", "inventory-tile--smooth-stone", 48, {
    dureza: 3.35,
    familia: "piedra",
    herramientaRecomendada: "pico",
  }),
  carbon_mineral: bloque("Mineral de carbón", "inventory-tile--coal-ore", 48, {
    dureza: 5.2,
    familia: "mineral",
    herramientaRecomendada: "pico",
    nivelMinimo: 0,
    suelta: "carbon",
  }),
  hierro_mineral: bloque("Mineral de hierro", "inventory-tile--iron-ore", 48, {
    dureza: 6.4,
    familia: "mineral",
    herramientaRecomendada: "pico",
    nivelMinimo: 2,
    suelta: "hierro_bruto",
  }),
  tablones: bloque("Tablones de madera", "inventory-tile--planks", 48, {
    dureza: 1.3,
    familia: "madera",
  }),
  mesa_crafteo: bloque("Mesa de crafteo", "inventory-tile--crafting-table", 16, {
    dureza: 1.8,
    familia: "estacion",
    comportamientos: ["war:crafting_station"],
  }),
  horno: bloque("Horno", "inventory-tile--furnace", 16, {
    dureza: 4.5,
    familia: "estacion",
    herramientaRecomendada: "pico",
    comportamientos: ["war:furnace_station"],
  }),
  cristal: bloque("Cristal", "inventory-tile--glass", 32, {
    dureza: 0.45,
    familia: "cristal",
    transparente: true,
    comportamientos: ["war:transparent_block"],
  }),
  palo: objeto("Palo", "inventory-tile--stick", 64),
  carbon: objeto("Carbón", "inventory-tile--coal", 64),
  hierro_bruto: objeto("Hierro bruto", "inventory-tile--raw-iron", 48),
  pico_madera: herramienta("Pico de madera", "inventory-tile--wood-pickaxe", {
    durabilidad: 59,
    velocidadMineria: 3.6,
    dano: 2,
    familia: "pico",
    nivelMineria: 1,
  }),
  arco: herramienta("Arco de umbral", "inventory-tile--threshold-bow", {
    durabilidad: 96,
    velocidadMineria: 0.65,
    dano: 3,
    familia: "arco",
    nivelMineria: 0,
  }),
  huevo_arana: huevo(
    "Huevo de Araña Umbral",
    "inventory-tile--spider-egg",
    "war:spider",
  ),
  huevo_zombie: huevo(
    "Huevo de Zombi",
    "inventory-tile--zombie-egg",
    "war:zombie",
  ),
  huevo_esqueleto_umbral: huevo(
    "Huevo de Esqueleto de Umbral",
    "inventory-tile--threshold-egg",
    "war:threshold_skeleton",
  ),
};

export const REGISTRO_CONTENIDO = Object.freeze(
  Object.fromEntries(
    Object.entries(contenido).map(([id, definicion]) => [
      id,
      Object.freeze({ id, ...definicion }),
    ]),
  ),
);

export const IDS_BLOQUES = Object.freeze(
  Object.values(REGISTRO_CONTENIDO)
    .filter((definicion) => definicion.categoria === "bloque")
    .map((definicion) => definicion.id),
);

export const IDS_RECOLECTABLES = Object.freeze(
  Object.keys(REGISTRO_CONTENIDO),
);

export const IDS_HUEVOS = Object.freeze(
  Object.values(REGISTRO_CONTENIDO)
    .filter((definicion) => definicion.categoria === "entidad")
    .map((definicion) => definicion.id),
);

export function obtenerDefinicionContenido(id) {
  return REGISTRO_CONTENIDO[id] ?? null;
}

export function esBloqueColocable(id) {
  return REGISTRO_CONTENIDO[id]?.categoria === "bloque";
}

export function esHuevoGenerador(id) {
  return REGISTRO_CONTENIDO[id]?.categoria === "entidad";
}

export function limitePilaContenido(id) {
  const limite = Number(REGISTRO_CONTENIDO[id]?.limitePila);
  return Number.isFinite(limite) && limite > 0
    ? Math.floor(limite)
    : LIMITE_PILA_PREDETERMINADO;
}

export function calcularRotura(idBloque, herramienta = null, creativo = false) {
  const bloqueActual = REGISTRO_CONTENIDO[idBloque];
  if (!bloqueActual || bloqueActual.categoria !== "bloque") {
    return Object.freeze({
      duracionMs: Number.POSITIVE_INFINITY,
      obtieneRecurso: false,
      desgaste: 0,
    });
  }
  if (creativo) {
    return Object.freeze({ duracionMs: 90, obtieneRecurso: false, desgaste: 0 });
  }

  const datosHerramienta =
    herramienta?.categoria === "herramienta" ? herramienta.herramienta : null;
  const coincide =
    !bloqueActual.herramientaRecomendada ||
    datosHerramienta?.familia === bloqueActual.herramientaRecomendada;
  const velocidad = coincide
    ? Math.max(0.2, Number(datosHerramienta?.velocidadMineria) || 1)
    : 0.38;
  const nivel = Number(datosHerramienta?.nivelMineria) || 0;
  const nivelMinimo = Number(bloqueActual.nivelMinimo) || 0;

  return Object.freeze({
    duracionMs: Math.max(180, Math.round((bloqueActual.dureza * 900) / velocidad)),
    obtieneRecurso: nivel >= nivelMinimo,
    desgaste: datosHerramienta ? 1 : 0,
    suelta: bloqueActual.suelta ?? idBloque,
  });
}

function bloque(nombre, clase, limitePila, opciones = {}) {
  return {
    nombre,
    clase,
    categoria: "bloque",
    limitePila,
    dureza: opciones.dureza ?? 1,
    familia: opciones.familia ?? "construccion",
    herramientaRecomendada: opciones.herramientaRecomendada ?? null,
    nivelMinimo: opciones.nivelMinimo ?? 0,
    suelta: opciones.suelta ?? null,
    gravedad: Boolean(opciones.gravedad),
    transparente: Boolean(opciones.transparente),
    comportamientos: Object.freeze([
      "war:solid_collision",
      "war:player_held_item",
      ...(opciones.comportamientos ?? []),
    ]),
    sostenido: Object.freeze({
      visible: true,
      renderMode: "sprite",
      escala: 0.82,
    }),
  };
}

function objeto(nombre, clase, limitePila) {
  return {
    nombre,
    clase,
    categoria: "objeto",
    limitePila,
    comportamientos: Object.freeze(["war:dropped_item", "war:player_held_item"]),
    sostenido: Object.freeze({
      visible: true,
      renderMode: "sprite",
      escala: 0.72,
    }),
  };
}

function herramienta(nombre, clase, datos) {
  return {
    nombre,
    clase,
    categoria: "herramienta",
    limitePila: 1,
    herramienta: Object.freeze({ ...datos }),
    comportamientos: Object.freeze(["war:mining_tool", "war:player_held_item"]),
    sostenido: Object.freeze({
      visible: true,
      renderMode: "sprite",
      escala: 0.9,
    }),
  };
}

function huevo(nombre, clase, entidadId) {
  return {
    nombre,
    clase,
    categoria: "entidad",
    limitePila: 16,
    entidadId,
    comportamientos: Object.freeze(["war:spawn_egg", "war:player_held_item"]),
    sostenido: Object.freeze({
      visible: true,
      renderMode: "sprite",
      escala: 0.75,
    }),
  };
}
