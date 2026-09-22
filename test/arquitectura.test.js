import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function dependencias(codigo) {
  const rutas = [];
  const modulo = ts.createSourceFile("modulo.js", codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  function visitar(nodo) {
    if ((ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) && nodo.moduleSpecifier && ts.isStringLiteral(nodo.moduleSpecifier)) {
      rutas.push(nodo.moduleSpecifier.text);
    }
    if (ts.isCallExpression(nodo) && nodo.expression.kind === ts.SyntaxKind.ImportKeyword && nodo.arguments[0] && ts.isStringLiteralLike(nodo.arguments[0])) {
      rutas.push(nodo.arguments[0].text);
    }
    ts.forEachChild(nodo, visitar);
  }
  visitar(modulo);
  return rutas.filter((ruta) => ruta.startsWith("."));
}

function comprobarGrafo(grafo) {
  const visitados = new Set();
  const activos = new Set();
  function visitar(archivo, camino) {
    if (activos.has(archivo)) {
      throw new Error("dependencia circular: " + [...camino, archivo].map((ruta) => relative(raiz, ruta)).join(" → "));
    }
    if (visitados.has(archivo)) return;
    activos.add(archivo);
    for (const dependencia of grafo.get(archivo) ?? []) visitar(dependencia, [...camino, archivo]);
    activos.delete(archivo);
    visitados.add(archivo);
  }
  for (const archivo of grafo.keys()) visitar(archivo, []);
}

test("el analizador reconoce imports, reexports, efectos e imports dinámicos", () => {
  const codigo = [
    'import { algo } from "./a.js";',
    'import "./b.js";',
    'export { otro } from "./c.js";',
    'export * from "./d.js";',
    'const carga = () => import("./e.js");',
    '// import "./falso.js";',
    'const texto = "from falso.js";',
  ].join("\n");
  assert.deepEqual(dependencias(codigo), ["./a.js", "./b.js", "./c.js", "./d.js", "./e.js"]);
  assert.throws(() => comprobarGrafo(new Map([["a", ["b"]], ["b", ["a"]]])), /dependencia circular/);
  assert.throws(() => comprobarGrafo(new Map([["a", ["a"]]])), /dependencia circular/);
  assert.doesNotThrow(() => comprobarGrafo(new Map([["a", ["b", "c"]], ["b", ["c"]], ["c", []]])));
});

test("los módulos locales y main no contienen imports rotos ni dependencias circulares", () => {
  const archivos = new Set([join(raiz, "main.js"), ...listarJs(join(raiz, "src"))]);
  const grafo = new Map();
  let aristas = 0;
  for (const archivo of archivos) {
    const rutas = dependencias(readFileSync(archivo, "utf8")).map((ruta) => resolve(dirname(archivo), ruta));
    for (const ruta of rutas) assert.ok(archivos.has(ruta), "import local inexistente: " + ruta);
    aristas += rutas.length;
    grafo.set(archivo, rutas);
  }
  assert.ok(aristas > 0, "El detector no puede aprobar un grafo vacío.");
  comprobarGrafo(grafo);
});

function listarJs(directorio) {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return listarJs(ruta);
    return entrada.isFile() && entrada.name.endsWith(".js") ? [ruta] : [];
  });
}
