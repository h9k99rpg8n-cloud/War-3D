import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CONFIGURACION } from "../src/configuracion.js";
import { crearTerrenoContainer } from "../src/mundo/terrenoContainer.js";

function crearTerrenoPrueba(progreso) {
  const opciones = {
    modo: "supervivencia", tipoMundo: "normal", plantillaId: "war:stone_ridges",
    tamanoMundo: 256, distanciaCarga: 2, semilla: 431_991, estiloVisual: "traditional", progreso,
  };
  return crearTerrenoContainer(THREE, new THREE.Scene(), {
    ...CONFIGURACION,
    mundo: { ...CONFIGURACION.mundo, tamanoCuadricula: 256, distanciaCargaPredeterminada: 2 },
  }, opciones);
}

test("romper un bloque solo escribe instancias locales y conserva identidad al guardar", (t) => {
  const terreno = crearTerrenoPrueba();
  const malla = terreno.mallas.find((m) => m.userData.tipoBloque === "pasto");
  const bloque = terreno.obtenerBloquePorInstancia(malla, 0);
  const original = THREE.InstancedMesh.prototype.setMatrixAt;
  let escrituras = 0;
  t.mock.method(THREE.InstancedMesh.prototype, "setMatrixAt", function (...args) {
    escrituras++;
    return original.apply(this, args);
  });
  const antes = terreno.obtenerMetricas().reconstruccionesCompletas;
  assert.ok(terreno.romperBloque(bloque));
  assert.ok(escrituras <= 14, `Una edición local escribió ${escrituras} matrices.`);
  assert.equal(terreno.obtenerMetricas().reconstruccionesCompletas, antes);
  assert.equal(terreno.obtenerBloquePorClave(bloque.clave), null);
  assert.equal(terreno.romperBloque(bloque), null);
  verificarInstancias(terreno);
  const cambios = terreno.exportarCambios();
  const recargado = crearTerrenoPrueba({ terreno: cambios });
  assert.equal(recargado.obtenerBloquePorClave(bloque.clave), null);
  assert.deepEqual(recargado.exportarCambios(), cambios);
  const reponer = recargado.colocarBloqueEnCoordenadas(bloque.x, bloque.y, bloque.z, bloque.tipo);
  assert.ok(reponer);
  verificarInstancias(recargado);
  assert.ok(recargado.romperBloque(reponer));
});

test("ediciones repetidas, crecimiento de buffers y carga regional mantienen raycast y bounds", () => {
  const terreno = crearTerrenoPrueba();
  for (const malla of terreno.mallas.filter((m) => m.isInstancedMesh)) malla.instanceMatrix.onUploadCallback();
  const malla = terreno.mallas.find((m) => m.userData.tipoBloque === "pasto");
  const base = terreno.obtenerBloquePorInstancia(malla, 0);
  for (let i = 0; i < 40; i++) {
    const actual = terreno.obtenerBloquePorInstancia(malla, Math.floor(malla.count / 2));
    assert.ok(terreno.romperBloque(actual));
    if (i % 2 === 0) assert.ok(terreno.colocarBloqueEnCoordenadas(actual.x, actual.y, actual.z, actual.tipo));
  }
  // Un material inicialmente escaso fuerza ampliación y actualización completa.
  for (let i = 0; i < 80; i++) {
    assert.ok(terreno.colocarBloqueEnCoordenadas(base.x + i % 8, base.y + 5 + Math.floor(i / 8), base.z, "cristal"));
  }
  verificarInstancias(terreno);
  const cristal = terreno.mallas.find((m) => m.userData.tipoBloque === "cristal");
  assert.equal(cristal.instanceMatrix.updateRanges.length, 0, "no recortar una subida completa pendiente");
  cristal.instanceMatrix.onUploadCallback();
  assert.ok(terreno.romperBloque(terreno.obtenerBloquePorInstancia(cristal, 0)));
  assert.ok(cristal.instanceMatrix.updateRanges.some((r) => r.count === 16));
  for (let now = 1000; now <= 2000; now += 100) terreno.actualizar(now, new THREE.Vector3(35, 15, 35));
  verificarInstancias(terreno);
});

function verificarInstancias(terreno) {
  const matriz = new THREE.Matrix4();
  const centro = new THREE.Vector3();
  for (const malla of terreno.mallas.filter((m) => m.isInstancedMesh)) {
    assert.equal(malla.count, terreno.obtenerCantidadVisible(malla.userData.tipoBloque));
    const claves = new Set();
    for (let i = 0; i < malla.count; i++) {
      const bloque = terreno.obtenerBloquePorInstancia(malla, i);
      assert.ok(terreno.contieneBloque(bloque));
      assert.equal(claves.has(bloque.clave), false);
      claves.add(bloque.clave);
      malla.getMatrixAt(i, matriz);
      centro.setFromMatrixPosition(matriz);
      assert.deepEqual(centro.toArray(), terreno.obtenerCentroBloque(bloque).toArray());
      assert.ok(malla.boundingBox.containsPoint(centro));
      assert.ok(malla.boundingSphere.containsPoint(centro));
    }
  }
}

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
