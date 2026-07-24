export const TAMANO_REGION = 8;
export const DISTANCIA_CARGA_PREDETERMINADA = 6;
export const DISTANCIA_CARGA_MAXIMA = 32;
export const MARGEN_HISTERESIS_REGIONES = 1;

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
  margenHisteresis = MARGEN_HISTERESIS_REGIONES,
} = {}) {
  if (typeof cargar !== "function" || typeof descargar !== "function") {
    throw new TypeError("La carga de pantalla necesita callbacks cargar y descargar.");
  }
  const regionesPorLado = Math.ceil(Math.max(1, Number(tamanoMundo)) / TAMANO_REGION);
  let distanciaActual = normalizarDistanciaCarga(distancia);
  let centroActual = null;
  let pendientes = [];
  let revisionCola = 0;
  let cargasTotales = 0;
  let descargasTotales = 0;
  let tareasCanceladas = 0;
  const activas = new Set();
  const deseadas = new Set();
  const retenidas = new Set();
  const margenSeguro = Math.max(0, Math.min(3, Math.floor(margenHisteresis)));

  return {
    moverCentro(celdaX, celdaZ, direccion = null) {
      const centro = obtenerRegionCelda(celdaX, celdaZ);
      if (centroActual?.x === centro.x && centroActual?.z === centro.z) return false;
      centroActual = centro;
      reconstruirCola(direccion);
      return true;
    },

    procesar(presupuestoMs = 2.5, reloj = relojActual) {
      const inicio = reloj();
      let procesadas = 0;
      while (pendientes.length && reloj() - inicio <= presupuestoMs) {
        const region = pendientes.shift();
        if (
          region.revision !== revisionCola ||
          activas.has(region.clave) ||
          !deseadas.has(region.clave)
        ) {
          tareasCanceladas += 1;
          continue;
        }
        cargar(region);
        activas.add(region.clave);
        cargasTotales += 1;
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
        margenHisteresis: margenSeguro,
        cargasTotales,
        descargasTotales,
        tareasCanceladas,
      });
    },

    estaActiva(x, z) {
      return activas.has(claveRegion(x, z));
    },
  };

  function reconstruirCola(direccion = null) {
    if (!centroActual) return;
    revisionCola += 1;
    const objetivo = regionesEnDistancia(
      centroActual,
      distanciaActual,
      regionesPorLado,
    );
    const retencion = regionesEnDistancia(
      centroActual,
      distanciaActual + margenSeguro,
      regionesPorLado,
    );
    deseadas.clear();
    retenidas.clear();
    for (const region of objetivo) deseadas.add(region.clave);
    for (const region of retencion) retenidas.add(region.clave);
    for (const clave of [...activas]) {
      if (retenidas.has(clave)) continue;
      const [x, z] = clave.split(":").map(Number);
      descargar({ x, z, clave });
      activas.delete(clave);
      descargasTotales += 1;
    }
    const prioridadFrente = normalizarDireccion(direccion);
    pendientes = objetivo
      .filter((region) => !activas.has(region.clave))
      .map((region) => ({
        ...region,
        revision: revisionCola,
        prioridadFrente:
          prioridadFrente.x * (region.x - centroActual.x) +
          prioridadFrente.z * (region.z - centroActual.z),
      }))
      .sort(
        (a, b) =>
          a.distanciaCuadrada - b.distanciaCuadrada ||
          b.prioridadFrente - a.prioridadFrente,
      );
  }
}

function normalizarDireccion(direccion) {
  const x = Number(direccion?.x) || 0;
  const z = Number(direccion?.z) || 0;
  const longitud = Math.hypot(x, z);
  return longitud > 0.0001 ? { x: x / longitud, z: z / longitud } : { x: 0, z: 0 };
}

function relojActual() {
  return globalThis.performance?.now?.() ?? Date.now();
}
