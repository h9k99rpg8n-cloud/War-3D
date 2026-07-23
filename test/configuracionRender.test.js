import test from "node:test";
import assert from "node:assert/strict";
import { crearConfiguracionJuego } from "../src/juego.js";

test("la niebla nunca invierte sus límites con carga de pantalla mínima", () => {
  const configuracion = crearConfiguracionJuego({
    modo: "creativo",
    dificultad: "normal",
    perfilRendimiento: "equilibrado",
    colisionJugador: null,
    tamanoMundo: 64,
    distanciaCarga: 2,
  });

  assert.ok(configuracion.renderizado.nieblaCercana >= 0);
  assert.ok(
    configuracion.renderizado.nieblaCercana <
      configuracion.renderizado.nieblaLejana,
  );
});
