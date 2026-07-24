export const PERFILES_RENDIMIENTO = Object.freeze({
  basico: Object.freeze({
    id: "basico",
    distanciaCarga: 5,
    pixelRatio: 1,
    fps: 30,
    sombras: false,
    particulas: 0.35,
    entidadesActivas: 7,
    calidadAgua: "baja",
    resolucionDinamica: true,
  }),
  equilibrado: Object.freeze({
    id: "equilibrado",
    distanciaCarga: 6,
    pixelRatio: 1.25,
    fps: 45,
    sombras: false,
    particulas: 0.65,
    entidadesActivas: 12,
    calidadAgua: "media",
    resolucionDinamica: true,
  }),
  alto: Object.freeze({
    id: "alto",
    distanciaCarga: 10,
    pixelRatio: 1.6,
    fps: 60,
    sombras: true,
    particulas: 1,
    entidadesActivas: 22,
    calidadAgua: "alta",
    resolucionDinamica: false,
  }),
});

export const FPS_VALIDOS = Object.freeze([30, 45, 60, 0]);

export function resolverPerfilRendimiento(id, personalizado = {}) {
  const base = PERFILES_RENDIMIENTO[id] ?? PERFILES_RENDIMIENTO.equilibrado;
  if (id !== "personalizado") return base;
  return Object.freeze({
    id: "personalizado",
    distanciaCarga: limitarEntero(personalizado.distanciaCarga, 2, 32, 6),
    pixelRatio: limitarNumero(personalizado.pixelRatio, 0.65, 1.8, 1.2),
    fps: FPS_VALIDOS.includes(Number(personalizado.fps))
      ? Number(personalizado.fps)
      : 45,
    sombras: personalizado.sombras === true,
    particulas: limitarNumero(personalizado.particulas, 0, 1, 0.65),
    entidadesActivas: limitarEntero(
      personalizado.entidadesActivas,
      2,
      30,
      12,
    ),
    calidadAgua: ["baja", "media", "alta"].includes(
      personalizado.calidadAgua,
    )
      ? personalizado.calidadAgua
      : "media",
    resolucionDinamica: personalizado.resolucionDinamica !== false,
  });
}

export function intervaloRenderMs(fps) {
  const limite = Number(fps);
  return FPS_VALIDOS.includes(limite) && limite > 0 ? 1_000 / limite : 0;
}

function limitarNumero(valor, minimo, maximo, respaldo) {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? Math.max(minimo, Math.min(maximo, numero))
    : respaldo;
}

function limitarEntero(valor, minimo, maximo, respaldo) {
  return Math.floor(limitarNumero(valor, minimo, maximo, respaldo));
}
