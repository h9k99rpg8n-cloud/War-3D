export const TIPOS_BLOQUE = Object.freeze(["pasto", "hojas", "madera"]);

const DEFINICIONES = Object.freeze({
  pasto: Object.freeze({
    base: [91, 190, 76],
    claro: [132, 222, 101],
    oscuro: [48, 130, 54],
    emissive: 0x174a1c,
    intensidadEmisiva: 0.42,
    semilla: 11,
  }),
  hojas: Object.freeze({
    base: [45, 143, 61],
    claro: [83, 188, 75],
    oscuro: [24, 95, 46],
    emissive: 0x103d1e,
    intensidadEmisiva: 0.34,
    semilla: 29,
  }),
  madera: Object.freeze({
    base: [151, 103, 58],
    claro: [190, 139, 76],
    oscuro: [91, 58, 39],
    emissive: 0x3d2415,
    intensidadEmisiva: 0.26,
    semilla: 47,
  }),
});

export function crearBibliotecaBloques(THREE) {
  const materialesInstanciados = {};
  const materialesRecolectables = {};

  for (const tipo of TIPOS_BLOQUE) {
    const definicion = DEFINICIONES[tipo];
    const textura = crearTexturaProcedural(THREE, tipo, definicion);
    materialesInstanciados[tipo] = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: definicion.emissive,
      emissiveIntensity: definicion.intensidadEmisiva,
      flatShading: true,
      map: textura,
      vertexColors: true,
    });
    materialesRecolectables[tipo] = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: definicion.emissive,
      emissiveIntensity: definicion.intensidadEmisiva + 0.12,
      flatShading: true,
      map: textura,
    });
  }

  return { materialesInstanciados, materialesRecolectables };
}

function crearTexturaProcedural(THREE, tipo, definicion) {
  const tamano = 16;
  const datos = new Uint8Array(tamano * tamano * 4);

  for (let y = 0; y < tamano; y += 1) {
    for (let x = 0; x < tamano; x += 1) {
      const ruido = hashPixel(x, y, definicion.semilla);
      let color = definicion.base;

      if (tipo === "pasto") {
        if (ruido > 0.82) color = definicion.claro;
        else if (ruido < 0.18) color = definicion.oscuro;
      } else if (tipo === "hojas") {
        const grupo = hashPixel(Math.floor(x / 2), Math.floor(y / 2), definicion.semilla + 8);
        if (grupo > 0.7 || (x + y) % 7 === 0) color = definicion.claro;
        else if (grupo < 0.3 || ruido < 0.15) color = definicion.oscuro;
      } else {
        const franja = (x + Math.floor(y / 4)) % 5;
        if (franja === 0 || ruido < 0.12) color = definicion.oscuro;
        else if (franja === 3 && ruido > 0.52) color = definicion.claro;
      }

      const indice = (y * tamano + x) * 4;
      datos[indice] = color[0];
      datos[indice + 1] = color[1];
      datos[indice + 2] = color[2];
      datos[indice + 3] = 255;
    }
  }

  const textura = new THREE.DataTexture(datos, tamano, tamano, THREE.RGBAFormat);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestMipmapNearestFilter;
  textura.generateMipmaps = true;
  textura.needsUpdate = true;
  return textura;
}

function hashPixel(x, y, semilla) {
  const valor = Math.sin(x * 127.1 + y * 311.7 + semilla * 73.9) * 43758.5453;
  return valor - Math.floor(valor);
}
