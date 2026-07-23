import test from "node:test";
import assert from "node:assert/strict";
import {
  ID_PLANTILLA_PLANA,
  IDS_PLANTILLAS_SUPERVIVENCIA,
  esPlantillaPermitida,
  seleccionarPlantillaMundo,
} from "../src/generacion/plantillasMundo.js";

test("supervivencia dispone de cinco plantillas y las elige de forma determinista", () => {
  assert.equal(IDS_PLANTILLAS_SUPERVIVENCIA.length, 5);
  const primera = seleccionarPlantillaMundo({
    modo: "supervivencia",
    semilla: 98_765,
  });
  assert.ok(IDS_PLANTILLAS_SUPERVIVENCIA.includes(primera));
  assert.equal(
    seleccionarPlantillaMundo({ modo: "supervivencia", semilla: 98_765 }),
    primera,
  );
  const muestra = new Set(
    Array.from({ length: 100 }, (_, semilla) =>
      seleccionarPlantillaMundo({ modo: "supervivencia", semilla }),
    ),
  );
  assert.equal(muestra.size, 5);
});

test("mundo plano solo está permitido en creativo", () => {
  assert.equal(esPlantillaPermitida(ID_PLANTILLA_PLANA, "supervivencia"), false);
  assert.equal(esPlantillaPermitida(ID_PLANTILLA_PLANA, "creativo"), true);
  assert.equal(
    seleccionarPlantillaMundo({
      modo: "creativo",
      plantillaId: ID_PLANTILLA_PLANA,
      semilla: 7,
    }),
    ID_PLANTILLA_PLANA,
  );
  assert.notEqual(
    seleccionarPlantillaMundo({
      modo: "supervivencia",
      plantillaId: ID_PLANTILLA_PLANA,
      semilla: 7,
    }),
    ID_PLANTILLA_PLANA,
  );
});
