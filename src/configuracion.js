export const VERSION_JUEGO = "1.4";
export const VERSION_THREE = "0.185.1";
export const URL_THREE = `https://cdn.jsdelivr.net/npm/three@${VERSION_THREE}/build/three.module.js`;

export const CONFIGURACION = Object.freeze({
  mundo: Object.freeze({
    tamanoCuadricula: 64,
    tamanoBloque: 2,
    nivelFondo: -2,
    nivelMaximoColocacion: 10,
    margenLimite: 2.2,
  }),
  jugador: Object.freeze({
    alturaOjos: 1.68,
    radio: 0.4,
    velocidad: 6.4,
    corazones: 5,
    invulnerabilidadMs: 850,
  }),
  camara: Object.freeze({
    campoVision: 70,
    planoCercano: 0.08,
    planoLejano: 130,
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
    nieblaCercana: 30,
    nieblaLejana: 82,
  }),
  iluminacion: Object.freeze({
    ambiente: 1.8,
    hemisferio: 1.5,
    sol: 1.8,
  }),
  inventario: Object.freeze({
    limites: Object.freeze({
      pasto: 32,
      hojas: 32,
      madera: 35,
    }),
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
  aranas: Object.freeze({
    maximo: 4,
    cantidadInicial: 3,
    rangoVision: 18,
    semiAnguloVision: Math.PI * 0.3,
    memoriaPersecucionMs: 2_000,
    velocidadPatrulla: 1.15,
    velocidadPersecucion: 2.8,
    distanciaAtaque: 2.15,
    intervaloAtaqueMs: 950,
    radioCuerpo: 0.58,
    radioSpawnMinimo: 15,
    radioSpawnMaximo: 28,
    dano: 1,
  }),
});
