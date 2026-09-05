import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION_JUEGO } from "../src/configuracion.js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

test("la version de Buildy es atomica entre juego, package y lockfile", () => {
  const paquete = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8"));
  const lockfile = JSON.parse(readFileSync(join(raiz, "package-lock.json"), "utf8"));
  assert.equal(VERSION_JUEGO, "2.0.0-buildy.1");
  assert.equal(paquete.version, VERSION_JUEGO);
  assert.equal(lockfile.version, VERSION_JUEGO);
  assert.equal(lockfile.packages[""].version, VERSION_JUEGO);
});
