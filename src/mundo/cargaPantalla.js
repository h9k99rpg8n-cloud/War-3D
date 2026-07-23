export const TAMANO_REGION = 8;
export const DISTANCIA_CARGA_PREDETERMINADA = 6;
export const DISTANCIA_CARGA_MAXIMA = 32;

export function normalizarDistanciaCarga(valor, respaldo = DISTANCIA_CARGA_PREDETERMINADA) {
  const numero = Math.floor(Number(valor));
  const seguro = Number.isFinite(numero) ? numero : respaldo;
  return Math.max(2, Math.min(DISTANCIA_CARGA_MAXIMA, seguro));
}

export function obtenerRegionCelda(x, z, tamanoRegion = TAMANO_REGION) {
  const tamano = Math.max(1, Math.floor(Number(tamanoRegion) || TAMANO_REGION));
  return {
    x: Math.floor(Number(x) / tamano),
    z: Math.floor(Number(z) / tamano),
  };
}

export function claveRegion(x, z) {
  return `${Math.floor(x)}:${Math.floor(z)}`;
}

export function regionesEnDistancia(
  centro,
  distancia,
  regionesPorLado = Number.POSITIVE_INFINITY,
) {
  const radio = normalizarDistanciaCarga(distancia);
  const limite = Number.isFinite(regionesPorLado)
    ? Math.max(1, Math.floor(regionesPorLado))
    : Number.POSITIVE_INFINITY;
  const regiones = [];
  for (let z = centro.z - radio; z <= centro.z + radio; z += 1) {
    if (z < 0 || z >= limite) continue;
    for (let x = centro.x - radio; x <= centro.x + radio; x += 1) {
      if (x < 0 || x >= limite) continue;
      const distanciaCuadrada = (x - centro.x) ** 2 + (z - centro.z) ** 2;
      if (distanciaCuadrada > (radio + 0.35) ** 2) continue;
      regiones.push({ x, z, distanciaCuadrada, clave: claveRegion(x, z) });
    }
  }
  return regiones.sort((a, b) => a.distanciaCuadrada - b.distanciaCuadrada);
}

export function crearColaCargaPantalla({
  distancia = DISTANCIA_CARGA_PREDETERMINADA,
  tamanoMundo = 128,
  cargar,
  descargar,
} = {}) {
  if (typeof cargar !== "function" || typeof descargar !== "function") {
    throw new TypeError("La carga de pantalla necesita callbacks cargar y descargar.");
  }
  const regionesPorLado = Math.ceil(Math.max(1, Number(tamanoMundo)) / TAMANO_REGION);
  let distanciaActual = normalizarDistanciaCarga(distancia);
  let centroActual = null;
  let pendientes = [];
  const activas = new Set();
  const deseadas = new Set();

  return {
    moverCentro(celdaX, celdaZ) {
      const centro = obtenerRegionCelda(celdaX, celdaZ);
      if (centroActual?.x === centro.x && centroActual?.z === centro.z) return false;
      centroActual = centro;
      reconstruirCola();
      return true;
    },

    procesar(presupuestoMs = 2.5, reloj = relojActual) {
      const inicio = reloj();
      let procesadas = 0;
      while (pendientes.length && reloj() - inicio <= presupuestoMs) {
        const region = pendientes.shift();
        if (activas.has(region.clave) || !deseadas.has(region.clave)) continue;
        cargar(region);
        activas.add(region.clave);
        procesadas += 1;
      }
      return procesadas;
    },

    establecerDistancia(valor) {
      const siguiente = normalizarDistanciaCarga(valor);
      if (siguiente === distanciaActual) return distanciaActual;
      distanciaActual = siguiente;
      reconstruirCola();
      return distanciaActual;
    },

    obtenerEstado() {
      return Object.freeze({
        distancia: distanciaActual,
        activas: activas.size,
        pendientes: pendientes.length,
        centro: centroActual ? { ...centroActual } : null,
      });
    },

    estaActiva(x, z) {
      return activas.has(claveRegion(x, z));
    },
  };

  function reconstruirCola() {
    if (!centroActual) return;
    const objetivo = regionesEnDistancia(
      centroActual,
      distanciaActual,
      regionesPorLado,
    );
    deseadas.clear();
    for (const region of objetivo) deseadas.add(region.clave);
    for (const clave of [...activas]) {
      if (deseadas.has(clave)) continue;
      const [x, z] = clave.split(":").map(Number);
      descargar({ x, z, clave });
      activas.delete(clave);
    }
    pendientes = objetivo.filter((region) => !activas.has(region.clave));
  }
}

function relojActual() {
  return globalThis.performance?.now?.() ?? Date.now();
}
