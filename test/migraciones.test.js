import test from "node:test";
import assert from "node:assert/strict";
import {
  VERSION_MUNDO_ACTUAL,
  normalizarMundoGuardado,
} from "../src/guardado/almacenMundos.js";

test("un mundo 1.7 conserva progreso y recibe valores seguros de Container Update", () => {
  const anterior = {
    versionMundo: 1,
    id: "mundo-antiguo",
    nombreMundo: "Historia",
    modo: "supervivencia",
    tamanoMundo: 128,
    semilla: 123,
    progreso: {
      entidades: [{ tipo: "zombie", x: 1 }],
      terreno: { eliminados: [{ x: 1, y: 0, z: 1, tipo: "pasto" }] },
    },
  };
  const migrado = normalizarMundoGuardado(anterior);
  assert.equal(migrado.versionMundo, VERSION_MUNDO_ACTUAL);
  assert.equal(migrado.plantillaId, "war:legacy_1_7");
  assert.equal(migrado.estiloVisual, "traditional");
  assert.equal(migrado.aguaExperimental, false);
  assert.deepEqual(migrado.progreso, anterior.progreso);
});

test("los valores cargados quedan limitados y validados", () => {
  const mundo = normalizarMundoGuardado({
    modo: "creativo",
    tamanoMundo: 999,
    distanciaCarga: 500,
    estiloVisual: "falso",
    joystickSkin: "falso",
  });
  assert.equal(mundo.tamanoMundo, 128);
  assert.equal(mundo.distanciaCarga, 32);
  assert.equal(mundo.estiloVisual, "traditional");
  assert.equal(mundo.joystickSkin, "traditional");
});
