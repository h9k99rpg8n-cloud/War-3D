export const CONSEJOS_CARGA = Object.freeze([
  consejo(
    "war:tip_glass",
    "loading.tip.glass",
    "Funde arena en un horno usando carbón para crear cristal.",
    ["furnace", "glass"],
  ),
  consejo(
    "war:tip_pickaxe",
    "loading.tip.pickaxe",
    "El pico de madera rompe carbón más rápido que la mano.",
    ["wooden_pickaxe", "coal"],
  ),
  consejo(
    "war:tip_controls",
    "loading.tip.controls",
    "Puedes reorganizar los controles desde Ajustes.",
    ["hud_editor"],
  ),
  consejo(
    "war:tip_stack",
    "loading.tip.stack",
    "En supervivencia, cada stack puede contener hasta 92 objetos.",
    ["inventory"],
  ),
  consejo(
    "war:tip_caves",
    "loading.tip.caves",
    "Las cuevas pueden contener hierro y enemigos peligrosos.",
    ["caves", "iron", "threshold_skeleton"],
  ),
  consejo(
    "war:tip_distance",
    "loading.tip.distance",
    "Reduce la distancia de carga para mejorar el rendimiento.",
    ["screen_loading"],
  ),
]);

export function elegirConsejoCarga({
  semilla = Date.now(),
  funciones = null,
  anteriorId = null,
} = {}) {
  const disponibles = CONSEJOS_CARGA.filter((actual) =>
    actual.requiredFeatures.every((id) => !funciones || funciones.has(id)),
  );
  if (!disponibles.length) return null;
  const indiceBase = Math.abs(Math.floor(Number(semilla) || 0)) % disponibles.length;
  const elegida = disponibles[indiceBase];
  if (elegida.id !== anteriorId || disponibles.length === 1) return elegida;
  return disponibles[(indiceBase + 1) % disponibles.length];
}

function consejo(id, textKey, texto, requiredFeatures = []) {
  return Object.freeze({
    id,
    textKey,
    texto,
    requiredFeatures: Object.freeze([...requiredFeatures]),
  });
}
