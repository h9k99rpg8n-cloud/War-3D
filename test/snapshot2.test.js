import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SURVIVAL_MAX_STACK,
  crearStackInventario,
  dividirCantidadesStack,
} from "../src/inventario/constantes.js";
import {
  colocarIngrediente,
  consumirRecetaCuadricula,
  crearCuadriculaCrafteo,
  TOTAL_CELDAS_CRAFTEO,
  validarRecetaCuadricula,
} from "../src/crafteo/crafteoManual.js";
import { obtenerReceta } from "../src/crafteo/recetas.js";
import {
  obtenerInteraccionAgua,
  puedeAguaOcuparCelda,
  resolverVecindadAgua,
} from "../src/fisica/interaccionAgua.js";
import { elegirConsejoCarga } from "../src/interfaz/consejosCarga.js";
import {
  intervaloRenderMs,
  resolverPerfilRendimiento,
} from "../src/rendimiento/perfiles.js";

test("Snapshot 2 usa una sola fuente de verdad de 92 por stack", () => {
  assert.equal(SURVIVAL_MAX_STACK, 92);
  assert.deepEqual(crearStackInventario("war:stone", 500), {
    itemId: "war:stone",
    amount: 92,
    infinite: false,
  });
  assert.deepEqual(
    crearStackInventario("war:stone", 500, { creativo: true }),
    {
      itemId: "war:stone",
      amount: 1,
      infinite: true,
    },
  );
});

test("dividir 12 objetos en 3 conserva exactamente 3 y 9", () => {
  assert.deepEqual(dividirCantidadesStack(12, 3), {
    separada: 3,
    restante: 9,
  });
  assert.equal(dividirCantidadesStack(12, 0), null);
  assert.equal(dividirCantidadesStack(12, 12), null);
});

test("la mesa valida forma y posición dentro de una cuadrícula 6×6", () => {
  const cuadricula = crearCuadriculaCrafteo();
  const receta = obtenerReceta("war:wooden_pickaxe");
  assert.equal(cuadricula.length, TOTAL_CELDAS_CRAFTEO);
  for (const [indice, tipo] of [
    [0, "tablones"],
    [1, "tablones"],
    [2, "tablones"],
    [7, "palo"],
    [13, "palo"],
  ]) {
    assert.equal(colocarIngrediente(cuadricula, indice, tipo), true);
  }
  assert.equal(validarRecetaCuadricula(cuadricula, [receta])?.id, receta.id);
  assert.equal(consumirRecetaCuadricula(cuadricula, receta), true);
  assert.ok(cuadricula.every((celda) => celda === null));
});

test("agua y arena no pueden compartir celda ni atravesarse", () => {
  const componente = obtenerInteraccionAgua("arena");
  assert.deepEqual(componente, {
    blocksFlow: true,
    allowsWaterInside: false,
    displaceableByWater: false,
    receivesWaterUpdates: true,
  });
  assert.equal(puedeAguaOcuparCelda("arena"), false);
  assert.deepEqual(resolverVecindadAgua("arena"), {
    bloquea: true,
    reemplaza: false,
    encolaActualizacion: true,
  });
});

test("los perfiles conectan resolución, FPS y distancia reales", () => {
  const bajo = resolverPerfilRendimiento("basico");
  assert.equal(bajo.pixelRatio, 1);
  assert.equal(bajo.fps, 30);
  assert.equal(bajo.distanciaCarga, 5);
  assert.equal(intervaloRenderMs(30), 1_000 / 30);
  assert.equal(intervaloRenderMs(0), 0);
});

test("los consejos nunca confunden arena con cristal", () => {
  const funciones = new Set(["furnace", "glass"]);
  const consejo = elegirConsejoCarga({ semilla: 0, funciones });
  assert.match(consejo.texto, /Funde arena/);
  assert.doesNotMatch(consejo.texto, /Funde cristal para crear cristal/);
});

test("la interfaz final contiene ajustes globales, mesa 6×6 y libro SVG", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
  assert.match(html, /id="launcher-settings"/);
  assert.match(html, /id="crafting-grid"/);
  assert.match(html, /id="recipe-book"/);
  assert.match(html, /symbol id="icon-recipe-book"/);
  assert.match(css, /\.crafting-grid\s*\{/);
  assert.match(css, /grid-template-columns:\s*repeat\(6/);
});
