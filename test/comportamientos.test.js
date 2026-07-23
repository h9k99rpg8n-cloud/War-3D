import test from "node:test";
import assert from "node:assert/strict";
import {
  RegistroComportamientos,
  comportamientosWar,
} from "../src/comportamientos/registroComportamientos.js";

test("el registro contiene los comportamientos oficiales iniciales", () => {
  const ids = new Set(comportamientosWar.listar().map(({ id }) => id));
  for (const id of [
    "war:water_flow",
    "war:player_held_item",
    "war:crafting_station",
    "war:furnace_station",
    "war:mining_tool",
    "war:ranged_attacker",
    "war:spawn_egg",
  ]) {
    assert.ok(ids.has(id), `falta ${id}`);
  }
  assert.equal(
    comportamientosWar.validar("war:water_permeable", { permeability: 0.5 }),
    true,
  );
  assert.equal(
    comportamientosWar.validar("war:water_permeable", { permeability: 4 }),
    false,
  );
});

test("el registro evita identificadores improvisados y duplicados", () => {
  const registro = new RegistroComportamientos();
  assert.throws(() =>
    registro.registrar({
      id: "nombre-malo",
      version: 1,
      category: "test",
      experimental: false,
      validate: () => true,
    }),
  );
});
