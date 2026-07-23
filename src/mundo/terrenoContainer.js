import { obtenerDefinicionContenido } from "../contenido/registroContenido.js";
import {
  ID_PLANTILLA_LEGADA,
  ID_PLANTILLA_PLANA,
  obtenerPlantillaMundo,
} from "../generacion/plantillasMundo.js";
import {
  TAMANO_REGION,
  crearColaCargaPantalla,
  claveRegion,
  obtenerRegionCelda,
} from "./cargaPantalla.js";
import {
  TIPOS_BLOQUE,
  TIPOS_RECOLECTABLES,
  crearBibliotecaBloques,
} from "../renderizado/texturasBloques.js";
import { crearMapaLagos } from "./generadorLagos.js";

const AGUA_NULA = -32_768;
const DIRECCIONES = Object.freeze([
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]);
const TIPOS_TERRENO = new Set([
  "pasto",
  "arena",
  "tierra",
  "piedra",
  "piedra_lisa",
  "carbon_mineral",
  "hierro_mineral",
]);

export function crearTerrenoContainer(
  THREE,
  scene,
  configuracion,
  opcionesMundo = {},
) {
  const {
    nivelFondo,
    nivelMaximoColocacion,
    tamanoBloque,
    tamanoCuadricula,
  } = configuracion.mundo;
  const tipoMundo = opcionesMundo.tipoMundo === "plano" ? "plano" : "normal";
  const creativo = opcionesMundo.modo === "creativo";
  const semillaMundo = numeroFinito(opcionesMundo.semilla, 0);
  const plantillaId =
    tipoMundo === "plano"
      ? ID_PLANTILLA_PLANA
      : String(opcionesMundo.plantillaId || ID_PLANTILLA_LEGADA);
  const plantilla = obtenerPlantillaMundo(plantillaId);
  const totalColumnas = tamanoCuadricula * tamanoCuadricula;
  const nivelesBase = new Int16Array(totalColumnas);
  const nivelesActuales = new Int16Array(totalColumnas);
  const tiposSuperficie = new Uint8Array(totalColumnas);
  const nivelesAgua = new Int16Array(totalColumnas);
  nivelesAgua.fill(AGUA_NULA);

  const anchoClave = tamanoCuadricula + 2;
  const areaClave = anchoClave * anchoClave;
  const nivelBaseClave = nivelFondo - 1;
  const bloques = new Map();
  const cambiosEliminados = new Map();
  const cambiosColocados = new Map();
  const colocadosPorRegion = new Map();
  const bloquesArbol = new Map();
  const palosNaturales = [];
  const clavesPorRegion = new Map();
  const regionesActivas = new Set();
  const cantidadesPorTipo = Object.fromEntries(
    TIPOS_BLOQUE.map((tipo) => [tipo, 0]),
  );
  const bloquesPorInstancia = Object.fromEntries(
    TIPOS_BLOQUE.map((tipo) => [tipo, []]),
  );
  const bloquesVisiblesPorTipo = Object.fromEntries(
    TIPOS_BLOQUE.map((tipo) => [tipo, new Map()]),
  );
  const capacidades = {};
  const mallasPorTipo = {};
  const mallas = [];
  const geometriaCubo = new THREE.BoxGeometry(
    tamanoBloque,
    tamanoBloque,
    tamanoBloque,
  );
  const biblioteca = crearBibliotecaBloques(
    THREE,
    opcionesMundo.estiloVisual,
  );
  const matriz = new THREE.Matrix4();
  const posicionTemporal = new THREE.Vector3();
  let ultimoMovimientoAgua = 0;
  let cargaSucia = false;

  const mapaLagos = crearMapaLagos(
    tamanoCuadricula,
    tipoMundo === "plano" || plantilla.pesos.lagos <= 0 ? "plano" : "normal",
    configuracion.lagos.profundidadMaxima,
    semillaMundo,
    plantilla.pesos,
  );

  prepararColumnas();
  prepararArboles();
  importarCambios(opcionesMundo.progreso?.terreno);

  for (const tipo of TIPOS_BLOQUE) {
    capacidades[tipo] = tipo === "agua" ? 1 : 64;
    const malla = crearMallaTipo(tipo, capacidades[tipo]);
    mallasPorTipo[tipo] = malla;
    mallas.push(malla);
    scene.add(malla);
  }

  const colaCarga = crearColaCargaPantalla({
    distancia: opcionesMundo.distanciaCarga,
    tamanoMundo: tamanoCuadricula,
    cargar: cargarRegion,
    descargar: descargarRegion,
  });
  const posicionGuardada = opcionesMundo.progreso?.jugador ?? {};
  const celdaInicial = mundoAIndice(
    numeroFinito(posicionGuardada.x, 0),
    numeroFinito(posicionGuardada.z, 10),
    tamanoBloque,
    tamanoCuadricula,
  );
  colaCarga.moverCentro(celdaInicial.x, celdaInicial.z);
  colaCarga.procesar(Number.POSITIVE_INFINITY);
  sincronizarGeometria();

  return {
    tipoMundo,
    plantillaId,
    mallas,
    tamanoBloque,

    contieneBloque(bloque) {
      return Boolean(bloque && bloques.get(bloque.clave) === bloque);
    },

    obtenerBloquePorInstancia(malla, instanceId) {
      const tipo = malla?.userData?.tipoBloque;
      return tipo ? (bloquesPorInstancia[tipo]?.[instanceId] ?? null) : null;
    },

    obtenerMaterialRecolectable(tipo) {
      return biblioteca.materialesRecolectables[tipo] ?? null;
    },

    exportarCambios() {
      return {
        version: 2,
        eliminados: serializarCambios(cambiosEliminados),
        colocados: serializarCambios(cambiosColocados),
      };
    },

    actualizar(now, posicionJugador = null) {
      if (now - ultimoMovimientoAgua >= 30) {
        ultimoMovimientoAgua = now;
        const texturaAgua = biblioteca.texturas.agua;
        texturaAgua.offset.x = (now * 0.000018) % 1;
        texturaAgua.offset.y = (now * 0.000011) % 1;
      }
      if (posicionJugador) {
        const celda = mundoAIndice(
          posicionJugador.x,
          posicionJugador.z,
          tamanoBloque,
          tamanoCuadricula,
        );
        colaCarga.moverCentro(celda.x, celda.z);
      }
      const procesadas = colaCarga.procesar(
        configuracion.mundo.presupuestoCargaMs,
      );
      if (procesadas > 0 || cargaSucia) sincronizarGeometria();
    },

    obtenerEstadoCarga() {
      return colaCarga.obtenerEstado();
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
        nivelesActuales,
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
      return cantidadesPorTipo[tipo] ?? 0;
    },

    obtenerCantidadVisible(tipo) {
      if (tipo === "agua") return contarColumnasAgua();
      return bloquesVisiblesPorTipo[tipo]?.size ?? 0;
    },

    obtenerCantidadCeldasAgua() {
      return contarColumnasAgua();
    },

    obtenerNivelAgua(worldX, worldZ) {
      const celda = mundoAIndice(
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
      const columna = obtenerColumnaAgua(celda.x, celda.z);
      return columna
        ? columna.maximo * tamanoBloque +
            tamanoBloque / 2 -
            configuracion.agua.margenSuperficie
        : null;
    },

    estaEnAgua(worldX, worldZ, pies, cabeza) {
      const celda = mundoAIndice(
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
      const columna = obtenerColumnaAgua(celda.x, celda.z);
      if (!columna) return false;
      const inferior = columna.minimo * tamanoBloque - tamanoBloque / 2;
      const superior =
        columna.maximo * tamanoBloque +
        tamanoBloque / 2 -
        configuracion.agua.margenSuperficie;
      return pies < superior && cabeza > inferior;
    },

    obtenerVolumenesAgua() {
      return construirVolumenesAgua();
    },

    estaExpuestoAlCielo(worldX, worldZ, desdeY) {
      const celda = mundoAIndice(
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
      const inicio = Math.floor(desdeY / tamanoBloque) + 1;
      for (let y = Math.max(nivelFondo, inicio); y <= nivelMaximoColocacion; y += 1) {
        if (bloques.has(claveBloque(celda.x, y, celda.z))) return false;
      }
      return true;
    },

    estaEnCueva(worldX, worldY, worldZ) {
      const celda = mundoAIndice(
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
      const y = Math.round(worldY / tamanoBloque);
      return (
        y <= nivelEn(celda.x, celda.z) - 4 &&
        !bloques.has(claveBloque(celda.x, y, celda.z))
      );
    },

    hayBloqueEnMundo(worldX, worldY, worldZ) {
      const celda = mundoAIndice(
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
      const y = Math.round(worldY / tamanoBloque);
      return bloques.has(claveBloque(celda.x, y, celda.z));
    },

    buscarPuntoCuevaCercano(worldX, worldZ, semilla = 0, radio = 24) {
      const centro = mundoAIndice(
        worldX,
        worldZ,
        tamanoBloque,
        tamanoCuadricula,
      );
      const radioCeldas = Math.max(4, Math.floor(radio / tamanoBloque));
      for (let intento = 0; intento < 64; intento += 1) {
        const angulo = hash3D(intento, 401, semilla, semillaMundo) * Math.PI * 2;
        const distancia = 4 + Math.floor(
          hash3D(intento, 409, semilla, semillaMundo) * radioCeldas,
        );
        const x = Math.round(centro.x + Math.cos(angulo) * distancia);
        const z = Math.round(centro.z + Math.sin(angulo) * distancia);
        if (!posicionHorizontalValida(x, z) || !regionCeldaActiva(x, z)) continue;
        const superficie = nivelEn(x, z);
        for (
          let y = Math.min(superficie - 5, -3);
          y >= nivelFondo + 3;
          y -= 1
        ) {
          const libre = !bloques.has(claveBloque(x, y, z));
          const cabezaLibre = !bloques.has(claveBloque(x, y + 1, z));
          const soporte = bloques.has(claveBloque(x, y - 1, z));
          if (!libre || !cabezaLibre || !soporte) continue;
          return {
            x: indiceAMundo(x, tamanoCuadricula, tamanoBloque),
            y: (y - 0.5) * tamanoBloque,
            z: indiceAMundo(z, tamanoCuadricula, tamanoBloque),
          };
        }
      }
      return null;
    },

    obtenerPalosNaturalesCercanos(worldX, worldZ, radio = 80) {
      return palosNaturales
        .filter(
          (palo) =>
            regionCeldaActiva(palo.celdaX, palo.celdaZ) &&
            Math.hypot(palo.x - worldX, palo.z - worldZ) <= radio,
        )
        .map((palo) => ({ ...palo }));
    },

    obtenerPosicionAdyacente(bloqueBase, normal) {
      if (!bloqueBase || !normal) return null;
      return this.obtenerCentroBloque(bloqueBase).add(
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
        bloques.get(bloque.clave) !== bloque
      ) {
        return null;
      }
      eliminarBloqueActivo(bloque);
      registrarEliminacion(bloque);
      recalcularNivelActual(bloque.x, bloque.z);
      sincronizarAlrededor(bloque.x, bloque.y, bloque.z);
      return { bloque, posicion: this.obtenerCentroBloque(bloque) };
    },

    extraerBloqueParaFisica(bloque) {
      if (bloque?.tipo !== "arena" || bloques.get(bloque.clave) !== bloque) {
        return false;
      }
      eliminarBloqueActivo(bloque);
      registrarEliminacion(bloque);
      recalcularNivelActual(bloque.x, bloque.z);
      sincronizarAlrededor(bloque.x, bloque.y, bloque.z);
      return true;
    },

    obtenerNivelSoporteBloque(x, z, desdeY) {
      for (
        let y = Math.min(nivelMaximoColocacion, Math.floor(desdeY) - 1);
        y >= nivelFondo;
        y -= 1
      ) {
        if (bloques.has(claveBloque(x, y, z))) return y + 1;
      }
      return nivelFondo;
    },

    colocarBloqueEnCoordenadas(x, y, z, tipo) {
      if (!posicionValida(x, y, z) || !TIPOS_RECOLECTABLES.includes(tipo)) {
        return null;
      }
      const bloque = agregarBloqueActivo(x, y, z, tipo, false);
      if (!bloque) return null;
      registrarColocacion(bloque);
      recalcularNivelActual(x, z);
      sincronizarAlrededor(x, y, z);
      return bloque;
    },

    colocarAdyacente(bloqueBase, normal, tipo, validarPosicion) {
      if (!bloqueBase || !normal || !TIPOS_RECOLECTABLES.includes(tipo)) {
        return { ok: false, motivo: "sin_objetivo" };
      }
      const x = bloqueBase.x + Math.round(normal.x);
      const y = bloqueBase.y + Math.round(normal.y);
      const z = bloqueBase.z + Math.round(normal.z);
      if (!posicionValida(x, y, z)) {
        const fueraMundo =
          x < 0 || x >= tamanoCuadricula || z < 0 || z >= tamanoCuadricula;
        return {
          ok: false,
          motivo: fueraMundo ? "fuera_mundo" : "altura_invalida",
        };
      }
      const clave = claveBloque(x, y, z);
      if (bloques.has(clave)) return { ok: false, motivo: "ocupado" };
      const candidato = crearDatosBloque(x, y, z, tipo, false);
      const posicion = this.obtenerCentroBloque(candidato);
      if (validarPosicion && !validarPosicion(posicion)) {
        return { ok: false, motivo: "jugador" };
      }
      const bloque = agregarBloqueActivo(x, y, z, tipo, false);
      if (!bloque) return { ok: false, motivo: "sin_capacidad" };
      registrarColocacion(bloque);
      recalcularNivelActual(x, z);
      sincronizarAlrededor(x, y, z);
      return { ok: true, bloque, posicion };
    },
  };

  function prepararColumnas() {
    const nivelAgua = configuracion.lagos.nivelAgua;
    for (let z = 0; z < tamanoCuadricula; z += 1) {
      for (let x = 0; x < tamanoCuadricula; x += 1) {
        const natural =
          plantillaId === ID_PLANTILLA_PLANA
            ? 0
            : calcularNivelSuperficie(
                x,
                z,
                tamanoCuadricula,
                semillaMundo,
                plantilla,
              );
        const profundidadLago = mapaLagos.profundidadEn(x, z);
        const playa = mapaLagos.esPlaya(x, z) ||
          (plantilla.pesos.arena > 1.2 &&
            hash3D(Math.floor(x / 3), 91, Math.floor(z / 3), semillaMundo) > 0.76);
        const superficie = profundidadLago
          ? nivelAgua - profundidadLago
          : playa
            ? Math.min(natural, nivelAgua)
            : natural;
        const indice = indiceColumna(x, z);
        nivelesBase[indice] = superficie;
        nivelesActuales[indice] = superficie;
        tiposSuperficie[indice] = profundidadLago || playa ? 1 : 0;
        if (profundidadLago) nivelesAgua[indice] = nivelAgua;
      }
    }
  }

  function prepararArboles() {
    if (plantilla.pesos.arboles <= 0) return;
    const { alturaTronco, probabilidad, separacion } = configuracion.arboles;
    const probabilidadAjustada = Math.min(0.93, probabilidad * plantilla.pesos.arboles);
    const centro = (tamanoCuadricula - 1) / 2;
    for (let baseZ = 5; baseZ < tamanoCuadricula - 5; baseZ += separacion) {
      for (let baseX = 5; baseX < tamanoCuadricula - 5; baseX += separacion) {
        if (hash3D(baseX, 0, baseZ, semillaMundo) > probabilidadAjustada) continue;
        const x = limitarIndice(
          baseX + Math.floor(hash3D(baseX, 3, baseZ, semillaMundo) * 5) - 2,
        );
        const z = limitarIndice(
          baseZ + Math.floor(hash3D(baseX, 7, baseZ, semillaMundo) * 5) - 2,
        );
        if (Math.hypot(x - centro, z - centro) < 7) continue;
        if (tiposSuperficie[indiceColumna(x, z)] !== 0) continue;
        const suelo = nivelEn(x, z);
        const altura =
          alturaTronco + (hash3D(x, 11, z, semillaMundo) > 0.82 ? 1 : 0);
        for (let y = suelo + 1; y <= suelo + altura; y += 1) {
          registrarBloqueArbol(x, y, z, "madera");
        }
        const copa = suelo + altura;
        for (let dy = -1; dy <= 1; dy += 1) {
          const radio = dy === 1 ? 1 : 2;
          for (let dz = -radio; dz <= radio; dz += 1) {
            for (let dx = -radio; dx <= radio; dx += 1) {
              if (Math.abs(dx) + Math.abs(dz) > radio + 1) continue;
              registrarBloqueArbol(x + dx, copa + dy, z + dz, "hojas");
            }
          }
        }
        for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
          registrarBloqueArbol(x + dx, copa + 2, z + dz, "hojas");
        }
        if (hash3D(x, 211, z, semillaMundo) < 0.5) {
          palosNaturales.push({
            id: `palo:${x}:${z}`,
            tipo: "palo",
            celdaX: x,
            celdaZ: z,
            x: indiceAMundo(x, tamanoCuadricula, tamanoBloque) +
              (hash3D(x, 223, z, semillaMundo) - 0.5) * 1.2,
            y: (suelo + 0.68) * tamanoBloque,
            z: indiceAMundo(z, tamanoCuadricula, tamanoBloque) +
              (hash3D(x, 227, z, semillaMundo) - 0.5) * 1.2,
          });
        }
      }
    }
  }

  function registrarBloqueArbol(x, y, z, tipo) {
    if (!posicionValida(x, y, z)) return;
    bloquesArbol.set(claveBloque(x, y, z), tipo);
  }

  function importarCambios(estado) {
    for (const cambio of normalizarCambios(estado?.eliminados)) {
      cambiosEliminados.set(claveBloque(cambio.x, cambio.y, cambio.z), cambio);
    }
    for (const cambio of normalizarCambios(estado?.colocados)) {
      const clave = claveBloque(cambio.x, cambio.y, cambio.z);
      cambiosColocados.set(clave, cambio);
      const region = obtenerRegionCelda(cambio.x, cambio.z, TAMANO_REGION);
      const regionId = claveRegion(region.x, region.z);
      if (!colocadosPorRegion.has(regionId)) colocadosPorRegion.set(regionId, []);
      colocadosPorRegion.get(regionId).push(cambio);
    }
  }

  function cargarRegion(region) {
    if (regionesActivas.has(region.clave)) return;
    regionesActivas.add(region.clave);
    const claves = new Set();
    clavesPorRegion.set(region.clave, claves);
    const inicioX = region.x * TAMANO_REGION;
    const inicioZ = region.z * TAMANO_REGION;
    const finX = Math.min(tamanoCuadricula, inicioX + TAMANO_REGION);
    const finZ = Math.min(tamanoCuadricula, inicioZ + TAMANO_REGION);
    for (let z = inicioZ; z < finZ; z += 1) {
      for (let x = inicioX; x < finX; x += 1) {
        const maximo = Math.min(
          nivelMaximoColocacion,
          nivelEn(x, z) + configuracion.arboles.alturaTronco + 4,
        );
        for (let y = nivelFondo; y <= maximo; y += 1) {
          const clave = claveBloque(x, y, z);
          if (cambiosEliminados.has(clave)) continue;
          const tipo = tipoBloqueGenerado(x, y, z, clave);
          if (!tipo) continue;
          const bloque = agregarBloqueActivo(x, y, z, tipo, true);
          if (bloque) claves.add(bloque.clave);
        }
      }
    }
    for (const cambio of colocadosPorRegion.get(region.clave) ?? []) {
      const bloque = agregarBloqueActivo(
        cambio.x,
        cambio.y,
        cambio.z,
        cambio.tipo,
        false,
      );
      if (bloque) claves.add(bloque.clave);
    }
    for (let z = inicioZ; z < finZ; z += 1) {
      for (let x = inicioX; x < finX; x += 1) recalcularNivelActual(x, z);
    }
    cargaSucia = true;
  }

  function descargarRegion(region) {
    regionesActivas.delete(region.clave);
    const claves = clavesPorRegion.get(region.clave);
    if (claves) {
      for (const clave of claves) {
        const bloque = bloques.get(clave);
        if (bloque) eliminarBloqueActivo(bloque);
      }
    }
    clavesPorRegion.delete(region.clave);
    cargaSucia = true;
  }

  function tipoBloqueGenerado(x, y, z, clave) {
    const arbol = bloquesArbol.get(clave);
    if (arbol) return arbol;
    const superficie = nivelEn(x, z);
    if (y > superficie) return null;
    const tipoSuperficie = tiposSuperficie[indiceColumna(x, z)] === 1
      ? "arena"
      : "pasto";
    if (y === superficie) return tipoSuperficie;
    if (tipoSuperficie === "arena" && y >= superficie - 2) return "arena";
    if (y >= superficie - 3) return "tierra";
    if (
      plantilla.pesos.cuevas > 0 &&
      y > nivelFondo + 2 &&
      esCeldaCueva(x, y, z, superficie)
    ) {
      return null;
    }
    if (y <= superficie - 8 && esVeta(x, y, z, 0.962, 307)) {
      return "hierro_mineral";
    }
    if (y <= superficie - 5 && esVeta(x, y, z, 0.915, 281)) {
      return "carbon_mineral";
    }
    return "piedra";
  }

  function esCeldaCueva(x, y, z, superficie) {
    if (y >= superficie - 4) return false;
    const escala = plantilla.pesos.cuevas;
    const tunel =
      Math.sin((x + semillaMundo * 0.0007) * 0.22 + y * 0.11) +
      Math.cos((z - semillaMundo * 0.0009) * 0.19 - y * 0.14) +
      Math.sin((x + z) * 0.09 + y * 0.31);
    const umbral = 0.15 + Math.min(0.18, (escala - 0.65) * 0.12);
    const mascara = hash3D(
      Math.floor(x / 4),
      Math.floor(y / 3),
      Math.floor(z / 4),
      semillaMundo + 251,
    );
    return Math.abs(tunel) < umbral && mascara < 0.62 * Math.min(1.25, escala);
  }

  function esVeta(x, y, z, umbral, sal) {
    const bloqueX = Math.floor(x / 2);
    const bloqueY = Math.floor(y / 2);
    const bloqueZ = Math.floor(z / 2);
    return hash3D(bloqueX, bloqueY + sal, bloqueZ, semillaMundo) > umbral;
  }

  function agregarBloqueActivo(x, y, z, tipo, generado) {
    if (!posicionValida(x, y, z) || !TIPOS_RECOLECTABLES.includes(tipo)) {
      return null;
    }
    const clave = claveBloque(x, y, z);
    if (bloques.has(clave)) return null;
    const bloque = crearDatosBloque(x, y, z, tipo, generado);
    bloques.set(clave, bloque);
    cantidadesPorTipo[tipo] = (cantidadesPorTipo[tipo] ?? 0) + 1;
    const region = obtenerRegionCelda(x, z, TAMANO_REGION);
    clavesPorRegion.get(claveRegion(region.x, region.z))?.add(clave);
    return bloque;
  }

  function eliminarBloqueActivo(bloque) {
    bloques.delete(bloque.clave);
    cantidadesPorTipo[bloque.tipo] = Math.max(
      0,
      (cantidadesPorTipo[bloque.tipo] ?? 0) - 1,
    );
    bloquesVisiblesPorTipo[bloque.tipo]?.delete(bloque.clave);
    const region = obtenerRegionCelda(bloque.x, bloque.z, TAMANO_REGION);
    clavesPorRegion.get(claveRegion(region.x, region.z))?.delete(bloque.clave);
  }

  function registrarEliminacion(bloque) {
    if (bloque.generado) {
      cambiosEliminados.set(bloque.clave, {
        x: bloque.x,
        y: bloque.y,
        z: bloque.z,
        tipo: bloque.tipo,
      });
    }
    cambiosColocados.delete(bloque.clave);
    const region = obtenerRegionCelda(bloque.x, bloque.z, TAMANO_REGION);
    const lista = colocadosPorRegion.get(claveRegion(region.x, region.z));
    if (lista) {
      const indice = lista.findIndex(
        (cambio) =>
          cambio.x === bloque.x && cambio.y === bloque.y && cambio.z === bloque.z,
      );
      if (indice >= 0) lista.splice(indice, 1);
    }
  }

  function registrarColocacion(bloque) {
    const original = cambiosEliminados.get(bloque.clave);
    if (original?.tipo === bloque.tipo) {
      bloque.generado = true;
      cambiosEliminados.delete(bloque.clave);
      return;
    }
    const cambio = {
      x: bloque.x,
      y: bloque.y,
      z: bloque.z,
      tipo: bloque.tipo,
    };
    cambiosColocados.set(bloque.clave, cambio);
    const region = obtenerRegionCelda(bloque.x, bloque.z, TAMANO_REGION);
    const regionId = claveRegion(region.x, region.z);
    if (!colocadosPorRegion.has(regionId)) colocadosPorRegion.set(regionId, []);
    const lista = colocadosPorRegion.get(regionId);
    const existente = lista.findIndex(
      (actual) =>
        actual.x === bloque.x && actual.y === bloque.y && actual.z === bloque.z,
    );
    if (existente >= 0) lista[existente] = cambio;
    else lista.push(cambio);
  }

  function sincronizarAlrededor() {
    cargaSucia = true;
    sincronizarGeometria();
  }

  function sincronizarGeometria() {
    cargaSucia = false;
    for (const tipo of TIPOS_BLOQUE) bloquesVisiblesPorTipo[tipo].clear();
    for (const bloque of bloques.values()) {
      if (esBloqueVisible(bloque)) {
        bloquesVisiblesPorTipo[bloque.tipo].set(bloque.clave, bloque);
      }
    }
    for (const tipo of TIPOS_BLOQUE) reconstruirMalla(tipo);
  }

  function esBloqueVisible(bloque) {
    for (const [dx, dy, dz] of DIRECCIONES) {
      if (bloque.y + dy < nivelFondo) continue;
      if (!bloques.has(claveBloque(bloque.x + dx, bloque.y + dy, bloque.z + dz))) {
        return true;
      }
    }
    return false;
  }

  function crearMallaTipo(tipo, capacidad) {
    if (tipo === "agua") {
      const mallaAgua = new THREE.Mesh(
        new THREE.BufferGeometry(),
        biblioteca.materialesInstanciados.agua,
      );
      mallaAgua.userData.tipoBloque = "agua";
      mallaAgua.userData.atravesable = true;
      mallaAgua.userData.superficieContinua = true;
      mallaAgua.renderOrder = 4;
      return mallaAgua;
    }
    const malla = new THREE.InstancedMesh(
      geometriaCubo,
      biblioteca.materialesInstanciados[tipo],
      capacidad,
    );
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Cada malla agrupa todas las instancias visibles de varias regiones. Su
    // esfera cambia al cargar sectores y algunos WebKit antiguos conservan un
    // volumen anterior; evitar ese descarte impide un mundo invisible.
    malla.frustumCulled = false;
    malla.userData.tipoBloque = tipo;
    if (tipo === "cristal") malla.renderOrder = 3;
    return malla;
  }

  function reconstruirMalla(tipo) {
    if (tipo === "agua") {
      const malla = mallasPorTipo.agua;
      const anterior = malla.geometry;
      malla.geometry = crearGeometriaAgua();
      anterior.dispose();
      return;
    }
    const visibles = bloquesVisiblesPorTipo[tipo];
    asegurarCapacidad(tipo, visibles.size);
    const malla = mallasPorTipo[tipo];
    const orden = bloquesPorInstancia[tipo];
    orden.length = 0;
    let indice = 0;
    for (const bloque of visibles.values()) {
      posicionTemporal.set(
        indiceAMundo(bloque.x, tamanoCuadricula, tamanoBloque),
        bloque.y * tamanoBloque,
        indiceAMundo(bloque.z, tamanoCuadricula, tamanoBloque),
      );
      matriz.makeTranslation(
        posicionTemporal.x,
        posicionTemporal.y,
        posicionTemporal.z,
      );
      malla.setMatrixAt(indice, matriz);
      orden.push(bloque);
      indice += 1;
    }
    malla.count = indice;
    malla.instanceMatrix.needsUpdate = true;
    if (indice > 0) {
      malla.computeBoundingBox();
      malla.computeBoundingSphere();
    }
  }

  function asegurarCapacidad(tipo, necesaria) {
    if (tipo === "agua" || necesaria <= capacidades[tipo]) return;
    let nuevaCapacidad = capacidades[tipo];
    while (nuevaCapacidad < necesaria) {
      nuevaCapacidad = Math.max(nuevaCapacidad + 64, Math.ceil(nuevaCapacidad * 1.55));
    }
    const anterior = mallasPorTipo[tipo];
    const nueva = crearMallaTipo(tipo, nuevaCapacidad);
    const indice = mallas.indexOf(anterior);
    mallasPorTipo[tipo] = nueva;
    capacidades[tipo] = nuevaCapacidad;
    if (indice >= 0) mallas[indice] = nueva;
    scene.remove(anterior);
    scene.add(nueva);
  }

  function crearGeometriaAgua() {
    const vertices = [];
    const normales = [];
    const uvs = [];
    const indices = [];
    const mitad = tamanoBloque / 2;
    const margen = configuracion.agua.margenSuperficie;
    for (let z = 0; z < tamanoCuadricula; z += 1) {
      for (let x = 0; x < tamanoCuadricula; x += 1) {
        const columna = obtenerColumnaAgua(x, z);
        if (!columna) continue;
        const centroX = indiceAMundo(x, tamanoCuadricula, tamanoBloque);
        const centroZ = indiceAMundo(z, tamanoCuadricula, tamanoBloque);
        const superior = columna.maximo * tamanoBloque + mitad - margen;
        agregarCara(
          [centroX - mitad, superior, centroZ - mitad],
          [centroX - mitad, superior, centroZ + mitad],
          [centroX + mitad, superior, centroZ + mitad],
          [centroX + mitad, superior, centroZ - mitad],
          [0, 1, 0],
          x,
          z,
        );
        const inferior = columna.minimo * tamanoBloque - mitad + 0.08;
        if (!obtenerColumnaAgua(x - 1, z)) {
          agregarCara(
            [centroX - mitad, inferior, centroZ + mitad],
            [centroX - mitad, inferior, centroZ - mitad],
            [centroX - mitad, superior, centroZ - mitad],
            [centroX - mitad, superior, centroZ + mitad],
            [-1, 0, 0],
            x,
            z,
          );
        }
        if (!obtenerColumnaAgua(x + 1, z)) {
          agregarCara(
            [centroX + mitad, inferior, centroZ - mitad],
            [centroX + mitad, inferior, centroZ + mitad],
            [centroX + mitad, superior, centroZ + mitad],
            [centroX + mitad, superior, centroZ - mitad],
            [1, 0, 0],
            x,
            z,
          );
        }
        if (!obtenerColumnaAgua(x, z - 1)) {
          agregarCara(
            [centroX - mitad, inferior, centroZ - mitad],
            [centroX + mitad, inferior, centroZ - mitad],
            [centroX + mitad, superior, centroZ - mitad],
            [centroX - mitad, superior, centroZ - mitad],
            [0, 0, -1],
            x,
            z,
          );
        }
        if (!obtenerColumnaAgua(x, z + 1)) {
          agregarCara(
            [centroX + mitad, inferior, centroZ + mitad],
            [centroX - mitad, inferior, centroZ + mitad],
            [centroX - mitad, superior, centroZ + mitad],
            [centroX + mitad, superior, centroZ + mitad],
            [0, 0, 1],
            x,
            z,
          );
        }
      }
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometria.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normales, 3),
    );
    geometria.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometria.setIndex(indices);
    if (vertices.length) {
      geometria.computeBoundingBox();
      geometria.computeBoundingSphere();
    }
    return geometria;

    function agregarCara(a, b, c, d, normal, uvX, uvZ) {
      const inicio = vertices.length / 3;
      vertices.push(...a, ...b, ...c, ...d);
      for (let indice = 0; indice < 4; indice += 1) normales.push(...normal);
      uvs.push(uvX, uvZ, uvX, uvZ + 1, uvX + 1, uvZ + 1, uvX + 1, uvZ);
      indices.push(inicio, inicio + 1, inicio + 2, inicio, inicio + 2, inicio + 3);
    }
  }

  function obtenerColumnaAgua(x, z) {
    if (!posicionHorizontalValida(x, z) || !regionCeldaActiva(x, z)) return null;
    const nivel = nivelesAgua[indiceColumna(x, z)];
    if (nivel === AGUA_NULA) return null;
    let minimo = null;
    let maximo = null;
    for (let y = nivelEn(x, z) + 1; y <= nivel; y += 1) {
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
          columna.maximo * tamanoBloque +
          mitad -
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
    let total = 0;
    for (let z = 0; z < tamanoCuadricula; z += 1) {
      for (let x = 0; x < tamanoCuadricula; x += 1) {
        if (obtenerColumnaAgua(x, z)) total += 1;
      }
    }
    return total;
  }

  function medirPenetracionCuerpo(worldX, worldZ, pies, cabeza, radio) {
    const gridX = worldX / tamanoBloque + (tamanoCuadricula - 1) / 2;
    const gridZ = worldZ / tamanoBloque + (tamanoCuadricula - 1) / 2;
    const alcance = Math.ceil((radio + tamanoBloque / 2) / tamanoBloque);
    const xMin = Math.max(0, Math.floor(gridX) - alcance);
    const xMax = Math.min(tamanoCuadricula - 1, Math.ceil(gridX) + alcance);
    const zMin = Math.max(0, Math.floor(gridZ) - alcance);
    const zMax = Math.min(tamanoCuadricula - 1, Math.ceil(gridZ) + alcance);
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
          if (!bloques.has(claveBloque(x, y, z))) continue;
          const centroX = indiceAMundo(x, tamanoCuadricula, tamanoBloque);
          const centroZ = indiceAMundo(z, tamanoCuadricula, tamanoBloque);
          const centroY = y * tamanoBloque;
          const solapamientoX = mitad + radio - Math.abs(worldX - centroX);
          const solapamientoZ = mitad + radio - Math.abs(worldZ - centroZ);
          if (
            solapamientoX > 0 &&
            solapamientoZ > 0 &&
            pies < centroY + mitad - 0.002 &&
            cabeza > centroY - mitad + 0.002
          ) {
            penetracion += Math.min(solapamientoX, solapamientoZ);
          }
        }
      }
    }
    return penetracion;
  }

  function calcularAlturaSoporte(worldX, worldZ, alturaMaxima, radio) {
    const gridX = worldX / tamanoBloque + (tamanoCuadricula - 1) / 2;
    const gridZ = worldZ / tamanoBloque + (tamanoCuadricula - 1) / 2;
    const alcance = Math.ceil((radio + tamanoBloque / 2) / tamanoBloque);
    const mitad = tamanoBloque / 2;
    let soporte = (nivelFondo - 0.5) * tamanoBloque;
    for (
      let z = Math.max(0, Math.floor(gridZ) - alcance);
      z <= Math.min(tamanoCuadricula - 1, Math.ceil(gridZ) + alcance);
      z += 1
    ) {
      for (
        let x = Math.max(0, Math.floor(gridX) - alcance);
        x <= Math.min(tamanoCuadricula - 1, Math.ceil(gridX) + alcance);
        x += 1
      ) {
        const centroX = indiceAMundo(x, tamanoCuadricula, tamanoBloque);
        const centroZ = indiceAMundo(z, tamanoCuadricula, tamanoBloque);
        if (
          Math.abs(worldX - centroX) >= mitad + radio ||
          Math.abs(worldZ - centroZ) >= mitad + radio
        ) {
          continue;
        }
        const maximoY = Math.min(
          nivelMaximoColocacion,
          Math.floor((alturaMaxima - mitad + 0.04) / tamanoBloque),
        );
        for (let y = maximoY; y >= nivelFondo; y -= 1) {
          if (!bloques.has(claveBloque(x, y, z))) continue;
          soporte = Math.max(soporte, y * tamanoBloque + mitad);
          break;
        }
      }
    }
    return soporte;
  }

  function calcularAlturaEscalable(
    worldX,
    worldZ,
    alturaActual,
    radio,
    maximoAscenso,
  ) {
    const maximo = alturaActual + maximoAscenso + 0.04;
    const soporte = calcularAlturaSoporte(worldX, worldZ, maximo, radio);
    return soporte > alturaActual && soporte <= maximo ? soporte : alturaActual;
  }

  function recalcularNivelActual(x, z) {
    if (!posicionHorizontalValida(x, z)) return;
    let nivel = nivelFondo - 1;
    for (let y = nivelMaximoColocacion; y >= nivelFondo; y -= 1) {
      const bloque = bloques.get(claveBloque(x, y, z));
      if (!bloque || !TIPOS_TERRENO.has(bloque.tipo)) continue;
      nivel = y;
      break;
    }
    nivelesActuales[indiceColumna(x, z)] = nivel;
  }

  function regionCeldaActiva(x, z) {
    const region = obtenerRegionCelda(x, z, TAMANO_REGION);
    return regionesActivas.has(claveRegion(region.x, region.z));
  }

  function nivelEn(x, z) {
    return nivelesBase[indiceColumna(x, z)];
  }

  function indiceColumna(x, z) {
    return z * tamanoCuadricula + x;
  }

  function posicionHorizontalValida(x, z) {
    return (
      Number.isInteger(x) &&
      Number.isInteger(z) &&
      x >= 0 &&
      x < tamanoCuadricula &&
      z >= 0 &&
      z < tamanoCuadricula
    );
  }

  function posicionValida(x, y, z) {
    return (
      posicionHorizontalValida(x, z) &&
      Number.isInteger(y) &&
      y >= nivelFondo &&
      y <= nivelMaximoColocacion
    );
  }

  function limitarIndice(valor) {
    return Math.max(2, Math.min(tamanoCuadricula - 3, valor));
  }

  function crearDatosBloque(x, y, z, tipo, generado) {
    return { x, y, z, tipo, generado, clave: claveBloque(x, y, z) };
  }

  function claveBloque(x, y, z) {
    return (
      (y - nivelBaseClave) * areaClave +
      (z + 1) * anchoClave +
      (x + 1)
    );
  }

  function normalizarCambios(cambios) {
    if (!Array.isArray(cambios)) return [];
    return cambios
      .slice(0, 40_000)
      .map((cambio) => ({
        x: Math.floor(Number(cambio?.x)),
        y: Math.floor(Number(cambio?.y)),
        z: Math.floor(Number(cambio?.z)),
        tipo: String(cambio?.tipo || ""),
      }))
      .filter(
        (cambio) =>
          posicionValida(cambio.x, cambio.y, cambio.z) &&
          TIPOS_RECOLECTABLES.includes(cambio.tipo),
      );
  }

  function serializarCambios(mapa) {
    return [...mapa.values()].map(({ x, y, z, tipo }) => ({ x, y, z, tipo }));
  }
}

function calcularNivelSuperficie(x, z, tamano, semilla, plantilla) {
  const nx = x - (tamano - 1) / 2;
  const nz = z - (tamano - 1) / 2;
  const desplazamientoX = (semilla % 997) * 0.0037;
  const desplazamientoZ = (Math.floor(semilla / 997) % 991) * 0.0041;
  const ondas =
    Math.sin((nx + desplazamientoX) * 0.29) * 0.35 +
    Math.cos((nz + desplazamientoZ) * 0.33) * 0.27 +
    Math.sin((nx + nz + desplazamientoX) * 0.18) * 0.2;
  if (plantilla.legada) return Math.round(ondas * 1.15);
  const montanas = Math.max(
    0,
    Math.sin((nx + semilla * 0.00011) * 0.055) +
      Math.cos((nz - semilla * 0.00013) * 0.061) -
      0.72,
  );
  const cresta = Math.max(
    0,
    Math.sin((nx + nz) * 0.038 + semilla * 0.00009) - 0.36,
  );
  const alturaMontana =
    (montanas ** 1.7 * 7.5 + cresta ** 2 * 3.2) * plantilla.pesos.montanas;
  return Math.max(-3, Math.min(18, Math.round(ondas * 1.4 + alturaMontana)));
}

function interpolarAltura(
  THREE,
  niveles,
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
  const altura = (x, z) => (
    niveles[z * tamanoCuadricula + x] + 0.5
  ) * tamanoBloque;
  const a = THREE.MathUtils.lerp(altura(x0, z0), altura(x1, z0), tx);
  const b = THREE.MathUtils.lerp(altura(x0, z1), altura(x1, z1), tx);
  return THREE.MathUtils.lerp(a, b, tz);
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

function hash3D(x, y, z, semilla = 0) {
  const valor =
    Math.sin(x * 127.1 + y * 74.7 + z * 311.7 + semilla * 0.000137) *
    43758.5453;
  return valor - Math.floor(valor);
}

function numeroFinito(valor, respaldo) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : respaldo;
}
