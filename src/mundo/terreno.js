import {
  TIPOS_BLOQUE,
  TIPOS_RECOLECTABLES,
  crearBibliotecaBloques,
} from "../renderizado/texturasBloques.js";
import { crearMapaLagos } from "./generadorLagos.js";

const TIPOS_SUELO = new Set(["pasto", "arena", "tierra"]);
const DIRECCIONES = Object.freeze([
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]);

export function crearTerreno(THREE, scene, configuracion, opcionesMundo = {}) {
  const {
    nivelFondo,
    nivelMaximoColocacion,
    tamanoBloque,
    tamanoCuadricula,
  } = configuracion.mundo;
  const tipoMundo = opcionesMundo.tipoMundo === "plano" ? "plano" : "normal";
  const creativo = opcionesMundo.modo === "creativo";
  const bloques = new Map();
  const bloquesPorTipo = Object.fromEntries(
    TIPOS_BLOQUE.map((tipo) => [tipo, new Map()]),
  );
  const bloquesPorInstancia = Object.fromEntries(
    TIPOS_BLOQUE.map((tipo) => [tipo, []]),
  );
  const bloquesVisiblesPorTipo = Object.fromEntries(
    TIPOS_BLOQUE.map((tipo) => [tipo, new Map()]),
  );
  const mallasPorTipo = {};
  const mallas = [];
  const capacidades = {};
  const nivelesSuelo = Array.from({ length: tamanoCuadricula }, () =>
    Array(tamanoCuadricula).fill(0),
  );
  const alturasSuelo = Array.from({ length: tamanoCuadricula }, () =>
    Array(tamanoCuadricula).fill(0),
  );
  const tiposSuperficie = Array.from({ length: tamanoCuadricula }, () =>
    Array(tamanoCuadricula).fill("pasto"),
  );
  const nivelesAgua = Array.from({ length: tamanoCuadricula }, () =>
    Array(tamanoCuadricula).fill(null),
  );
  const mapaLagos = crearMapaLagos(
    tamanoCuadricula,
    tipoMundo,
    configuracion.lagos.profundidadMaxima,
  );

  generarSuelo();
  if (tipoMundo === "normal") generarArboles();
  inicializarVisibilidad();

  const geometria = new THREE.BoxGeometry(tamanoBloque, tamanoBloque, tamanoBloque);
  const biblioteca = crearBibliotecaBloques(THREE);
  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  let ultimoMovimientoAgua = 0;

  for (const tipo of TIPOS_BLOQUE) {
    const cantidadInicial = bloquesVisiblesPorTipo[tipo].size;
    const reservaInventario = configuracion.inventario.limites[tipo] ?? 0;
    capacidades[tipo] = Math.max(
      1,
      cantidadInicial + (creativo ? 128 : reservaInventario + 16),
    );
    const malla = crearMallaTipo(tipo, capacidades[tipo]);
    mallasPorTipo[tipo] = malla;
    mallas.push(malla);
    reconstruirMalla(tipo);
    scene.add(malla);
  }

  return {
    tipoMundo,
    mallas,

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

    actualizar(now) {
      if (now - ultimoMovimientoAgua < 30) return;
      ultimoMovimientoAgua = now;
      const texturaAgua = biblioteca.texturas.agua;
      texturaAgua.offset.x = (now * 0.000018) % 1;
      texturaAgua.offset.y = (now * 0.000011) % 1;
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
        alturasSuelo,
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
    },

    obtenerAlturaEscalable(worldX, worldZ, alturaActual, radio, maximoAscenso) {
      return calcularAlturaEscalable(
        worldX,
        worldZ,
        alturaActual,
        radio,
        maximoAscenso,
      );
    },

    obtenerAlturaSoporte(worldX, worldZ, alturaMaxima, radio) {
      return calcularAlturaSoporte(worldX, worldZ, alturaMaxima, radio);
    },

    obtenerCantidadTipo(tipo) {
      if (tipo === "agua") return contarColumnasAgua();
      return bloquesPorTipo[tipo]?.size ?? 0;
    },

    obtenerCantidadVisible(tipo) {
      if (tipo === "agua") return contarColumnasAgua();
      return bloquesVisiblesPorTipo[tipo]?.size ?? 0;
    },

    obtenerCantidadCeldasAgua() {
      return mapaLagos.obtenerCantidadCeldasAgua();
    },

    obtenerNivelAgua(worldX, worldZ) {
      const { x, z } = mundoAIndice(
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
      const columna = obtenerColumnaAgua(x, z);
      return columna
        ? columna.maximo * tamanoBloque + tamanoBloque / 2 -
            configuracion.agua.margenSuperficie
        : null;
    },

    estaEnAgua(worldX, worldZ, pies, cabeza) {
      const { x, z } = mundoAIndice(
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
      const columna = obtenerColumnaAgua(x, z);
      if (!columna) return false;
      const inferior = columna.minimo * tamanoBloque - tamanoBloque / 2;
      const superior =
        columna.maximo * tamanoBloque + tamanoBloque / 2 -
        configuracion.agua.margenSuperficie;
      return pies < superior && cabeza > inferior;
    },

    obtenerVolumenesAgua() {
      return construirVolumenesAgua();
    },

    estaExpuestoAlCielo(worldX, worldZ, desdeY) {
      const { x, z } = mundoAIndice(
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
      const inicioY = Math.max(
        nivelFondo,
        Math.floor(desdeY / tamanoBloque) + 1,
      );
      for (let y = inicioY; y <= nivelMaximoColocacion; y += 1) {
        if (bloques.has(claveBloque(x, y, z))) return false;
      }
      return true;
    },

    obtenerPosicionAdyacente(bloqueBase, normal) {
      if (!bloqueBase || !normal) return null;
      const posicionBase = this.obtenerCentroBloque(bloqueBase);
      return posicionBase.add(
        new THREE.Vector3(
          Math.round(normal.x),
          Math.round(normal.y),
          Math.round(normal.z),
        ).multiplyScalar(tamanoBloque),
      );
    },

    hayColisionJugador(worldX, worldZ, pies, cabeza) {
      return medirPenetracionCuerpo(
        worldX,
        worldZ,
        pies,
        cabeza,
        configuracion.jugador.radio,
      ) > 0;
    },

    obtenerPenetracionJugador(worldX, worldZ, pies, cabeza) {
      return medirPenetracionCuerpo(
        worldX,
        worldZ,
        pies,
        cabeza,
        configuracion.jugador.radio,
      );
    },

    hayColisionCuerpo(worldX, worldZ, pies, cabeza, radio) {
      return medirPenetracionCuerpo(worldX, worldZ, pies, cabeza, radio) > 0;
    },

    obtenerPenetracionCuerpo(worldX, worldZ, pies, cabeza, radio) {
      return medirPenetracionCuerpo(worldX, worldZ, pies, cabeza, radio);
    },

    romperBloque(bloque) {
      if (
        !bloque ||
        !TIPOS_RECOLECTABLES.includes(bloque.tipo) ||
        !bloques.delete(bloque.clave)
      ) {
        return null;
      }
      bloquesPorTipo[bloque.tipo].delete(bloque.clave);
      bloquesVisiblesPorTipo[bloque.tipo].delete(bloque.clave);
      const posicionRota = this.obtenerCentroBloque(bloque);
      if (TIPOS_SUELO.has(bloque.tipo)) recalcularAlturaSuelo(bloque.x, bloque.z);
      const tiposAfectados = new Set([bloque.tipo]);
      if (nivelesAgua[bloque.z][bloque.x] !== null) tiposAfectados.add("agua");
      actualizarVisibilidadAlrededor(
        bloque.x,
        bloque.y,
        bloque.z,
        tiposAfectados,
      );
      return { bloque, posicion: posicionRota };
    },

    extraerBloqueParaFisica(bloque) {
      if (
        !bloque ||
        bloque.tipo !== "arena" ||
        !bloques.delete(bloque.clave)
      ) {
        return false;
      }
      bloquesPorTipo.arena.delete(bloque.clave);
      bloquesVisiblesPorTipo.arena.delete(bloque.clave);
      recalcularAlturaSuelo(bloque.x, bloque.z);
      const tiposAfectados = new Set(["arena"]);
      if (nivelesAgua[bloque.z][bloque.x] !== null) tiposAfectados.add("agua");
      actualizarVisibilidadAlrededor(
        bloque.x,
        bloque.y,
        bloque.z,
        tiposAfectados,
      );
      return true;
    },

    obtenerNivelSoporteBloque(x, z, desdeY) {
      for (
        let y = Math.min(nivelMaximoColocacion, Math.floor(desdeY) - 1);
        y >= nivelFondo;
        y -= 1
      ) {
        const bloque = bloques.get(claveBloque(x, y, z));
        if (bloque) return y + 1;
      }
      return nivelFondo;
    },

    colocarBloqueEnCoordenadas(x, y, z, tipo) {
      if (
        !TIPOS_RECOLECTABLES.includes(tipo) ||
        x < 0 ||
        x >= tamanoCuadricula ||
        z < 0 ||
        z >= tamanoCuadricula ||
        y < nivelFondo ||
        y > nivelMaximoColocacion
      ) {
        return null;
      }
      const clave = claveBloque(x, y, z);
      const existente = bloques.get(clave);
      if (existente) return null;
      const tiposAfectados = new Set([tipo]);
      if (nivelesAgua[z][x] !== null) tiposAfectados.add("agua");
      if (!agregarDatosBloque(x, y, z, tipo)) return null;
      if (TIPOS_SUELO.has(tipo)) recalcularAlturaSuelo(x, z);
      actualizarVisibilidadAlrededor(x, y, z, tiposAfectados);
      return bloques.get(clave);
    },

    colocarAdyacente(bloqueBase, normal, tipo, validarPosicion) {
      if (!bloqueBase || !normal || !TIPOS_RECOLECTABLES.includes(tipo)) {
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
      const existente = bloques.get(bloque.clave);
      if (existente) {
        return { ok: false, motivo: "ocupado" };
      }
      if (!asegurarCapacidad(tipo, mallasPorTipo[tipo].count + 1)) {
        return { ok: false, motivo: "sin_capacidad" };
      }

      const posicionBloque = this.obtenerCentroBloque(bloque);
      if (validarPosicion && !validarPosicion(posicionBloque)) {
        return { ok: false, motivo: "jugador" };
      }

      const tiposAfectados = new Set([tipo]);
      if (nivelesAgua[z][x] !== null) tiposAfectados.add("agua");
      agregarDatosBloque(x, y, z, tipo);
      if (TIPOS_SUELO.has(tipo)) recalcularAlturaSuelo(x, z);
      actualizarVisibilidadAlrededor(x, y, z, tiposAfectados);
      return { ok: true, bloque, posicion: posicionBloque };
    },
  };

  function medirPenetracionCuerpo(worldX, worldZ, pies, cabeza, radio) {
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
    let penetracion = 0;

    for (let z = zMin; z <= zMax; z += 1) {
      for (let x = xMin; x <= xMax; x += 1) {
        for (let y = yMin; y <= yMax; y += 1) {
          const bloque = bloques.get(claveBloque(x, y, z));
          if (!bloque || TIPOS_SUELO.has(bloque.tipo)) {
            continue;
          }

          const centroX = indiceAMundo(x, tamanoCuadricula, tamanoBloque);
          const centroZ = indiceAMundo(z, tamanoCuadricula, tamanoBloque);
          const centroY = y * tamanoBloque;
          const solapamientoX = mitad + radio - Math.abs(worldX - centroX);
          const solapamientoZ = mitad + radio - Math.abs(worldZ - centroZ);
          const coincideVerticalmente =
            pies < centroY + mitad && cabeza > centroY - mitad;
          if (solapamientoX > 0 && solapamientoZ > 0 && coincideVerticalmente) {
            penetracion += Math.min(solapamientoX, solapamientoZ);
          }
        }
      }
    }
    return penetracion;
  }

  function calcularAlturaEscalable(
    worldX,
    worldZ,
    alturaActual,
    radio,
    maximoAscenso,
  ) {
    let alturaObjetivo = interpolarAltura(
      THREE,
      alturasSuelo,
      worldX,
      worldZ,
      tamanoBloque,
      tamanoCuadricula,
    );
    const gridX = worldX / tamanoBloque + (tamanoCuadricula - 1) / 2;
    const gridZ = worldZ / tamanoBloque + (tamanoCuadricula - 1) / 2;
    const alcanceCeldas = Math.ceil((radio + tamanoBloque / 2) / tamanoBloque);
    const xMin = Math.max(0, Math.floor(gridX) - alcanceCeldas);
    const xMax = Math.min(tamanoCuadricula - 1, Math.ceil(gridX) + alcanceCeldas);
    const zMin = Math.max(0, Math.floor(gridZ) - alcanceCeldas);
    const zMax = Math.min(tamanoCuadricula - 1, Math.ceil(gridZ) + alcanceCeldas);
    const mitad = tamanoBloque / 2;

    for (let z = zMin; z <= zMax; z += 1) {
      for (let x = xMin; x <= xMax; x += 1) {
        const centroX = indiceAMundo(x, tamanoCuadricula, tamanoBloque);
        const centroZ = indiceAMundo(z, tamanoCuadricula, tamanoBloque);
        if (
          Math.abs(worldX - centroX) >= mitad + radio ||
          Math.abs(worldZ - centroZ) >= mitad + radio
        ) {
          continue;
        }

        for (let y = nivelFondo; y <= nivelMaximoColocacion; y += 1) {
          const bloque = bloques.get(claveBloque(x, y, z));
          if (!bloque || TIPOS_SUELO.has(bloque.tipo)) {
            continue;
          }
          const superficie = y * tamanoBloque + mitad;
          if (
            superficie > alturaActual + 0.001 &&
            superficie <= alturaActual + maximoAscenso + 0.04
          ) {
            alturaObjetivo = Math.max(alturaObjetivo, superficie);
          }
        }
      }
    }
    return alturaObjetivo;
  }

  function calcularAlturaSoporte(worldX, worldZ, alturaMaxima, radio) {
    let alturaObjetivo = interpolarAltura(
      THREE,
      alturasSuelo,
      worldX,
      worldZ,
      tamanoBloque,
      tamanoCuadricula,
    );
    const gridX = worldX / tamanoBloque + (tamanoCuadricula - 1) / 2;
    const gridZ = worldZ / tamanoBloque + (tamanoCuadricula - 1) / 2;
    const alcanceCeldas = Math.ceil((radio + tamanoBloque / 2) / tamanoBloque);
    const xMin = Math.max(0, Math.floor(gridX) - alcanceCeldas);
    const xMax = Math.min(tamanoCuadricula - 1, Math.ceil(gridX) + alcanceCeldas);
    const zMin = Math.max(0, Math.floor(gridZ) - alcanceCeldas);
    const zMax = Math.min(tamanoCuadricula - 1, Math.ceil(gridZ) + alcanceCeldas);
    const mitad = tamanoBloque / 2;

    for (let z = zMin; z <= zMax; z += 1) {
      for (let x = xMin; x <= xMax; x += 1) {
        const centroX = indiceAMundo(x, tamanoCuadricula, tamanoBloque);
        const centroZ = indiceAMundo(z, tamanoCuadricula, tamanoBloque);
        if (
          Math.abs(worldX - centroX) >= mitad + radio ||
          Math.abs(worldZ - centroZ) >= mitad + radio
        ) {
          continue;
        }

        for (let y = nivelFondo; y <= nivelMaximoColocacion; y += 1) {
          const bloque = bloques.get(claveBloque(x, y, z));
          if (!bloque || TIPOS_SUELO.has(bloque.tipo)) {
            continue;
          }
          const superficie = y * tamanoBloque + mitad;
          if (superficie <= alturaMaxima + 0.001) {
            alturaObjetivo = Math.max(alturaObjetivo, superficie);
          }
        }
      }
    }
    return alturaObjetivo;
  }

  function crearMallaTipo(tipo, capacidad) {
    if (tipo === "agua") {
      const mallaAgua = new THREE.Mesh(
        new THREE.BufferGeometry(),
        biblioteca.materialesInstanciados.agua,
      );
      mallaAgua.renderOrder = 2;
      mallaAgua.userData.tipoBloque = "agua";
      mallaAgua.userData.atravesable = true;
      mallaAgua.userData.superficieContinua = true;
      return mallaAgua;
    }
    const malla = new THREE.InstancedMesh(
      geometria,
      biblioteca.materialesInstanciados[tipo],
      capacidad,
    );
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    malla.userData.tipoBloque = tipo;
    return malla;
  }

  function asegurarCapacidad(tipo, cantidadNecesaria) {
    if (tipo === "agua") return true;
    if (cantidadNecesaria <= capacidades[tipo]) return true;
    const capacidadMaxima =
      tamanoCuadricula *
      tamanoCuadricula *
      (nivelMaximoColocacion - nivelFondo + 1);
    if (capacidades[tipo] >= capacidadMaxima) return false;

    const capacidadNueva = Math.min(
      capacidadMaxima,
      Math.max(
        cantidadNecesaria,
        capacidades[tipo] + 128,
        Math.ceil(capacidades[tipo] * 1.5),
      ),
    );
    const anterior = mallasPorTipo[tipo];
    const nueva = crearMallaTipo(tipo, capacidadNueva);
    mallasPorTipo[tipo] = nueva;
    capacidades[tipo] = capacidadNueva;
    mallas[TIPOS_BLOQUE.indexOf(tipo)] = nueva;
    scene.remove(anterior);
    scene.add(nueva);
    return true;
  }

  function generarSuelo() {
    const nivelAgua = configuracion.lagos.nivelAgua;
    for (let z = 0; z < tamanoCuadricula; z += 1) {
      for (let x = 0; x < tamanoCuadricula; x += 1) {
        const nivelNatural =
          tipoMundo === "plano" ? 0 : calcularNivelSuperficie(x, z, tamanoCuadricula);
        const profundidadLago = mapaLagos.profundidadEn(x, z);
        const playa = mapaLagos.esPlaya(x, z);
        const nivelSuperficie = profundidadLago
          ? nivelAgua - profundidadLago
          : playa
            ? Math.min(nivelNatural, nivelAgua)
            : nivelNatural;
        const tipoSuperficie = profundidadLago || playa ? "arena" : "pasto";

        nivelesSuelo[z][x] = nivelSuperficie;
        tiposSuperficie[z][x] = tipoSuperficie;
        for (let y = nivelFondo; y <= nivelSuperficie; y += 1) {
          const tipoCapa =
            tipoSuperficie === "arena" && y >= nivelSuperficie - 2
              ? "arena"
              : tipoSuperficie === "pasto" && y === nivelSuperficie
                ? "pasto"
                : "tierra";
          agregarDatosBloque(x, y, z, tipoCapa);
        }
        alturasSuelo[z][x] = (nivelSuperficie + 0.5) * tamanoBloque;

        if (profundidadLago) {
          // El agua es un volumen líquido, no un bloque sólido guardado en el mapa.
          nivelesAgua[z][x] = (nivelAgua + 0.5) * tamanoBloque;
        }
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
        if (tiposSuperficie[z][x] !== "pasto" || nivelesAgua[z][x] !== null) {
          continue;
        }

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
    if (tipo === "agua") {
      const mallaAgua = mallasPorTipo.agua;
      const geometriaAnterior = mallaAgua.geometry;
      mallaAgua.geometry = crearGeometriaSuperficieAgua();
      geometriaAnterior.dispose();
      mallaAgua.userData.cantidadCeldas = contarColumnasAgua();
      return true;
    }
    const visibles = bloquesVisiblesPorTipo[tipo];
    if (!asegurarCapacidad(tipo, visibles.size)) return false;
    const malla = mallasPorTipo[tipo];
    const orden = bloquesPorInstancia[tipo];
    orden.length = 0;
    let instancia = 0;

    for (const bloque of visibles.values()) {
      posicion.set(
        indiceAMundo(bloque.x, tamanoCuadricula, tamanoBloque),
        bloque.y * tamanoBloque,
        indiceAMundo(bloque.z, tamanoCuadricula, tamanoBloque),
      );
      matriz.makeTranslation(posicion.x, posicion.y, posicion.z);
      malla.setMatrixAt(instancia, matriz);

      orden.push(bloque);
      instancia += 1;
    }

    malla.count = instancia;
    malla.instanceMatrix.needsUpdate = true;
    if (instancia > 0) {
      malla.computeBoundingBox();
      malla.computeBoundingSphere();
    } else {
      malla.boundingBox = new THREE.Box3();
      malla.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
    }
    return true;
  }

  function crearGeometriaSuperficieAgua() {
    const vertices = [];
    const normales = [];
    const uvs = [];
    const indices = [];
    const mitad = tamanoBloque / 2;
    const margenSuperficie = configuracion.agua.margenSuperficie;

    for (let z = 0; z < tamanoCuadricula; z += 1) {
      for (let x = 0; x < tamanoCuadricula; x += 1) {
        const columna = obtenerColumnaAgua(x, z);
        if (!columna) continue;
        const centroX = indiceAMundo(x, tamanoCuadricula, tamanoBloque);
        const centroZ = indiceAMundo(z, tamanoCuadricula, tamanoBloque);
        const superior = columna.maximo * tamanoBloque + mitad - margenSuperficie;
        const inferior = columna.minimo * tamanoBloque - mitad + tamanoBloque * 0.04;
        agregarCuadrilatero(
          [centroX - mitad, superior, centroZ - mitad],
          [centroX - mitad, superior, centroZ + mitad],
          [centroX + mitad, superior, centroZ + mitad],
          [centroX + mitad, superior, centroZ - mitad],
          [0, 1, 0],
          [x, z, x + 1, z + 1],
        );

        agregarOrillaSiNecesaria(x - 1, z, [
          [centroX - mitad, inferior, centroZ + mitad],
          [centroX - mitad, inferior, centroZ - mitad],
          [centroX - mitad, superior, centroZ - mitad],
          [centroX - mitad, superior, centroZ + mitad],
        ], [-1, 0, 0], x, z);
        agregarOrillaSiNecesaria(x + 1, z, [
          [centroX + mitad, inferior, centroZ - mitad],
          [centroX + mitad, inferior, centroZ + mitad],
          [centroX + mitad, superior, centroZ + mitad],
          [centroX + mitad, superior, centroZ - mitad],
        ], [1, 0, 0], x, z);
        agregarOrillaSiNecesaria(x, z - 1, [
          [centroX - mitad, inferior, centroZ - mitad],
          [centroX + mitad, inferior, centroZ - mitad],
          [centroX + mitad, superior, centroZ - mitad],
          [centroX - mitad, superior, centroZ - mitad],
        ], [0, 0, -1], x, z);
        agregarOrillaSiNecesaria(x, z + 1, [
          [centroX + mitad, inferior, centroZ + mitad],
          [centroX - mitad, inferior, centroZ + mitad],
          [centroX - mitad, superior, centroZ + mitad],
          [centroX + mitad, superior, centroZ + mitad],
        ], [0, 0, 1], x, z);
      }
    }

    const geometriaAgua = new THREE.BufferGeometry();
    geometriaAgua.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometriaAgua.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normales, 3),
    );
    geometriaAgua.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometriaAgua.setIndex(indices);
    if (vertices.length > 0) {
      geometriaAgua.computeBoundingBox();
      geometriaAgua.computeBoundingSphere();
    }
    return geometriaAgua;

    function agregarOrillaSiNecesaria(
      vecinoX,
      vecinoZ,
      puntos,
      normal,
      uvX,
      uvZ,
    ) {
      if (obtenerColumnaAgua(vecinoX, vecinoZ)) return;
      agregarCuadrilatero(
        puntos[0],
        puntos[1],
        puntos[2],
        puntos[3],
        normal,
        [uvX, uvZ, uvX + 1, uvZ + 1],
      );
    }

    function agregarCuadrilatero(a, b, c, d, normal, uv) {
      const inicio = vertices.length / 3;
      vertices.push(...a, ...b, ...c, ...d);
      for (let i = 0; i < 4; i += 1) normales.push(...normal);
      uvs.push(uv[0], uv[1], uv[0], uv[3], uv[2], uv[3], uv[2], uv[1]);
      indices.push(inicio, inicio + 1, inicio + 2, inicio, inicio + 2, inicio + 3);
    }
  }

  function obtenerColumnaAgua(x, z) {
    if (x < 0 || x >= tamanoCuadricula || z < 0 || z >= tamanoCuadricula) {
      return null;
    }
    if (nivelesAgua[z][x] === null) return null;
    let minimo = null;
    let maximo = null;
    const inicio = nivelesSuelo[z][x] + 1;
    const fin = configuracion.lagos.nivelAgua;
    for (let y = inicio; y <= fin; y += 1) {
      if (bloques.has(claveBloque(x, y, z))) continue;
      if (minimo === null) minimo = y;
      maximo = y;
    }
    return minimo === null ? null : { minimo, maximo };
  }

  function construirVolumenesAgua() {
    const volumenes = [];
    const mitad = tamanoBloque / 2;
    for (let z = 0; z < tamanoCuadricula; z += 1) {
      let x = 0;
      while (x < tamanoCuadricula) {
        const columna = obtenerColumnaAgua(x, z);
        if (!columna) {
          x += 1;
          continue;
        }
        const inicio = x;
        let fin = x;
        while (fin + 1 < tamanoCuadricula) {
          const siguiente = obtenerColumnaAgua(fin + 1, z);
          if (
            !siguiente ||
            siguiente.minimo !== columna.minimo ||
            siguiente.maximo !== columna.maximo
          ) {
            break;
          }
          fin += 1;
        }
        const inferior = columna.minimo * tamanoBloque - mitad;
        const superior =
          columna.maximo * tamanoBloque + mitad -
          configuracion.agua.margenSuperficie;
        volumenes.push({
          x:
            (indiceAMundo(inicio, tamanoCuadricula, tamanoBloque) +
              indiceAMundo(fin, tamanoCuadricula, tamanoBloque)) /
            2,
          y: (inferior + superior) / 2,
          z: indiceAMundo(z, tamanoCuadricula, tamanoBloque),
          ancho: (fin - inicio + 1) * tamanoBloque,
          alto: superior - inferior,
          profundidad: tamanoBloque,
        });
        x = fin + 1;
      }
    }
    return volumenes;
  }

  function contarColumnasAgua() {
    let cantidad = 0;
    for (let z = 0; z < tamanoCuadricula; z += 1) {
      for (let x = 0; x < tamanoCuadricula; x += 1) {
        if (obtenerColumnaAgua(x, z)) cantidad += 1;
      }
    }
    return cantidad;
  }

  function inicializarVisibilidad() {
    for (const tipo of TIPOS_BLOQUE) {
      const visibles = bloquesVisiblesPorTipo[tipo];
      visibles.clear();
      for (const bloque of bloquesPorTipo[tipo].values()) {
        if (esBloqueVisible(bloque)) visibles.set(bloque.clave, bloque);
      }
    }
  }

  function esBloqueVisible(bloque) {
    for (const [dx, dy, dz] of DIRECCIONES) {
      const vecinoX = bloque.x + dx;
      const vecinoY = bloque.y + dy;
      const vecinoZ = bloque.z + dz;
      // El fondo cerrado no necesita enviarse a la GPU hasta quedar expuesto desde arriba.
      if (vecinoY < nivelFondo) continue;
      const vecino = bloques.get(
        claveBloque(vecinoX, vecinoY, vecinoZ),
      );
      if (!vecino) return true;
    }
    return false;
  }

  function actualizarVisibilidadAlrededor(x, y, z, tiposAfectados) {
    const posicionesAfectadas = [[0, 0, 0], ...DIRECCIONES];
    for (const [dx, dy, dz] of posicionesAfectadas) {
      const clave = claveBloque(x + dx, y + dy, z + dz);
      const bloque = bloques.get(clave);
      const celdaX = x + dx;
      const celdaZ = z + dz;
      if (
        celdaX >= 0 &&
        celdaX < tamanoCuadricula &&
        celdaZ >= 0 &&
        celdaZ < tamanoCuadricula &&
        nivelesAgua[celdaZ][celdaX] !== null
      ) {
        tiposAfectados.add("agua");
      }
      if (!bloque) continue;
      tiposAfectados.add(bloque.tipo);
      const visibles = bloquesVisiblesPorTipo[bloque.tipo];
      if (esBloqueVisible(bloque)) visibles.set(clave, bloque);
      else visibles.delete(clave);
    }

    for (const tipo of tiposAfectados) reconstruirMalla(tipo);
  }

  function recalcularAlturaSuelo(x, z) {
    let nivelSuperior = null;
    for (let y = nivelMaximoColocacion; y >= nivelFondo; y -= 1) {
      const bloque = bloques.get(claveBloque(x, y, z));
      if (bloque && TIPOS_SUELO.has(bloque.tipo)) {
        nivelSuperior = y;
        break;
      }
    }
    alturasSuelo[z][x] =
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

function mundoAIndice(worldX, worldZ, tamanoBloque, tamanoCuadricula) {
  return {
    x: Math.max(
      0,
      Math.min(
        tamanoCuadricula - 1,
        Math.round(worldX / tamanoBloque + (tamanoCuadricula - 1) / 2),
      ),
    ),
    z: Math.max(
      0,
      Math.min(
        tamanoCuadricula - 1,
        Math.round(worldZ / tamanoBloque + (tamanoCuadricula - 1) / 2),
      ),
    ),
  };
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
