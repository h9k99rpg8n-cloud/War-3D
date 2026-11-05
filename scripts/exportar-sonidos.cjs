/**
 * Exporta el catálogo de sonidos a WAV para escucharlo fuera del juego.
 *
 * Uso:
 *   node scripts/exportar-sonidos.cjs            # todos, en /tmp/war3d-sonidos
 *   node scripts/exportar-sonidos.cjs --out docs/audio
 *
 * No forma parte del build; es una herramienta de revisión.
 */
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function argumento(nombre, respaldo) {
  const indice = process.argv.indexOf(`--${nombre}`);
  return indice >= 0 ? process.argv[indice + 1] : respaldo;
}

function escribirWav(destino, datos, frecuenciaMuestreo) {
  const bytes = datos.length * 2;
  const buffer = Buffer.alloc(44 + bytes);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + bytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(frecuenciaMuestreo, 24);
  buffer.writeUInt32LE(frecuenciaMuestreo * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(bytes, 40);
  for (let i = 0; i < datos.length; i += 1) {
    const muestra = Math.max(-1, Math.min(1, datos[i]));
    buffer.writeInt16LE(Math.round(muestra * 32767), 44 + i * 2);
  }
  fs.writeFileSync(destino, buffer);
}

async function main() {
  const raiz = path.resolve(__dirname, "..");
  const salida = path.resolve(raiz, argumento("out", "/tmp/war3d-sonidos"));
  fs.mkdirSync(salida, { recursive: true });
  const modulo = await import(
    pathToFileURL(path.join(raiz, "src/audio/catalogoSonidos.js")).href
  );

  let archivos = 0;
  for (const entrada of modulo.CATALOGO_SONIDOS) {
    const variantes = modulo.generarVariantes(entrada.id);
    variantes.forEach((variante, indice) => {
      const nombre = `${entrada.id.replace("war:", "")}-${indice + 1}.wav`;
      escribirWav(
        path.join(salida, nombre),
        variante.datos,
        variante.frecuenciaMuestreo,
      );
      archivos += 1;
    });
  }
  console.log(`${archivos} archivos WAV escritos en ${salida}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
