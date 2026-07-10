export const VERSION_JUEGO = "1.3";
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
    velocidad: 6.4,
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
});
