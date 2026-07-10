export const VERSION_JUEGO = "1.1";
export const VERSION_THREE = "0.185.1";
export const URL_THREE = `https://cdn.jsdelivr.net/npm/three@${VERSION_THREE}/build/three.module.js`;

export const CONFIGURACION = Object.freeze({
  mundo: Object.freeze({
    tamanoCuadricula: 36,
    tamanoBloque: 2,
    fondoTerreno: -1.7,
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
    exposicion: 1.18,
    colorCielo: 0x87b9d9,
    nieblaCercana: 30,
    nieblaLejana: 82,
  }),
  iluminacion: Object.freeze({
    ambiente: 1.6,
    hemisferio: 2.0,
    sol: 2.8,
  }),
});
