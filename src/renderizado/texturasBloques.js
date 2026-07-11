export const TIPOS_BLOQUE = Object.freeze([
  "pasto",
  "hojas",
  "madera",
  "arena",
  "agua",
]);

export const TIPOS_RECOLECTABLES = Object.freeze([
  "pasto",
  "hojas",
  "madera",
  "arena",
]);

export function crearBibliotecaBloques(THREE) {
  const texturas = {
    pastoSuperior: crearTextura(THREE, "pasto-superior", pixelPastoSuperior),
    pastoLateral: crearTextura(THREE, "pasto-lateral", pixelPastoLateral),
    tierra: crearTextura(THREE, "tierra", pixelTierra),
    hojas: crearTextura(THREE, "hojas", pixelHojas),
    corteMadera: crearTextura(THREE, "corte-madera", pixelCorteMadera),
    maderaLateral: crearTextura(THREE, "madera-lateral", pixelMaderaLateral),
    arena: crearTextura(THREE, "arena", pixelArena),
    agua: crearTextura(THREE, "agua", pixelAgua),
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
    agua: materialAgua(THREE, texturas.agua),
  };

  return {
    materialesInstanciados: materialesCompartidos,
    materialesRecolectables: materialesCompartidos,
    texturas,
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

function crearTextura(THREE, nombre, obtenerPixel) {
  const tamano = 16;
  const datos = new Uint8Array(tamano * tamano * 4);

  for (let y = 0; y < tamano; y += 1) {
    for (let x = 0; x < tamano; x += 1) {
      const color = obtenerPixel(x, y);
      const indice = (y * tamano + x) * 4;
      datos[indice] = color[0];
      datos[indice + 1] = color[1];
      datos[indice + 2] = color[2];
      datos[indice + 3] = 255;
    }
  }

  const textura = new THREE.DataTexture(datos, tamano, tamano, THREE.RGBAFormat);
  textura.name = nombre;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestMipmapNearestFilter;
  textura.generateMipmaps = true;
  textura.needsUpdate = true;
  return textura;
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
  const grano = (x * 5 + y * 3 + Math.floor(ruido * 7)) % 13;
  if (grano === 0 || ruido > 0.9) return [242, 214, 132];
  if (grano === 6 || ruido < 0.13) return [164, 130, 72];
  return ruido > 0.52 ? [219, 185, 103] : [198, 160, 84];
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
