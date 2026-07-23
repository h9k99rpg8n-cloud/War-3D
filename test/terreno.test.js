import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CONFIGURACION } from "../src/configuracion.js";
import { crearTerrenoContainer } from "../src/mundo/terrenoContainer.js";

test("un mundo regional genera piedra y minerales sin cargar 256×256 completo", () => {
  const configuracion = {
    ...CONFIGURACION,
    mundo: {
      ...CONFIGURACION.mundo,
      tamanoCuadricula: 256,
      distanciaCargaPredeterminada: 2,
      presupuestoCargaMs: 2,
    },
  };
  const terreno = crearTerrenoContainer(
    THREE,
    new THREE.Scene(),
    configuracion,
    {
      modo: "supervivencia",
      tipoMundo: "normal",
      plantillaId: "war:stone_ridges",
      tamanoMundo: 256,
      distanciaCarga: 2,
      semilla: 431_991,
      estiloVisual: "traditional",
    },
  );
  const carga = terreno.obtenerEstadoCarga();
  assert.ok(carga.activas > 0);
  assert.ok(carga.activas < (256 / 8) ** 2);
  assert.ok(terreno.obtenerCantidadTipo("piedra") > 0);
  assert.ok(terreno.obtenerCantidadTipo("carbon_mineral") > 0);
  assert.ok(terreno.buscarPuntoCuevaCercano(0, 10, 0, 50));
  assert.ok(terreno.obtenerCantidadVisible("pasto") > 0);
  assert.ok(
    terreno.mallas
      .filter((malla) => malla.isInstancedMesh)
      .every((malla) => malla.frustumCulled === false),
  );
});
