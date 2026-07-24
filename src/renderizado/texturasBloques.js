import { IDS_BLOQUES } from "../contenido/registroContenido.js";

export const TIPOS_BLOQUE = Object.freeze([...IDS_BLOQUES, "agua"]);
export const TIPOS_RECOLECTABLES = IDS_BLOQUES;

export function crearBibliotecaBloques(THREE, estiloVisual = "traditional") {
  const pixelar = estiloVisual === "pixelar";
  const textura = (nombre, obtenerPixel) =>
    crearTextura(THREE, nombre, obtenerPixel, pixelar);
  const texturas = {
    pastoSuperior: textura("pasto-superior", pixelPastoSuperior),
    pastoLateral: textura("pasto-lateral", pixelPastoLateral),
    tierra: textura("tierra", pixelTierra),
    hojas: textura("hojas", pixelHojas),
    corteMadera: textura("corte-madera", pixelCorteMadera),
    maderaLateral: textura("madera-lateral", pixelMaderaLateral),
    arena: textura("arena", pixelArena),
    tierraBloque: textura("tierra-bloque", pixelTierraBloque),
    piedra: textura("piedra", pixelPiedra),
    piedraLisa: textura("piedra-lisa", pixelPiedraLisa),
    carbonMineral: textura("carbon-mineral", pixelCarbonMineral),
    hierroMineral: textura("hierro-mineral", pixelHierroMineral),
    tablones: textura("tablones", pixelTablones),
    mesaCrafteoSuperior: textura(
      "mesa-crafteo-superior",
      pixelMesaCrafteoSuperior,
    ),
    mesaCrafteoLateral: textura(
      "mesa-crafteo-lateral",
      pixelMesaCrafteoLateral,
    ),
    mesaCrafteoInferior: textura(
      "mesa-crafteo-inferior",
      pixelMesaCrafteoInferior,
    ),
    horno: textura("horno", pixelHorno),
    cristal: textura("cristal", pixelCristal),
    palo: textura("palo", pixelPalo),
    carbon: textura("carbon", pixelCarbon),
    hierroBruto: textura("hierro-bruto", pixelHierroBruto),
    picoMadera: textura("pico-madera", pixelPicoMadera),
    arco: textura("arco-umbral", pixelArco),
    huevoArana: textura("huevo-arana", pixelHuevoArana),
    huevoZombie: textura("huevo-zombie", pixelHuevoZombie),
    huevoEsqueleto: textura("huevo-esqueleto", pixelHuevoEsqueleto),
    agua: textura("agua", pixelAgua),
  };

  const materialesCompartidos = {
    pasto: carasCubo(
      material(THREE, texturas.pastoLateral, 0x174a1c, 0.54),
      material(THREE, texturas.pastoSuperior, 0x1b521d, 0.58),
      material(THREE, texturas.tierra, 0x3b2415, 0.38),
    ),
    hojas: material(THREE, texturas.hojas, 0x103d1e, 0.5),
    madera: carasCubo(
      material(THREE, texturas.maderaLateral, 0x3d2415, 0.43),
      material(THREE, texturas.corteMadera, 0x4b2c18, 0.46),
      material(THREE, texturas.corteMadera, 0x3a2114, 0.39),
    ),
    arena: material(THREE, texturas.arena, 0x6b5527, 0.34),
    tierra: material(THREE, texturas.tierraBloque, 0x3b2415, 0.38),
    piedra: material(THREE, texturas.piedra, 0x30343a, 0.2),
    piedra_lisa: material(THREE, texturas.piedraLisa, 0x383c42, 0.22),
    carbon_mineral: material(THREE, texturas.carbonMineral, 0x202126, 0.17),
    hierro_mineral: material(THREE, texturas.hierroMineral, 0x493a31, 0.2),
    tablones: material(THREE, texturas.tablones, 0x493018, 0.33),
    mesa_crafteo: carasCubo(
      material(THREE, texturas.mesaCrafteoLateral, 0x50321a, 0.3),
      material(THREE, texturas.mesaCrafteoSuperior, 0x58361b, 0.34),
      material(THREE, texturas.mesaCrafteoInferior, 0x3b2618, 0.26),
    ),
    horno: material(THREE, texturas.horno, 0x26282c, 0.2),
    cristal: materialCristal(THREE, texturas.cristal),
    agua: materialAgua(THREE, texturas.agua),
  };
  const materialesObjetos = {
    palo: material(THREE, texturas.palo, 0x4b2e18, 0.4),
    carbon: material(THREE, texturas.carbon, 0x111218, 0.22),
    hierro_bruto: material(THREE, texturas.hierroBruto, 0x5e4032, 0.3),
    pico_madera: material(THREE, texturas.picoMadera, 0x5b3b1f, 0.34),
    arco: material(THREE, texturas.arco, 0x3f2b20, 0.3),
    huevo_arana: material(THREE, texturas.huevoArana, 0x351923, 0.3),
    huevo_zombie: material(THREE, texturas.huevoZombie, 0x284d2a, 0.32),
    huevo_esqueleto_umbral: material(
      THREE,
      texturas.huevoEsqueleto,
      0x303746,
      0.34,
    ),
  };

  return {
    materialesInstanciados: materialesCompartidos,
    materialesRecolectables: {
      ...materialesCompartidos,
      ...materialesObjetos,
    },
    texturas,
    estiloVisual: pixelar ? "pixelar" : "traditional",
    dispose() {
      for (const texturaActual of Object.values(texturas)) texturaActual.dispose();
      const materiales = new Set([
        ...Object.values(materialesCompartidos).flat(),
        ...Object.values(materialesObjetos),
      ]);
      for (const materialActual of materiales) materialActual?.dispose?.();
    },
  };
}

// BoxGeometry ordena sus grupos como derecha, izquierda, arriba, abajo, frente y atrás.
function carasCubo(lateral, superior, inferior) {
  return [lateral, lateral, superior, inferior, lateral, lateral];
}

function material(THREE, textura, emisivo, intensidad) {
  return new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: emisivo,
    emissiveIntensity: intensidad,
    flatShading: true,
    map: textura,
    vertexColors: false,
  });
}

function materialAgua(THREE, textura) {
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(0.42, 0.42);
  return new THREE.MeshPhongMaterial({
    color: 0xb7eeff,
    emissive: 0x0b416c,
    emissiveIntensity: 0.36,
    map: textura,
    opacity: 0.78,
    transparent: true,
    depthWrite: false,
    shininess: 84,
    specular: 0xbfefff,
    side: THREE.DoubleSide,
    vertexColors: false,
  });
}

function materialCristal(THREE, textura) {
  return new THREE.MeshPhongMaterial({
    color: 0xdffaff,
    emissive: 0x153c48,
    emissiveIntensity: 0.22,
    map: textura,
    opacity: 0.48,
    transparent: true,
    depthWrite: false,
    shininess: 96,
    specular: 0xd9fbff,
    side: THREE.DoubleSide,
  });
}

function crearTextura(THREE, nombre, obtenerPixel, pixelar = false) {
  const tamano = pixelar ? 8 : 16;
  const datos = new Uint8Array(tamano * tamano * 4);

  for (let y = 0; y < tamano; y += 1) {
    for (let x = 0; x < tamano; x += 1) {
      const colorBase = obtenerPixel(
        pixelar ? x * 2 : x,
        pixelar ? y * 2 : y,
      );
      const color = pixelar ? cuantizarPixel(colorBase) : colorBase;
      const indice = (y * tamano + x) * 4;
      datos[indice] = color[0];
      datos[indice + 1] = color[1];
      datos[indice + 2] = color[2];
      datos[indice + 3] = color[3] ?? 255;
    }
  }

  const textura = new THREE.DataTexture(datos, tamano, tamano, THREE.RGBAFormat);
  textura.name = nombre;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = pixelar ? THREE.NearestFilter : THREE.LinearFilter;
  textura.minFilter = pixelar
    ? THREE.NearestFilter
    : THREE.LinearMipmapLinearFilter;
  textura.generateMipmaps = true;
  textura.needsUpdate = true;
  return textura;
}

function cuantizarPixel(color) {
  return [
    Math.max(0, Math.min(255, Math.round(color[0] / 28) * 28)),
    Math.max(0, Math.min(255, Math.round(color[1] / 28) * 28)),
    Math.max(0, Math.min(255, Math.round(color[2] / 28) * 28)),
    color[3] ?? 255,
  ];
}

function pixelPastoSuperior(x, y) {
  const ruido = hashPixel(x, y, 11);
  const veta = (x * 3 + y * 5 + Math.floor(ruido * 5)) % 11;
  if (veta === 0 || (veta === 1 && ruido > 0.54)) return [43, 127, 45];
  if (veta === 6 || ruido > 0.88) return [132, 218, 91];
  return ruido < 0.34 ? [77, 169, 61] : [96, 193, 73];
}

function pixelPastoLateral(x, y) {
  const ruido = hashPixel(x, y, 23);
  const bordePasto = 11 + Math.floor(hashPixel(x, 0, 31) * 3);
  if (y >= bordePasto) {
    return ruido > 0.73 ? [123, 210, 83] : ruido < 0.23 ? [49, 133, 47] : [84, 179, 64];
  }
  if (y >= bordePasto - 2 && hashPixel(x, y, 37) > 0.55) return [55, 145, 49];
  return pixelTierra(x, y);
}

function pixelTierra(x, y) {
  const ruido = hashPixel(x, y, 41);
  if (ruido > 0.83) return [154, 106, 61];
  if (ruido < 0.2) return [83, 54, 37];
  return ruido > 0.52 ? [127, 82, 48] : [109, 69, 43];
}

function pixelHojas(x, y) {
  const grupo = hashPixel(Math.floor(x / 3), Math.floor(y / 3), 53);
  const nervadura = (x + y * 2) % 9 === 0 || (x * 2 - y + 32) % 11 === 0;
  if (nervadura) return [112, 193, 73];
  if (grupo > 0.72) return [70, 163, 61];
  if (grupo < 0.25 || hashPixel(x, y, 59) < 0.12) return [24, 93, 42];
  return [43, 134, 52];
}

function pixelMaderaLateral(x, y) {
  const ruido = hashPixel(x, y, 71);
  const franja = (x + Math.floor(y / 5)) % 5;
  if (franja === 0 || ruido < 0.11) return [84, 48, 29];
  if (franja === 3 && ruido > 0.48) return [185, 119, 62];
  return ruido > 0.62 ? [150, 91, 48] : [125, 72, 40];
}

function pixelCorteMadera(x, y) {
  const dx = x - 7.5;
  const dy = y - 7.5;
  const distancia = Math.sqrt(dx * dx + dy * dy);
  const anillo = Math.floor(distancia * 1.45 + hashPixel(x, y, 83) * 0.8) % 3;
  if (distancia < 1.8) return [87, 49, 27];
  if (anillo === 0) return [112, 65, 34];
  if (anillo === 1) return [193, 132, 73];
  return [157, 99, 53];
}

function pixelArena(x, y) {
  const ruido = hashPixel(x, y, 97);
  const grano = (x * 7 + y * 5 + Math.floor(ruido * 9)) % 17;
  const veta = Math.sin((x + y * 0.72) * 0.92) + ruido * 0.55;
  if (grano === 0 || ruido > 0.93) return [239, 218, 157];
  if (grano === 8 || ruido < 0.09) return [139, 112, 69];
  if (veta > 1.12) return [218, 192, 132];
  return ruido > 0.5 ? [199, 169, 109] : [181, 149, 91];
}

function pixelTierraBloque(x, y) {
  const ruido = hashPixel(x, y, 103);
  const grumo = hashPixel(Math.floor(x / 3), Math.floor(y / 3), 107);
  const piedra = (x * 5 + y * 7 + Math.floor(ruido * 8)) % 23;
  if (piedra === 0) return [166, 126, 83];
  if (piedra === 11 || ruido < 0.08) return [66, 47, 37];
  if (grumo > 0.78) return [143, 92, 53];
  if (grumo < 0.22) return [86, 57, 41];
  return ruido > 0.48 ? [119, 76, 45] : [102, 65, 42];
}

function pixelPiedra(x, y) {
  const ruido = hashPixel(x, y, 127);
  const fragmento = hashPixel(Math.floor(x / 4), Math.floor(y / 3), 131);
  const grieta =
    (x * 5 + y * 9 + Math.floor(fragmento * 11)) % 29 <= 1 &&
    hashPixel(x, y, 133) > 0.3;
  if (grieta) return [57, 63, 69];
  if (fragmento > 0.82) return ruido > 0.5 ? [157, 163, 166] : [139, 146, 151];
  if (fragmento < 0.18) return ruido > 0.5 ? [83, 90, 96] : [95, 101, 107];
  return ruido > 0.58 ? [128, 134, 139] : [111, 117, 123];
}

function pixelPiedraLisa(x, y) {
  const borde = x % 8 === 0 || y % 8 === 0;
  const ruido = hashPixel(x, y, 139);
  const brillo = (x + y * 3) % 17 === 0;
  if (borde) return [82, 89, 95];
  if (brillo) return [151, 157, 161];
  return ruido > 0.68 ? [139, 145, 150] : [123, 130, 136];
}

function pixelCarbonMineral(x, y) {
  const base = pixelPiedra(x, y);
  const veta = hashPixel(Math.floor(x / 2), Math.floor(y / 2), 149);
  return veta > 0.7 ? [28, 29, 33] : base;
}

function pixelHierroMineral(x, y) {
  const base = pixelPiedra(x, y);
  const veta = hashPixel(Math.floor(x / 2), Math.floor(y / 2), 157);
  if (veta > 0.76) return [190, 121, 82];
  if (veta < 0.1) return [125, 76, 58];
  return base;
}

function pixelTablones(x, y) {
  const junta = y % 5 === 0 || (x % 8 === 0 && Math.floor(y / 5) % 2 === 0);
  const ruido = hashPixel(x, y, 163);
  if (junta) return [83, 49, 27];
  return ruido > 0.62 ? [196, 130, 67] : [157, 94, 47];
}

function pixelMesaCrafteoSuperior(x, y) {
  const borde = x <= 1 || y <= 1 || x >= 14 || y >= 14;
  if (borde) return [69, 40, 24];
  const serrucho =
    y >= 4 && y <= 5 && x >= 3 && x <= 11 ||
    y === 6 && x >= 5 && x <= 12 && x % 2 === 0;
  if (serrucho) return [187, 193, 183];
  const mangoSerrucho = x >= 11 && x <= 13 && y >= 3 && y <= 6;
  if (mangoSerrucho) return [87, 49, 26];
  const martillo =
    x >= 4 && x <= 5 && y >= 8 && y <= 13 ||
    x >= 2 && x <= 8 && y >= 8 && y <= 9;
  if (martillo) return x <= 7 && y <= 9 ? [72, 76, 78] : [110, 61, 31];
  return hashPixel(x, y, 167) > 0.58 ? [180, 111, 55] : [151, 88, 43];
}

function pixelMesaCrafteoLateral(x, y) {
  const herraje = x <= 1 || x >= 14 || (y >= 7 && y <= 8);
  if (herraje) return [73, 62, 52];
  const tabla = Math.floor(x / 4) % 2;
  const marca = (x * 3 + y * 5) % 19 === 0;
  if (marca) return [81, 46, 26];
  return tabla ? [176, 105, 51] : [133, 77, 39];
}

function pixelMesaCrafteoInferior(x, y) {
  const junta = x % 8 === 0 || y % 8 === 0;
  if (junta) return [63, 39, 26];
  return hashPixel(x, y, 169) > 0.55 ? [116, 72, 43] : [95, 58, 37];
}

function pixelHorno(x, y) {
  const base = pixelPiedra(x, y);
  const abertura = x >= 4 && x <= 11 && y >= 3 && y <= 9;
  if (abertura) return y > 7 ? [126, 54, 27] : [35, 35, 39];
  return base;
}

function pixelCristal(x, y) {
  const borde = x === 0 || y === 0 || x === 15 || y === 15;
  const brillo = x === y || x + y === 15;
  if (borde) return [118, 219, 231, 220];
  if (brillo) return [223, 253, 255, 145];
  return [164, 235, 241, 66];
}

function pixelPalo(x, y) {
  return Math.abs(x - y) < 3
    ? [154, 91, 45]
    : [63, 42, 28];
}

function pixelCarbon(x, y) {
  const ruido = hashPixel(x, y, 173);
  return ruido > 0.75 ? [66, 68, 74] : ruido < 0.2 ? [12, 13, 16] : [35, 36, 41];
}

function pixelHierroBruto(x, y) {
  const ruido = hashPixel(x, y, 179);
  return ruido > 0.67 ? [203, 132, 87] : ruido < 0.2 ? [91, 59, 48] : [151, 91, 65];
}

function pixelPicoMadera(x, y) {
  const mango = Math.abs(x - 8) <= 1 && y < 12;
  const cabeza = y >= 10 && y <= 12 && x >= 2 && x <= 14;
  return mango || cabeza ? [177, 111, 57] : [55, 38, 27];
}

function pixelArco(x, y) {
  const curva = Math.abs(Math.hypot(x - 8, y - 8) - 6) < 1.4 && x >= 7;
  const cuerda = Math.abs(x - 8) < 1;
  return curva ? [133, 82, 48] : cuerda ? [212, 209, 181] : [49, 38, 33];
}

function pixelHuevoArana(x, y) {
  const ruido = hashPixel(x, y, 181);
  return ruido > 0.68 ? [137, 74, 91] : ruido < 0.22 ? [32, 22, 28] : [78, 40, 55];
}

function pixelHuevoZombie(x, y) {
  const ruido = hashPixel(x, y, 191);
  return ruido > 0.7 ? [132, 197, 103] : ruido < 0.2 ? [44, 78, 53] : [76, 137, 73];
}

function pixelHuevoEsqueleto(x, y) {
  const ruido = hashPixel(x, y, 193);
  return ruido > 0.72 ? [185, 200, 212] : ruido < 0.2 ? [40, 50, 66] : [93, 112, 134];
}

function pixelAgua(x, y) {
  const ruido = hashPixel(x, y, 109);
  const onda = (x + Math.floor(y / 2) * 3) % 9;
  if (onda === 0 || (onda === 1 && ruido > 0.45)) return [91, 190, 229];
  if (ruido < 0.16) return [26, 104, 172];
  return ruido > 0.7 ? [67, 157, 210] : [42, 132, 193];
}

function hashPixel(x, y, semilla) {
  const valor = Math.sin(x * 127.1 + y * 311.7 + semilla * 73.9) * 43758.5453;
  return valor - Math.floor(valor);
}
