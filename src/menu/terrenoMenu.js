/**
 * Terreno vivo del menú principal.
 *
 * El menú no usa una imagen: genera un paisaje voxel determinista a partir de
 * una semilla "WAR" (con las letras pintadas en el relieve) y lo entrega como
 * matriz de alturas. Ese mismo paisaje se usa para:
 *
 *   - la vista previa 3D animada de la portada (cámara propia, 60 fps);
 *   - el fondo en movimiento del menú;
 *   - la miniatura pintada de cada tarjeta de mundo.
 *
 * Al ser determinista, las pruebas pueden verificar que la semilla siempre da
 * el mismo mundo.
 */

export const SEMILLA_MENU = "WAR";

/** 5×7 con las letras W, A y R del logotipo. */
const GLIFOS = Object.freeze({
  W: Object.freeze([
    "10001",
    "10001",
    "10001",
    "10001",
    "10101",
    "11011",
    "10001",
  ]),
  A: Object.freeze([
    "01110",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "10001",
  ]),
  R: Object.freeze([
    "11110",
    "10001",
    "10001",
    "11110",
    "10100",
    "10010",
    "10001",
  ]),
});

export function hashSemilla(texto) {
  let hash = 2166136261;
  const limpio = String(texto || "WAR");
  for (let i = 0; i < limpio.length; i += 1) {
    hash ^= limpio.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

/** Ruido de valor con interpolación suave, determinista y barato. */
export function ruidoValor(x, z, semilla = 1) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const suave = (t) => t * t * (3 - 2 * t);
  const a = valorCelda(xi, zi, semilla);
  const b = valorCelda(xi + 1, zi, semilla);
  const c = valorCelda(xi, zi + 1, semilla);
  const d = valorCelda(xi + 1, zi + 1, semilla);
  const arriba = a + (b - a) * suave(xf);
  const abajo = c + (d - c) * suave(xf);
  return arriba + (abajo - arriba) * suave(zf);
}

function valorCelda(x, z, semilla) {
  let hash = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ semilla;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

/** Ruido fractal de varias octavas, normalizado a 0..1. */
export function ruidoFractal(x, z, semilla = 1, octavas = 4) {
  let suma = 0;
  let amplitud = 1;
  let frecuencia = 1;
  let total = 0;
  for (let octava = 0; octava < octavas; octava += 1) {
    suma += ruidoValor(x * frecuencia, z * frecuencia, semilla + octava * 7919) * amplitud;
    total += amplitud;
    amplitud *= 0.5;
    frecuencia *= 2;
  }
  return suma / total;
}

/**
 * Matriz de glifos de la palabra indicada, aplanada a una rejilla de bits.
 * Devuelve `{ ancho, alto, leer(x, y) }` para consultar si hay letra.
 */
export function crearGlifos(texto = SEMILLA_MENU, separacion = 1) {
  const letras = [...String(texto).toUpperCase()].filter((letra) => GLIFOS[letra]);
  const alto = 7;
  const anchoLetra = 5;
  const ancho = letras.length * anchoLetra + Math.max(0, letras.length - 1) * separacion;
  const bits = new Uint8Array(ancho * alto);
  let cursor = 0;
  for (const letra of letras) {
    const glifo = GLIFOS[letra];
    for (let y = 0; y < alto; y += 1) {
      for (let x = 0; x < anchoLetra; x += 1) {
        if (glifo[y][x] === "1") bits[y * ancho + (cursor + x)] = 1;
      }
    }
    cursor += anchoLetra + separacion;
  }
  return {
    ancho,
    alto,
    letras: letras.length,
    leer(x, y) {
      if (x < 0 || y < 0 || x >= ancho || y >= alto) return 0;
      return bits[y * ancho + x];
    },
  };
}

/**
 * Genera el paisaje del menú.
 *
 * @param {object} opciones
 * @param {string} opciones.semilla          semilla textual (por defecto "WAR")
 * @param {number} opciones.columnas         resolución de la rejilla
 * @param {number} opciones.filas
 * @param {number} opciones.escala           escala del ruido
 * @param {boolean} opciones.letras          escribir WAR en el relieve
 * @returns {{alturas: Float32Array, columnas, filas, semilla, hash, agua, letras}}
 */
export function crearTerrenoMenu({
  semilla = SEMILLA_MENU,
  columnas = 48,
  filas = 48,
  escala = 8,
  letras = true,
  alturaMaxima = 7,
} = {}) {
  const hash = hashSemilla(semilla);
  const total = columnas * filas;
  const alturas = new Float32Array(total);
  const glifos = letras ? crearGlifos(semilla) : null;
  const margenX = Math.max(0, Math.floor((columnas - (glifos?.ancho ?? 0)) / 2));
  const margenY = Math.max(0, Math.floor((filas - (glifos?.alto ?? 0)) / 2));

  let minimo = Number.POSITIVE_INFINITY;
  let maximo = Number.NEGATIVE_INFINITY;

  for (let z = 0; z < filas; z += 1) {
    for (let x = 0; x < columnas; x += 1) {
      const nx = (x / columnas) * escala;
      const nz = (z / filas) * escala;
      // Colina suave hacia el centro para que el paisaje no corte el logotipo.
      const centroX = (x - columnas / 2) / (columnas / 2);
      const centroZ = (z - filas / 2) / (filas / 2);
      const radio = Math.min(1, Math.hypot(centroX, centroZ));
      const base = ruidoFractal(nx, nz, hash, 4);
      const colina = (1 - radio) * 0.35;
      let altura = (base * 0.78 + colina) * alturaMaxima;

      if (glifos) {
        const gx = x - margenX;
        const gy = z - margenY;
        if (glifos.leer(gx, gy)) {
          // Las letras se elevan por encima del terreno: se ven desde lejos.
          altura = Math.max(altura, alturaMaxima * 0.82);
        }
      }

      alturas[z * columnas + x] = altura;
      if (altura < minimo) minimo = altura;
      if (altura > maximo) maximo = altura;
    }
  }

  return {
    alturas,
    columnas,
    filas,
    semilla: String(semilla),
    hash,
    minimo,
    maximo,
    letras: glifos ? { ancho: glifos.ancho, alto: glifos.alto } : null,
    altura(x, z) {
      if (x < 0 || z < 0 || x >= columnas || z >= filas) return 0;
      return alturas[z * columnas + x];
    },
  };
}

/**
 * Convierte el paisaje en datos listos para dibujar: tipo de bloque por celda
 * y posiciones de árboles, con agua opcional para lagos.
 */
export function vestirTerreno(terreno, { arboles = 6, agua = true } = {}) {
  const { alturas, columnas, filas, hash } = terreno;
  const filaMinima = Math.max(...alturas);
  const nivelAgua = agua ? filaMinima * 0.42 : -Infinity;
  const celdas = [];
  const arbolesColocados = [];

  for (let z = 0; z < filas; z += 1) {
    for (let x = 0; x < columnas; x += 1) {
      const altura = alturas[z * columnas + x];
      if (altura < nivelAgua) {
        celdas.push({ x, z, y: altura, tipo: "arena" });
        continue;
      }
      const alto = altura > 5.1 ? "nieve" : altura > 4 ? "piedra" : "pasto";
      celdas.push({ x, z, y: altura, tipo: alto });
    }
  }

  for (let intento = 0; intento < arboles * 6 && arbolesColocados.length < arboles; intento += 1) {
    const x = 2 + Math.floor(valorCelda(intento, 17, hash) * (columnas - 4));
    const z = 2 + Math.floor(valorCelda(intento, 91, hash) * (filas - 4));
    const altura = alturas[z * columnas + x];
    if (altura < nivelAgua + 0.6) continue;
    if (arbolesColocados.some((arbol) => Math.hypot(arbol.x - x, arbol.z - z) < 5)) continue;
    arbolesColocados.push({ x, z, y: altura });
  }

  return { celdas, arboles: arbolesColocados, nivelAgua };
}
