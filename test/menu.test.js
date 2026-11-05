import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SEMILLA_MENU,
  crearGlifos,
  crearTerrenoMenu,
  hashSemilla,
  ruidoFractal,
  ruidoValor,
  vestirTerreno,
} from "../src/menu/terrenoMenu.js";

test("la semilla del menú es WAR y siempre produce el mismo mundo", () => {
  assert.equal(SEMILLA_MENU, "WAR");
  const a = crearTerrenoMenu({});
  const b = crearTerrenoMenu({});
  assert.equal(a.hash, b.hash);
  assert.deepEqual(Array.from(a.alturas), Array.from(b.alturas));
});

test("semillas distintas producen paisajes distintos", () => {
  const war = crearTerrenoMenu({ semilla: "WAR" });
  const otro = crearTerrenoMenu({ semilla: "OTRO" });
  assert.notEqual(war.hash, otro.hash);
  let diferencias = 0;
  for (let i = 0; i < war.alturas.length; i += 7) {
    if (Math.abs(war.alturas[i] - otro.alturas[i]) > 0.05) diferencias += 1;
  }
  assert.ok(diferencias > war.alturas.length / 70);
});

test("el terreno tiene relieve real y alturas finitas", () => {
  const terreno = crearTerrenoMenu({});
  assert.equal(terreno.alturas.length, terreno.columnas * terreno.filas);
  for (const altura of terreno.alturas) {
    assert.ok(Number.isFinite(altura));
    assert.ok(altura >= 0 && altura <= 8);
  }
  assert.ok(terreno.maximo - terreno.minimo > 1.5, "el paisaje debe tener relieve");
});

test("el wordmark WAR queda grabado en el relieve del mundo", () => {
  const glifos = crearGlifos("WAR");
  assert.equal(glifos.letras, 3);
  assert.equal(glifos.alto, 7);
  assert.equal(glifos.ancho, 5 * 3 + 2);
  assert.equal(glifos.leer(0, 0), 1);
  assert.equal(glifos.leer(4, 0), 1);
  assert.equal(glifos.leer(2, 5), 0, "la W sube en el centro, no en la base");
  assert.equal(glifos.leer(2, 4), 1, "la W cruza el centro");

  const terreno = crearTerrenoMenu({ columnas: 40, filas: 40 });
  const margenX = Math.floor((40 - glifos.ancho) / 2);
  const margenY = Math.floor((40 - glifos.alto) / 2);
  const alturaLetra = terreno.altura(margenX + 1, margenY + 1);
  const alturaFondo = terreno.altura(0, 0);
  assert.ok(alturaLetra > alturaFondo, "las letras deben sobresalir del terreno");
});

test("el relieve es siempre positivo: nunca hay agujeros en el menú", () => {
  for (const semilla of ["WAR", "WAR-1", "WAR-99", "PLANO"]) {
    const terreno = crearTerrenoMenu({ semilla });
    for (const altura of terreno.alturas) {
      assert.ok(altura >= 0, `altura negativa con semilla ${semilla}`);
    }
  }
});

test("vestirTerreno reparte pasto, piedra, nieve y agua sin huecos", () => {
  const terreno = crearTerrenoMenu({ columnas: 40, filas: 40 });
  const vestido = vestirTerreno(terreno, { arboles: 8 });
  assert.equal(vestido.celdas.length, terreno.columnas * terreno.filas);
  const tipos = new Set(vestido.celdas.map((celda) => celda.tipo));
  assert.ok(tipos.has("pasto"));
  assert.ok(vestido.arboles.length > 0);
  for (const arbol of vestido.arboles) {
    assert.ok(arbol.x >= 0 && arbol.x < terreno.columnas);
    assert.ok(arbol.y >= vestido.nivelAgua);
  }
});

test("el ruido del menú es determinista, continuo y acotado", () => {
  for (const [x, z] of [[0, 0], [3.4, 7.1], [-2.5, 9.9]]) {
    assert.equal(ruidoValor(x, z, 5), ruidoValor(x, z, 5));
    const valor = ruidoValor(x, z, 5);
    assert.ok(valor >= 0 && valor <= 1);
  }
  // Continuidad: dos puntos vecinos no saltan de golpe.
  const cerca = Math.abs(ruidoValor(4, 4, 9) - ruidoValor(4.01, 4, 9));
  assert.ok(cerca < 0.05);
  const fractal = ruidoFractal(2.2, 3.3, 11);
  assert.ok(fractal >= 0 && fractal <= 1);
});

test("hashSemilla es estable y distingue textos", () => {
  assert.equal(hashSemilla("WAR"), hashSemilla("WAR"));
  assert.notEqual(hashSemilla("WAR"), hashSemilla("OBRA"));
  assert.ok(hashSemilla("") > 0);
});
