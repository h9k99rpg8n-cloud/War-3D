import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularRotura,
  obtenerDefinicionContenido,
} from "../src/contenido/registroContenido.js";
import { crearSistemaCrafteo } from "../src/crafteo/sistemaCrafteo.js";
import {
  avanzarEstadoHorno,
  crearEstadoHorno,
} from "../src/crafteo/estaciones.js";

test("el carbón se rompe mucho más rápido con pico de madera", () => {
  const mano = calcularRotura("carbon_mineral", null, false);
  const pico = calcularRotura(
    "carbon_mineral",
    obtenerDefinicionContenido("pico_madera"),
    false,
  );
  assert.ok(mano.duracionMs > pico.duracionMs * 5);
  assert.equal(mano.suelta, "carbon");
  assert.equal(pico.obtieneRecurso, true);
});

test("una herramienta débil rompe hierro visualmente sin entregar el mineral", () => {
  const pico = calcularRotura(
    "hierro_mineral",
    obtenerDefinicionContenido("pico_madera"),
    false,
  );
  assert.equal(pico.obtieneRecurso, false);
});

test("el crafteo consume ingredientes y entrega el resultado de forma transaccional", () => {
  const cantidades = new Map([
    ["madera", 4],
    ["tablones", 0],
  ]);
  const inventario = {
    cantidadTotal: (id) => cantidades.get(id) ?? 0,
    puedeAgregar: () => true,
    retirar(id, cantidad) {
      const actual = cantidades.get(id) ?? 0;
      const retirada = Math.min(actual, cantidad);
      cantidades.set(id, actual - retirada);
      return retirada;
    },
    agregar(id, cantidad) {
      cantidades.set(id, (cantidades.get(id) ?? 0) + cantidad);
      return true;
    },
  };
  const crafteo = crearSistemaCrafteo(inventario);
  assert.deepEqual(crafteo.fabricar("war:planks_from_logs", "inventory"), {
    ok: true,
    resultado: { itemId: "tablones", amount: 4 },
  });
  assert.equal(cantidades.get("madera"), 0);
  assert.equal(cantidades.get("tablones"), 4);
});

test("el horno usa carbón como combustible y transforma arena en cristal", () => {
  const estado = crearEstadoHorno("1:2:3");
  Object.assign(estado, {
    inputItemId: "arena",
    inputAmount: 1,
    fuelItemId: "carbon",
    fuelAmount: 1,
  });

  avanzarEstadoHorno(estado, 4_500, {
    duracionCoccionMs: 4_500,
    duracionCombustibleMs: 18_000,
  });

  assert.equal(estado.inputItemId, null);
  assert.equal(estado.fuelAmount, 0);
  assert.equal(estado.outputItemId, "cristal");
  assert.equal(estado.outputAmount, 1);
  assert.ok(estado.remainingFuelTime > 0);
});
