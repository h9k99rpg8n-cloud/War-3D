import test from "node:test";
import assert from "node:assert/strict";
import { crearFisicaAgua } from "../src/fisica/agua.js";

test("el agua usa celdas lógicas y nunca cuerpos rígidos por bloque", () => {
  const llamadas = [];
  const terreno = {
    estaEnAgua(...argumentos) {
      llamadas.push(argumentos);
      return true;
    },
  };
  const agua = crearFisicaAgua(terreno, { experimental: true });
  assert.equal(agua.usaRapier, false);
  assert.equal(agua.modo, "experimental");
  assert.equal(agua.estaEnAgua(1, 2, 3, 4), true);
  assert.deepEqual(llamadas, [[1, 2, 3, 4]]);
  assert.equal(agua.obtenerCantidadSensores(), 0);
});
