import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const archivos = listarJs(join(raiz, "src"));

test("los módulos locales no contienen dependencias circulares", () => {
  const grafo = new Map();
  for (const archivo of archivos) {
    const codigo = readFileSync(archivo, "utf8");
    const dependencias = [...codigo.matchAll(/from\\s+[\"']([^\"']+)[\"']/g)]
      .map((resultado) => resultado[1])
      .filter((ruta) => ruta.startsWith("."))
      .map((ruta) => resolve(dirname(archivo), ruta))
      .filter((ruta) => archivos.includes(ruta));
    grafo.set(archivo, dependencias);
  }
  const visitados = new Set();
  const activos = new Set();
  for (const archivo of archivos) visitar(archivo, []);

  function visitar(archivo, camino) {
    if (activos.has(archivo)) {
      const ciclo = [...camino, archivo]
        .map((actual) => relative(raiz, actual))
        .join(" → ");
      assert.fail(`dependencia circular: ${ciclo}`);
    }
    if (visitados.has(archivo)) return;
    activos.add(archivo);
    for (const dependencia of grafo.get(archivo) ?? []) {
      visitar(dependencia, [...camino, archivo]);
    }
    activos.delete(archivo);
    visitados.add(archivo);
  }
});

function listarJs(directorio) {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return listarJs(ruta);
    return entrada.isFile() && entrada.name.endsWith(".js") ? [ruta] : [];
  });
}
