import test from "node:test";
import assert from "node:assert/strict";
import {
  DISTANCIA_CARGA_MAXIMA,
  DISTANCIA_CARGA_PREDETERMINADA,
  TAMANO_REGION,
  crearColaCargaPantalla,
  normalizarDistanciaCarga,
  obtenerRegionCelda,
} from "../src/mundo/cargaPantalla.js";

test("Carga de pantalla usa regiones 8×8 y límites móviles seguros", () => {
  assert.equal(TAMANO_REGION, 8);
  assert.equal(DISTANCIA_CARGA_PREDETERMINADA, 6);
  assert.equal(DISTANCIA_CARGA_MAXIMA, 32);
  assert.equal(normalizarDistanciaCarga(999), 32);
  assert.deepEqual(obtenerRegionCelda(15, 17), { x: 1, z: 2 });
});

test("la cola carga cerca, descarga lejos y conserva datos lógicos fuera", () => {
  const cargadas = [];
  const descargadas = [];
  const cola = crearColaCargaPantalla({
    distancia: 2,
    tamanoMundo: 256,
    cargar: (region) => cargadas.push(region.clave),
    descargar: (region) => descargadas.push(region.clave),
  });
  cola.moverCentro(8, 8);
  cola.procesar(Number.POSITIVE_INFINITY);
  assert.ok(cargadas.length > 0);
  assert.ok(cola.obtenerEstado().activas > 0);
  cola.moverCentro(240, 240);
  cola.procesar(Number.POSITIVE_INFINITY);
  assert.ok(descargadas.length > 0);
  assert.ok(cola.obtenerEstado().activas > 0);
});
