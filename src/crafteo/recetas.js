export const RECETAS_CRAFTEO = Object.freeze([
  receta(
    "war:planks_from_logs",
    "inventory",
    [{ itemId: "madera", amount: 4 }],
    { itemId: "tablones", amount: 4 },
    { shapeless: true },
  ),
  receta(
    "war:sticks_from_planks",
    "inventory",
    [{ itemId: "tablones", amount: 2 }],
    { itemId: "palo", amount: 4 },
    { shapeless: true },
  ),
  receta(
    "war:crafting_table",
    "inventory",
    [{ itemId: "tablones", amount: 4 }],
    { itemId: "mesa_crafteo", amount: 1 },
    { shapeless: true },
  ),
  receta(
    "war:wooden_pickaxe",
    "crafting_table",
    [
      { itemId: "tablones", amount: 3 },
      { itemId: "palo", amount: 2 },
    ],
    { itemId: "pico_madera", amount: 1 },
    {
      pattern: ["PPP", " S ", " S "],
      key: { P: "tablones", S: "palo" },
    },
  ),
  receta(
    "war:furnace",
    "crafting_table",
    [{ itemId: "piedra", amount: 8 }],
    { itemId: "horno", amount: 1 },
    {
      pattern: ["PPP", "P P", "PPP"],
      key: { P: "piedra" },
    },
  ),
  receta(
    "war:smooth_stone",
    "crafting_table",
    [{ itemId: "piedra", amount: 4 }],
    { itemId: "piedra_lisa", amount: 4 },
    {
      pattern: ["PP", "PP"],
      key: { P: "piedra" },
    },
  ),
  receta(
    "war:glass",
    "furnace",
    [
      { itemId: "arena", amount: 1 },
      { itemId: "carbon", amount: 1, role: "fuel" },
    ],
    { itemId: "cristal", amount: 1 },
    { shapeless: true },
  ),
]);

export function recetasParaEstacion(estacion) {
  return RECETAS_CRAFTEO.filter((recetaActual) => recetaActual.station === estacion);
}

export function obtenerReceta(id) {
  return RECETAS_CRAFTEO.find((recetaActual) => recetaActual.id === id) ?? null;
}

function receta(id, station, ingredients, result, opciones = {}) {
  return Object.freeze({
    id,
    station,
    ingredients: Object.freeze(
      ingredients.map((ingrediente) => Object.freeze({ ...ingrediente })),
    ),
    result: Object.freeze({ ...result }),
    shapeless: opciones.shapeless === true,
    pattern: Array.isArray(opciones.pattern)
      ? Object.freeze([...opciones.pattern])
      : null,
    key: opciones.key ? Object.freeze({ ...opciones.key }) : null,
  });
}
