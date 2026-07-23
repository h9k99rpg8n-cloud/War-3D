import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CONFIGURACION } from "../src/configuracion.js";
import { crearSistemaEsqueletosUmbral } from "../src/entidades/esqueletosUmbral.js";

test("el huevo del esqueleto de umbral genera su entidad sin activar hostilidad creativa", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 4, 0);
  const terreno = {
    hayColisionCuerpo: () => false,
    estaEnCueva: () => false,
    buscarPuntoCuevaCercano: () => null,
    hayBloqueEnMundo: () => false,
  };
  const salud = {
    estaMuerto: () => false,
    recibirDano: () => {
      throw new Error("Una entidad creativa no debe atacar.");
    },
  };
  const sistema = crearSistemaEsqueletosUmbral(
    THREE,
    scene,
    camera,
    terreno,
    salud,
    CONFIGURACION,
    { modo: "creativo", dificultad: "normal", estiloVisual: "traditional" },
  );

  assert.equal(sistema.invocar({ x: 3, y: 3, z: 3 }), true);
  assert.equal(sistema.obtenerCantidad(), 1);
  assert.ok(scene.getObjectByName("war-threshold-skeleton"));
  sistema.actualizar(10_000, 0.016);
});
