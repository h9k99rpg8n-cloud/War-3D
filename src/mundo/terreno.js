import {
  TIPOS_BLOQUE,
  crearBibliotecaBloques,
} from "../renderizado/texturasBloques.js";

export function crearTerreno(THREE, scene, configuracion) {
  const {
    nivelFondo,
    nivelMaximoColocacion,
    tamanoBloque,
    tamanoCuadricula,
  } = configuracion.mundo;
  const bloques = new Map();
  const bloquesPorTipo = Object.fromEntries(
    TIPOS_BLOQUE.map((tipo) => [tipo, new Map()]),
  );
  const bloquesPorInstancia = Object.fromEntries(
    TIPOS_BLOQUE.map((tipo) => [tipo, []]),
  );
  const mallasPorTipo = {};
  const capacidades = {};
  const nivelesSuelo = Array.from({ length: tamanoCuadricula }, () =>
    Array(tamanoCuadricula).fill(0),
  );
  const alturasPasto = Array.from({ length: tamanoCuadricula }, () =>
    Array(tamanoCuadricula).fill(0),
  );

  generarSuelo();
  generarArboles();

  const geometria = new THREE.BoxGeometry(tamanoBloque, tamanoBloque, tamanoBloque);
  const biblioteca = crearBibliotecaBloques(THREE);
  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const tinte = new THREE.Color();

  for (const tipo of TIPOS_BLOQUE) {
    const cantidadInicial = bloquesPorTipo[tipo].size;
    capacidades[tipo] =
      cantidadInicial + configuracion.inventario.limites[tipo] + 16;
    const malla = new THREE.InstancedMesh(
      geometria,
      biblioteca.materialesInstanciados[tipo],
      capacidades[tipo],
    );
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    malla.userData.tipoBloque = tipo;
    mallasPorTipo[tipo] = malla;
    reconstruirMalla(tipo);
    scene.add(malla);
  }

  return {
    mallas: TIPOS_BLOQUE.map((tipo) => mallasPorTipo[tipo]),

    contieneBloque(bloque) {
      return Boolean(bloque && bloques.get(bloque.clave) === bloque);
    },

    obtenerBloquePorInstancia(malla, instanceId) {
      const tipo = malla?.userData?.tipoBloque;
      return tipo ? (bloquesPorInstancia[tipo][instanceId] ?? null) : null;
    },

    obtenerMaterialRecolectable(tipo) {
      return biblioteca.materialesRecolectables[tipo] ?? null;
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
        alturasPasto,
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
    },

    obtenerCantidadTipo(tipo) {
      return bloquesPorTipo[tipo]?.size ?? 0;
    },

    hayColisionJugador(worldX, worldZ, pies, cabeza) {
      const radioJugador = tamanoBloque * 0.2;
      const gridX = worldX / tamanoBloque + (tamanoCuadricula - 1) / 2;
      const gridZ = worldZ / tamanoBloque + (tamanoCuadricula - 1) / 2;
      const xMin = Math.max(0, Math.floor(gridX) - 1);
      const xMax = Math.min(tamanoCuadricula - 1, Math.ceil(gridX) + 1);
      const zMin = Math.max(0, Math.floor(gridZ) - 1);
      const zMax = Math.min(tamanoCuadricula - 1, Math.ceil(gridZ) + 1);
      const yMin = Math.max(nivelFondo, Math.floor(pies / tamanoBloque) - 1);
      const yMax = Math.min(
        nivelMaximoColocacion,
        Math.ceil(cabeza / tamanoBloque) + 1,
      );
      const mitad = tamanoBloque / 2;

      for (let z = zMin; z <= zMax; z += 1) {
        for (let x = xMin; x <= xMax; x += 1) {
          for (let y = yMin; y <= yMax; y += 1) {
            const bloque = bloques.get(claveBloque(x, y, z));
            if (!bloque || bloque.tipo === "pasto") continue;

            const centroX = indiceAMundo(x, tamanoCuadricula, tamanoBloque);
            const centroZ = indiceAMundo(z, tamanoCuadricula, tamanoBloque);
            const centroY = y * tamanoBloque;
            const coincideHorizontalmente =
              Math.abs(worldX - centroX) < mitad + radioJugador &&
              Math.abs(worldZ - centroZ) < mitad + radioJugador;
            const coincideVerticalmente =
              pies < centroY + mitad && cabeza > centroY - mitad;
            if (coincideHorizontalmente && coincideVerticalmente) return true;
          }
        }
      }
      return false;
    },

    romperBloque(bloque) {
      if (!bloque || !bloques.delete(bloque.clave)) return null;
      bloquesPorTipo[bloque.tipo].delete(bloque.clave);
      const posicionRota = this.obtenerCentroBloque(bloque);
      if (bloque.tipo === "pasto") recalcularAlturaPasto(bloque.x, bloque.z);
      reconstruirMalla(bloque.tipo);
      return { bloque, posicion: posicionRota };
    },

    colocarAdyacente(bloqueBase, normal, tipo, validarPosicion) {
      if (!bloqueBase || !normal || !TIPOS_BLOQUE.includes(tipo)) {
        return { ok: false, motivo: "sin_objetivo" };
      }

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

      const bloque = crearDatosBloque(x, y, z, tipo);
      if (bloques.has(bloque.clave)) return { ok: false, motivo: "ocupado" };
      if (mallasPorTipo[tipo].count >= capacidades[tipo]) {
        return { ok: false, motivo: "sin_capacidad" };
      }

      const posicionBloque = this.obtenerCentroBloque(bloque);
      if (validarPosicion && !validarPosicion(posicionBloque)) {
        return { ok: false, motivo: "jugador" };
      }

      agregarDatosBloque(x, y, z, tipo);
      if (tipo === "pasto") recalcularAlturaPasto(x, z);
      reconstruirMalla(tipo);
      return { ok: true, bloque, posicion: posicionBloque };
    },
  };

  function generarSuelo() {
    for (let z = 0; z < tamanoCuadricula; z += 1) {
      for (let x = 0; x < tamanoCuadricula; x += 1) {
        const nivelSuperficie = calcularNivelSuperficie(x, z, tamanoCuadricula);
        nivelesSuelo[z][x] = nivelSuperficie;
        for (let y = nivelFondo; y <= nivelSuperficie; y += 1) {
          agregarDatosBloque(x, y, z, "pasto");
        }
        alturasPasto[z][x] = (nivelSuperficie + 0.5) * tamanoBloque;
      }
    }
  }

  function generarArboles() {
    const { alturaTronco, probabilidad, separacion } = configuracion.arboles;
    const centro = (tamanoCuadricula - 1) / 2;

    for (let baseZ = 5; baseZ < tamanoCuadricula - 5; baseZ += separacion) {
      for (let baseX = 5; baseX < tamanoCuadricula - 5; baseX += separacion) {
        const ruido = hash3D(baseX, 0, baseZ);
        if (ruido > probabilidad) continue;

        const x = limitarIndice(baseX + Math.floor(hash3D(baseX, 3, baseZ) * 5) - 2);
        const z = limitarIndice(baseZ + Math.floor(hash3D(baseX, 7, baseZ) * 5) - 2);
        if (Math.hypot(x - centro, z - centro) < 7) continue;

        const suelo = nivelesSuelo[z][x];
        const altura = alturaTronco + (hash3D(x, 11, z) > 0.82 ? 1 : 0);
        for (let y = suelo + 1; y <= suelo + altura; y += 1) {
          agregarDatosBloque(x, y, z, "madera");
        }

        const copa = suelo + altura;
        for (let dy = -1; dy <= 1; dy += 1) {
          const radio = dy === 1 ? 1 : 2;
          for (let dz = -radio; dz <= radio; dz += 1) {
            for (let dx = -radio; dx <= radio; dx += 1) {
              if (Math.abs(dx) + Math.abs(dz) > radio + 1) continue;
              agregarDatosBloque(x + dx, copa + dy, z + dz, "hojas");
            }
          }
        }

        agregarDatosBloque(x, copa + 2, z, "hojas");
        agregarDatosBloque(x + 1, copa + 2, z, "hojas");
        agregarDatosBloque(x - 1, copa + 2, z, "hojas");
        agregarDatosBloque(x, copa + 2, z + 1, "hojas");
        agregarDatosBloque(x, copa + 2, z - 1, "hojas");
      }
    }
  }

  function agregarDatosBloque(x, y, z, tipo) {
    if (
      x < 0 ||
      x >= tamanoCuadricula ||
      z < 0 ||
      z >= tamanoCuadricula ||
      y < nivelFondo ||
      y > nivelMaximoColocacion
    ) {
      return false;
    }
    const clave = claveBloque(x, y, z);
    if (bloques.has(clave)) return false;
    const bloque = crearDatosBloque(x, y, z, tipo);
    bloques.set(clave, bloque);
    bloquesPorTipo[tipo].set(clave, bloque);
    return true;
  }

  function reconstruirMalla(tipo) {
    const malla = mallasPorTipo[tipo];
    const orden = bloquesPorInstancia[tipo];
    orden.length = 0;
    let instancia = 0;

    for (const bloque of bloquesPorTipo[tipo].values()) {
      posicion.set(
        indiceAMundo(bloque.x, tamanoCuadricula, tamanoBloque),
        bloque.y * tamanoBloque,
        indiceAMundo(bloque.z, tamanoCuadricula, tamanoBloque),
      );
      matriz.makeTranslation(posicion.x, posicion.y, posicion.z);
      malla.setMatrixAt(instancia, matriz);

      const luminosidad = 0.91 + hash3D(bloque.x, bloque.y, bloque.z) * 0.09;
      tinte.setRGB(luminosidad, luminosidad, luminosidad);
      malla.setColorAt(instancia, tinte);
      orden.push(bloque);
      instancia += 1;
    }

    malla.count = instancia;
    malla.instanceMatrix.needsUpdate = true;
    malla.instanceColor.needsUpdate = true;
    malla.computeBoundingBox();
    malla.computeBoundingSphere();
  }

  function recalcularAlturaPasto(x, z) {
    let nivelSuperior = null;
    for (let y = nivelMaximoColocacion; y >= nivelFondo; y -= 1) {
      const bloque = bloques.get(claveBloque(x, y, z));
      if (bloque?.tipo === "pasto") {
        nivelSuperior = y;
        break;
      }
    }
    alturasPasto[z][x] =
      nivelSuperior === null
        ? (nivelFondo - 0.5) * tamanoBloque
        : (nivelSuperior + 0.5) * tamanoBloque;
  }

  function limitarIndice(valor) {
    return Math.max(2, Math.min(tamanoCuadricula - 3, valor));
  }
}

function crearDatosBloque(x, y, z, tipo) {
  return { x, y, z, clave: claveBloque(x, y, z), tipo };
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
  const valor = Math.sin(x * 127.1 + y * 74.7 + z * 311.7) * 43758.5453;
  return valor - Math.floor(valor);
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
