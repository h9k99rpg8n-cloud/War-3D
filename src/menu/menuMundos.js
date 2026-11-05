/**
 * Miniatura de mundo pintada en un canvas 2D.
 *
 * Antes la tarjeta dibujaba un paisaje fijo. Ahora usa exactamente el mismo
 * terreno procedural que la vista 3D del menú, semilla por semilla, así que
 * cada tarjeta refleja su propio mundo.
 */
import { crearGlifos, crearTerrenoMenu, ruidoFractal, vestirTerreno } from "./terrenoMenu.js";

export function pintarMiniaturaMundo(canvas, mundo, opciones = {}) {
  if (!canvas) return;
  const contexto = canvas.getContext("2d");
  if (!contexto) return;
  contexto.imageSmoothingEnabled = false;

  const ancho = canvas.width || 160;
  const alto = canvas.height || 90;
  const semilla =
    mundo?.plantillaId === "war:flat"
      ? "PLANO"
      : `WAR-${Number(mundo?.semilla) || 1}`;
  const noche = mundo?.tiempo === "siempre_noche";
  const nocturno = noche || (mundo?.tiempo === "normal" && false);

  // Cielo con degradado en bandas (pixel art, no degradado suave).
  const bandas = nocturno
    ? ["#0f1730", "#16213d", "#1d2b4a", "#24375a"]
    : ["#5aa8dc", "#6fb6e4", "#87c3ea", "#a4d3ee"];
  const altoCielo = Math.round(alto * 0.62);
  for (let indice = 0; indice < bandas.length; indice += 1) {
    contexto.fillStyle = bandas[indice];
    contexto.fillRect(
      0,
      Math.floor((altoCielo / bandas.length) * indice),
      ancho,
      Math.ceil(altoCielo / bandas.length) + 1,
    );
  }

  // Sol o luna pixelados.
  contexto.fillStyle = nocturno ? "#f4f3d8" : "#ffd762";
  const tamanoAstro = Math.max(7, Math.round(ancho * 0.07));
  const xAstro = ancho - tamanoAstro * 2.6;
  const yAstro = Math.round(alto * 0.16);
  contexto.fillRect(xAstro, yAstro, tamanoAstro, tamanoAstro);
  contexto.fillRect(xAstro + tamanoAstro, yAstro - tamanoAstro * 0.5, tamanoAstro * 0.6, tamanoAstro * 1.6);
  contexto.fillRect(xAstro - tamanoAstro * 0.5, yAstro - tamanoAstro * 0.5, tamanoAstro * 0.6, tamanoAstro * 1.6);

  // Estrellas deterministas de noche.
  if (nocturno) {
    contexto.fillStyle = "rgb(255 255 255 / .75)";
    for (let indice = 0; indice < 14; indice += 1) {
      const x = Math.floor(ruidoFractal(indice, 3, 77, 2) * ancho);
      const y = Math.floor(ruidoFractal(indice, 9, 91, 2) * altoCielo * 0.7);
      contexto.fillRect(x, y, 2, 2);
    }
  }

  // Perfil del terreno: siluetas en capas para dar profundidad.
  const muestras = Math.max(24, Math.floor(ancho / 4));
  const colorLejano = nocturno ? "#1b3550" : "#4f9d6a";
  const colorCerca = nocturno ? "#123020" : "#3f8a44";
  const colorTierra = nocturno ? "#2a2018" : "#6b512e";

  pintarCapa(contexto, {
    muestras,
    ancho,
    alto,
    base: alto * 0.66,
    amplitud: alto * 0.16,
    semilla: `${semilla}-lejos`,
    color: colorLejano,
  });
  pintarCapa(contexto, {
    muestras,
    ancho,
    alto,
    base: alto * 0.78,
    amplitud: alto * 0.12,
    semilla: `${semilla}-cerca`,
    color: colorCerca,
  });

  // Franja de tierra con textura de bloques.
  contexto.fillStyle = colorTierra;
  contexto.fillRect(0, Math.round(alto * 0.82), ancho, alto);
  contexto.fillStyle = nocturno ? "#1e3a26" : "#54a24e";
  contexto.fillRect(0, Math.round(alto * 0.82) - 3, ancho, 3);

  // Árboles procedurales del mismo mundo.
  const arboles = 3 + (Math.abs(Number(mundo?.semilla) || 1) % 4);
  for (let indice = 0; indice < arboles; indice += 1) {
    const x = Math.round(
      ruidoFractal(indice * 5.3, 1.7, mundo?.semilla || 1, 2) * (ancho - 14),
    );
    const yBase = Math.round(alto * 0.82);
    contexto.fillStyle = "#6b4526";
    contexto.fillRect(x + 2, yBase - 12, 3, 12);
    contexto.fillStyle = nocturno ? "#174628" : "#2f7a37";
    contexto.fillRect(x - 3, yBase - 20, 12, 9);
    contexto.fillRect(x - 1, yBase - 24, 8, 5);
  }

  // Reflejo y borde inferior.
  contexto.fillStyle = "rgba(255,255,255,.14)";
  contexto.fillRect(0, Math.round(alto * 0.82) - 4, ancho, 1);

  // Etiqueta de semilla: cada miniatura es única y verificable.
  contexto.fillStyle = "rgba(0,0,0,.34)";
  contexto.fillRect(0, alto - 11, ancho, 11);
  contexto.fillStyle = "rgba(255,255,255,.82)";
  contexto.font = "bold 8px ui-monospace, monospace";
  contexto.fillText(`SEMILLA ${semilla}`, 4, alto - 3);
}

function pintarCapa(contexto, { muestras, ancho, alto, base, amplitud, semilla, color }) {
  contexto.fillStyle = color;
  contexto.beginPath();
  contexto.moveTo(0, alto);
  for (let indice = 0; indice <= muestras; indice += 1) {
    const x = (indice / muestras) * ancho;
    const ruido = ruidoFractal(indice * 0.42, 0, hashTexto(semilla), 3);
    const y = base - ruido * amplitud;
    contexto.lineTo(x, y);
  }
  contexto.lineTo(ancho, alto);
  contexto.closePath();
  contexto.fill();

  // Contorno escalonado tipo voxel.
  contexto.fillStyle = "rgba(255,255,255,.07)";
  for (let indice = 0; indice < muestras; indice += 2) {
    const x = (indice / muestras) * ancho;
    const ruido = ruidoFractal(indice * 0.42, 0, hashTexto(semilla), 3);
    contexto.fillRect(Math.round(x), Math.round(base - ruido * amplitud), 4, 2);
  }
}

function hashTexto(texto) {
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

/** Recortes de las letras WAR para pruebas y depuración. */
export { crearGlifos, crearTerrenoMenu };
