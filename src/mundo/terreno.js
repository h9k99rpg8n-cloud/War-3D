export function crearTerreno(THREE, scene, configuracion) {
  const {
    nivelFondo,
    nivelMaximoColocacion,
    tamanoBloque,
    tamanoCuadricula,
  } = configuracion.mundo;
  const bloques = new Map();
  const bloquesPorInstancia = [];
  const alturas = Array.from({ length: tamanoCuadricula }, () =>
    Array(tamanoCuadricula).fill(0),
  );

  for (let z = 0; z < tamanoCuadricula; z += 1) {
    for (let x = 0; x < tamanoCuadricula; x += 1) {
      const nivelSuperficie = calcularNivelSuperficie(x, z, tamanoCuadricula);
      for (let y = nivelFondo; y <= nivelSuperficie; y += 1) {
        const bloque = crearDatosBloque(x, y, z);
        bloques.set(bloque.clave, bloque);
      }
      alturas[z][x] = (nivelSuperficie + 0.5) * tamanoBloque;
    }
  }

  const geometria = new THREE.BoxGeometry(tamanoBloque, tamanoBloque, tamanoBloque);
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x174a1c,
    emissiveIntensity: 0.48,
    flatShading: true,
    vertexColors: true,
  });
  const capacidad = bloques.size + configuracion.inventario.limiteBloquesPasto + 16;
  const malla = new THREE.InstancedMesh(geometria, material, capacidad);
  malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const color = new THREE.Color();
  const verdeBase = new THREE.Color(0x6ed15d);

  reconstruirMalla();
  scene.add(malla);

  return {
    malla,

    contieneBloque(bloque) {
      return Boolean(bloque && bloques.has(bloque.clave));
    },

    obtenerBloquePorInstancia(instanceId) {
      return bloquesPorInstancia[instanceId] ?? null;
    },

    obtenerCentroBloque(bloque) {
      return new THREE.Vector3(
        indiceAMundo(bloque.x, tamanoCuadricula, tamanoBloque),
        bloque.y * tamanoBloque,
        indiceAMundo(bloque.z, tamanoCuadricula, tamanoBloque),
      );
    },

    obtenerAltura(worldX, worldZ) {
      return interpolarAltura(
        THREE,
        alturas,
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
    },

    romperBloque(bloque) {
      if (!bloque || !bloques.delete(bloque.clave)) return null;
      const posicionRota = this.obtenerCentroBloque(bloque);
      recalcularAlturaColumna(bloque.x, bloque.z);
      reconstruirMalla();
      return { bloque, posicion: posicionRota };
    },

    colocarAdyacente(bloqueBase, normal, validarPosicion) {
      if (!bloqueBase || !normal) return { ok: false, motivo: "sin_objetivo" };

      const deltaX = Math.round(normal.x);
      const deltaY = Math.round(normal.y);
      const deltaZ = Math.round(normal.z);
      if (deltaX === 0 && deltaY === 0 && deltaZ === 0) {
        return { ok: false, motivo: "sin_cara" };
      }

      const x = bloqueBase.x + deltaX;
      const y = bloqueBase.y + deltaY;
      const z = bloqueBase.z + deltaZ;
      if (x < 0 || x >= tamanoCuadricula || z < 0 || z >= tamanoCuadricula) {
        return { ok: false, motivo: "fuera_mundo" };
      }
      if (y < nivelFondo || y > nivelMaximoColocacion) {
        return { ok: false, motivo: "altura_invalida" };
      }

      const bloque = crearDatosBloque(x, y, z);
      if (bloques.has(bloque.clave)) return { ok: false, motivo: "ocupado" };
      if (malla.count >= capacidad) return { ok: false, motivo: "sin_capacidad" };

      const posicionBloque = this.obtenerCentroBloque(bloque);
      if (validarPosicion && !validarPosicion(posicionBloque)) {
        return { ok: false, motivo: "jugador" };
      }

      bloques.set(bloque.clave, bloque);
      recalcularAlturaColumna(x, z);
      reconstruirMalla();
      return { ok: true, bloque, posicion: posicionBloque };
    },
  };

  function reconstruirMalla() {
    let instancia = 0;
    bloquesPorInstancia.length = 0;

    for (const bloque of bloques.values()) {
      posicion.set(
        indiceAMundo(bloque.x, tamanoCuadricula, tamanoBloque),
        bloque.y * tamanoBloque,
        indiceAMundo(bloque.z, tamanoCuadricula, tamanoBloque),
      );
      matriz.makeTranslation(posicion.x, posicion.y, posicion.z);
      malla.setMatrixAt(instancia, matriz);

      color.copy(verdeBase);
      color.offsetHSL(0, 0, hash3D(bloque.x, bloque.y, bloque.z) * 0.045 - 0.0225);
      malla.setColorAt(instancia, color);
      bloquesPorInstancia.push(bloque);
      instancia += 1;
    }

    malla.count = instancia;
    malla.instanceMatrix.needsUpdate = true;
    malla.instanceColor.needsUpdate = true;
    malla.computeBoundingBox();
    malla.computeBoundingSphere();
  }

  function recalcularAlturaColumna(x, z) {
    let nivelSuperior = null;
    for (let y = nivelMaximoColocacion; y >= nivelFondo; y -= 1) {
      if (bloques.has(claveBloque(x, y, z))) {
        nivelSuperior = y;
        break;
      }
    }
    alturas[z][x] =
      nivelSuperior === null
        ? (nivelFondo - 0.5) * tamanoBloque
        : (nivelSuperior + 0.5) * tamanoBloque;
  }
}

function crearDatosBloque(x, y, z) {
  return { x, y, z, clave: claveBloque(x, y, z), tipo: "pasto" };
}

function claveBloque(x, y, z) {
  return `${x}|${y}|${z}`;
}

function indiceAMundo(indice, tamanoCuadricula, tamanoBloque) {
  return (indice - (tamanoCuadricula - 1) / 2) * tamanoBloque;
}

function calcularNivelSuperficie(x, z, tamanoCuadricula) {
  const nx = x - (tamanoCuadricula - 1) / 2;
  const nz = z - (tamanoCuadricula - 1) / 2;
  const ondas =
    Math.sin(nx * 0.29) * 0.35 +
    Math.cos(nz * 0.33) * 0.27 +
    Math.sin((nx + nz) * 0.18) * 0.2;
  return Math.round(ondas * 1.15);
}

function hash3D(x, y, z) {
  const value = Math.sin(x * 127.1 + y * 74.7 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function interpolarAltura(
  THREE,
  alturas,
  worldX,
  worldZ,
  tamanoBloque,
  tamanoCuadricula,
) {
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
