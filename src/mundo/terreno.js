export function crearTerreno(THREE, scene, configuracion) {
  const { fondoTerreno, tamanoBloque, tamanoCuadricula } = configuracion.mundo;
  const alturas = Array.from({ length: tamanoCuadricula }, () =>
    Array(tamanoCuadricula).fill(0),
  );
  const geometria = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  const terreno = new THREE.InstancedMesh(
    geometria,
    material,
    tamanoCuadricula * tamanoCuadricula,
  );
  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const rotacion = new THREE.Quaternion();
  const escala = new THREE.Vector3();
  const color = new THREE.Color();
  const paleta = [
    new THREE.Color(0x5f9864),
    new THREE.Color(0x79a765),
    new THREE.Color(0xc49a5a),
    new THREE.Color(0xa46150),
    new THREE.Color(0x66859a),
    new THREE.Color(0x9a6f98),
  ];

  let instancia = 0;
  for (let z = 0; z < tamanoCuadricula; z += 1) {
    for (let x = 0; x < tamanoCuadricula; x += 1) {
      const worldX = (x - (tamanoCuadricula - 1) / 2) * tamanoBloque;
      const worldZ = (z - (tamanoCuadricula - 1) / 2) * tamanoBloque;
      const nx = x - (tamanoCuadricula - 1) / 2;
      const nz = z - (tamanoCuadricula - 1) / 2;

      const ondas =
        Math.sin(nx * 0.29) * 0.35 +
        Math.cos(nz * 0.33) * 0.27 +
        Math.sin((nx + nz) * 0.18) * 0.2;
      const superficie = Math.round(ondas * 4) * 0.13;
      alturas[z][x] = superficie;

      const alturaBloque = superficie - fondoTerreno;
      posicion.set(worldX, fondoTerreno + alturaBloque / 2, worldZ);

      // Los cubos ahora ocupan exactamente su celda: no quedan grietas hacia el vacío.
      escala.set(tamanoBloque, alturaBloque, tamanoBloque);
      matriz.compose(posicion, rotacion, escala);
      terreno.setMatrixAt(instancia, matriz);

      const region =
        Math.sin(nx * 0.14 + 1.8) +
        Math.cos(nz * 0.16 - 0.7) +
        Math.sin((nx - nz) * 0.08);
      const indiceColor = Math.abs(Math.floor((region + 3) * 1.17)) % paleta.length;
      color.copy(paleta[indiceColor]);
      color.offsetHSL(0, 0, hash2D(x, z) * 0.055 - 0.0275);
      terreno.setColorAt(instancia, color);
      instancia += 1;
    }
  }

  terreno.instanceMatrix.needsUpdate = true;
  terreno.instanceColor.needsUpdate = true;
  terreno.computeBoundingBox();
  terreno.computeBoundingSphere();
  scene.add(terreno);

  return {
    obtenerAltura(worldX, worldZ) {
      return interpolarAltura(THREE, alturas, worldX, worldZ, configuracion.mundo);
    },
  };
}

function hash2D(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function interpolarAltura(THREE, alturas, worldX, worldZ, configuracion) {
  const { tamanoBloque, tamanoCuadricula } = configuracion;
  const gridX = THREE.MathUtils.clamp(
    worldX / tamanoBloque + (tamanoCuadricula - 1) / 2,
    0,
    tamanoCuadricula - 1,
  );
  const gridZ = THREE.MathUtils.clamp(
    worldZ / tamanoBloque + (tamanoCuadricula - 1) / 2,
    0,
    tamanoCuadricula - 1,
  );
  const x0 = Math.floor(gridX);
  const z0 = Math.floor(gridZ);
  const x1 = Math.min(x0 + 1, tamanoCuadricula - 1);
  const z1 = Math.min(z0 + 1, tamanoCuadricula - 1);
  const tx = gridX - x0;
  const tz = gridZ - z0;
  const a = THREE.MathUtils.lerp(alturas[z0][x0], alturas[z0][x1], tx);
  const b = THREE.MathUtils.lerp(alturas[z1][x0], alturas[z1][x1], tx);
  return THREE.MathUtils.lerp(a, b, tz);
}
