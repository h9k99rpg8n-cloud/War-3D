import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CATALOGO_SONIDOS,
  MAPA_MATERIAL_SONIDO,
  generarVariantes,
  obtenerEntradaSonido,
  sonidoDeMaterial,
  sonidoDePaso,
} from "../src/audio/catalogoSonidos.js";
import { crearAleatorio, ruido } from "../src/audio/dsp.js";

test("el catálogo de sonidos cubre bloques, criaturas, jugador e interfaz", () => {
  const categorias = new Set(CATALOGO_SONIDOS.map((sonido) => sonido.categoria));
  for (const esperada of ["bloque", "paso", "criatura", "jugador", "interfaz"]) {
    assert.ok(categorias.has(esperada), `falta la categoría ${esperada}`);
  }
  assert.ok(CATALOGO_SONIDOS.length >= 25);
});

test("cada sonido tiene identificador war:* válido y variantes declaradas", () => {
  const ids = new Set();
  for (const sonido of CATALOGO_SONIDOS) {
    assert.match(sonido.id, /^war:[a-z0-9_]+$/);
    assert.ok(!ids.has(sonido.id), `id duplicado: ${sonido.id}`);
    ids.add(sonido.id);
    assert.ok(Number.isInteger(sonido.variantes) && sonido.variantes >= 1);
    assert.ok(typeof sonido.generar === "function");
  }
});

test("todas las variantes se sintetizan sin silencio, sin saturar y sin NaN", () => {
  for (const sonido of CATALOGO_SONIDOS) {
    const variantes = generarVariantes(sonido.id);
    assert.equal(variantes.length, sonido.variantes, sonido.id);
    for (const variante of variantes) {
      const { datos } = variante;
      assert.ok(datos.length > 100, `${sonido.id} es demasiado corto`);
      let pico = 0;
      let energia = 0;
      for (let i = 0; i < datos.length; i += 1) {
        const muestra = datos[i];
        assert.ok(Number.isFinite(muestra), `${sonido.id} contiene NaN`);
        assert.ok(Math.abs(muestra) <= 1, `${sonido.id} satura: ${muestra}`);
        pico = Math.max(pico, Math.abs(muestra));
        energia += muestra * muestra;
      }
      assert.ok(pico > 0.2, `${sonido.id} sale casi mudo (pico ${pico})`);
      assert.ok(energia / datos.length > 0.0005, `${sonido.id} apenas tiene cuerpo`);
    }
  }
});

test("los sonidos son deterministas: misma semilla, mismas muestras", () => {
  for (const id of ["war:romper_piedra", "war:arana_ataque", "war:zombie_gemido"]) {
    const [a] = generarVariantes(id);
    const [b] = generarVariantes(id);
    assert.equal(a.datos.length, b.datos.length);
    for (let i = 0; i < a.datos.length; i += 97) {
      assert.equal(a.datos[i], b.datos[i]);
    }
  }
});

test("las variantes de un mismo sonido no son idénticas entre sí", () => {
  const variantes = generarVariantes("war:romper_madera");
  assert.ok(variantes.length > 1);
  const [primera, segunda] = variantes;
  let diferencias = 0;
  const largo = Math.min(primera.datos.length, segunda.datos.length);
  for (let i = 0; i < largo; i += 13) {
    if (Math.abs(primera.datos[i] - segunda.datos[i]) > 0.001) diferencias += 1;
  }
  assert.ok(diferencias > 0, "cada variante debe sonar distinta");
});

test("los sonidos de criaturas no son copias de los de bloque", () => {
  const bloque = generarVariantes("war:romper_tierra")[0].datos;
  const araña = generarVariantes("war:arana_ataque")[0].datos;
  const largo = Math.min(bloque.length, araña.length);
  let iguales = 0;
  for (let i = 0; i < largo; i += 31) {
    if (Math.abs(bloque[i] - araña[i]) < 1e-6) iguales += 1;
  }
  assert.ok(iguales < largo / 31);
  assert.ok(obtenerEntradaSonido("war:arana_ataque").distancia > 20);
});

test("inicio y final de cada sonido quedan en silencio (sin clics)", () => {
  for (const sonido of CATALOGO_SONIDOS) {
    const { datos } = generarVariantes(sonido.id)[0];
    assert.ok(Math.abs(datos[0]) < 0.02, `${sonido.id} empieza con clic`);
    assert.ok(
      Math.abs(datos[datos.length - 1]) < 0.05,
      `${sonido.id} termina con clic`,
    );
  }
});

test("cada material tiene su sonido de rotura y su sonido de paso", () => {
  for (const tipo of Object.keys(MAPA_MATERIAL_SONIDO)) {
    const rotura = sonidoDeMaterial(tipo);
    const paso = sonidoDePaso(tipo);
    assert.ok(obtenerEntradaSonido(rotura), `${tipo} sin sonido de rotura`);
    assert.ok(obtenerEntradaSonido(paso), `${tipo} sin sonido de paso`);
  }
  assert.equal(sonidoDeMaterial("pasto"), "war:romper_tierra");
  assert.equal(sonidoDeMaterial("tablones"), "war:romper_madera");
  assert.equal(sonidoDeMaterial("cristal"), "war:romper_cristal");
  // Un bloque desconocido cae en tierra, nunca rompe la partida.
  assert.equal(sonidoDeMaterial("bloque_inexistente"), "war:romper_tierra");
});

test("el generador de ruido es determinista y acotado", () => {
  const a = crearAleatorio(7);
  const b = crearAleatorio(7);
  const ruidoA = ruido(0.05, a);
  const ruidoB = ruido(0.05, b);
  assert.deepEqual(Array.from(ruidoA), Array.from(ruidoB));
  for (const muestra of ruidoA) {
    assert.ok(muestra >= -1 && muestra <= 1);
  }
});
