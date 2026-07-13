export const VERSION_JUEGO = "1.7.2";
export const VERSION_THREE = "0.185.1";
export const VERSION_RAPIER = "0.19.3";
export const VERSION_IDB = "8.0.3";
export const URL_THREE = `https://cdn.jsdelivr.net/npm/three@${VERSION_THREE}/build/three.module.js`;
export const URL_RAPIER = `https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@${VERSION_RAPIER}/rapier.mjs`;
export const URL_IDB = `https://cdn.jsdelivr.net/npm/idb@${VERSION_IDB}/+esm`;

export const CONFIGURACION = Object.freeze({
  mundo: Object.freeze({
    tamanoCuadricula: 128,
    tamanosDisponibles: Object.freeze([64, 96, 128]),
    tamanoBloque: 2,
    nivelFondo: -15,
    nivelMaximoColocacion: 10,
    margenLimite: 2.2,
  }),
  jugador: Object.freeze({
    alturaOjos: 1.68,
    radio: 0.4,
    velocidad: 6.4,
    velocidadSalto: 6.8,
    gravedad: 18,
    velocidadVuelo: 8.2,
    corazones: 5,
    invulnerabilidadMs: 850,
  }),
  camara: Object.freeze({
    campoVision: 70,
    planoCercano: 0.08,
    planoLejano: 300,
    velocidadMirada: 0.0036,
    inclinacionMinima: -1.12,
    inclinacionMaxima: 1.12,
    giroInicial: Math.PI * 0.18,
    inclinacionInicial: -0.06,
  }),
  renderizado: Object.freeze({
    proporcionPixelesMaxima: 1.75,
    proporcionPixelesMovil: 1.5,
    exposicion: 1,
    colorCielo: 0x87b9d9,
    nieblaCercana: 60,
    nieblaLejana: 190,
  }),
  iluminacion: Object.freeze({
    ambiente: 1.8,
    hemisferio: 1.5,
    sol: 1.8,
  }),
  inventario: Object.freeze({
    limites: Object.freeze({
      pasto: 35,
      hojas: 36,
      madera: 37,
      arena: 47,
      tierra: 40,
    }),
  }),
  lagos: Object.freeze({
    nivelAgua: 0,
    profundidadMaxima: 2,
  }),
  agua: Object.freeze({
    multiplicadorMovimiento: 0.58,
    gravedad: 3.4,
    velocidadAscenso: 4.2,
    velocidadHundimiento: 1.15,
    margenSuperficie: 0.14,
  }),
  fisica: Object.freeze({
    gravedad: -18,
    velocidadMaximaArena: 22,
  }),
  interaccion: Object.freeze({
    alcance: 14,
    duracionRotura: 950,
    toleranciaArrastre: 10,
    radioRecoleccion: 2.4,
    duracionVueloRecoleccion: 240,
  }),
  arboles: Object.freeze({
    separacion: 8,
    probabilidad: 0.68,
    alturaTronco: 3,
  }),
  cicloDiaNoche: Object.freeze({
    duraciones: Object.freeze({
      dia: 180_000,
      atardecer: 60_000,
      noche: 120_000,
      amanecer: 60_000,
    }),
  }),
  guardado: Object.freeze({
    intervaloMs: 10_000,
    versionProgreso: 1,
  }),
  aranas: Object.freeze({
    maximo: 12,
    cantidadInicial: 3,
    rangoVision: 10,
    semiAnguloVision: Math.PI * 0.3,
    memoriaPersecucionMs: 1_200,
    velocidadPatrulla: 1.15,
    velocidadPersecucion: 2.3,
    distanciaAtaque: 2.15,
    intervaloAtaqueMs: 1_200,
    duracionAtaqueMs: 480,
    retrasoGolpeMs: 190,
    velocidadEscalada: 3.6,
    alturaEscalable: 2.2,
    radioCuerpo: 0.58,
    radioSpawnMinimo: 15,
    radioSpawnMaximo: 28,
    dano: 1,
  }),
  zombies: Object.freeze({
    tamanoGrupo: 3,
    cantidadGrupos: 1,
    maximo: 12,
    rangoVision: 14,
    memoriaPersecucionMs: 1_600,
    velocidadCaminar: 0.9,
    velocidadCorrer: 2.15,
    distanciaAtaque: 1.85,
    intervaloAtaqueMs: 1_350,
    duracionAtaqueMs: 620,
    retrasoGolpeMs: 270,
    radioCuerpo: 0.46,
    radioSpawnMinimo: 17,
    radioSpawnMaximo: 29,
    dano: 1,
    duracionQuemaduraMs: 4_800,
    particulasPorSegundo: 9,
  }),
});
