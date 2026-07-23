import {
  ID_PLANTILLA_LEGADA,
  ID_PLANTILLA_PLANA,
  esPlantillaPermitida,
  seleccionarPlantillaMundo,
} from "../generacion/plantillasMundo.js";

const NOMBRE_BASE = "war-3d";
const VERSION_BASE = 2;
const ALMACEN_MUNDOS = "mundos";
const ALMACEN_RESPALDOS = "respaldos-migracion";
export const VERSION_MUNDO_ACTUAL = 3;
const TAMANOS_VALIDOS = new Set([64, 96, 128, 192, 256]);
const DIFICULTADES_VALIDAS = new Set(["pacifica", "normal", "dificil"]);
const TIEMPOS_VALIDOS = new Set(["normal", "siempre_dia", "siempre_noche"]);
const ESTILOS_VISUALES_VALIDOS = new Set(["traditional", "pixelar"]);
const PERFILES_VALIDOS = new Set(["basico", "equilibrado", "alto", "personalizado"]);
const JOYSTICKS_VALIDOS = new Set(["traditional", "dark", "pixel"]);

export async function crearAlmacenMundos(openDB) {
  const base = typeof openDB === "function"
    ? await abrirConIdb(openDB)
    : await abrirIndexedDBNativo();

  Promise.resolve(globalThis.navigator?.storage?.persist?.()).catch(() => false);

  return {
    async listarMundos() {
      const mundos = await base.obtenerTodos();
      return mundos
        .map(normalizarMundoGuardado)
        .sort((a, b) => Date.parse(b.modificadoEn) - Date.parse(a.modificadoEn));
    },

    async crearMundo(datos = {}) {
      const ahora = new Date().toISOString();
      const mundo = normalizarMundoGuardado({
        ...datos,
        versionMundo: VERSION_MUNDO_ACTUAL,
        id: crearIdMundo(),
        semilla: crearSemilla(),
        creadoEn: ahora,
        modificadoEn: ahora,
        progreso: null,
      });
      await base.guardar(mundo);
      return mundo;
    },

    async obtenerMundo(id) {
      const mundo = await base.obtener(id);
      return mundo ? normalizarMundoGuardado(mundo) : null;
    },

    async guardarProgreso(id, progreso) {
      const guardado = await base.obtener(id);
      if (!guardado) throw new Error("No se encontró el mundo que se intentó guardar.");
      if ((Number(guardado.versionMundo) || 1) < VERSION_MUNDO_ACTUAL) {
        await base.guardarRespaldo?.({
          id: `${id}:v${Number(guardado.versionMundo) || 1}:${Date.now()}`,
          mundoId: id,
          creadoEn: new Date().toISOString(),
          datos: clonarSeguro(guardado),
        });
      }
      const mundo = normalizarMundoGuardado({
        ...guardado,
        modificadoEn: new Date().toISOString(),
        progreso: clonarSeguro(progreso),
      });
      await base.guardar(mundo);
      return mundo;
    },
  };
}

async function abrirConIdb(openDB) {
  const base = await openDB(NOMBRE_BASE, VERSION_BASE, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(ALMACEN_MUNDOS)) {
        db.createObjectStore(ALMACEN_MUNDOS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ALMACEN_RESPALDOS)) {
        db.createObjectStore(ALMACEN_RESPALDOS, { keyPath: "id" });
      }
    },
  });
  return {
    obtenerTodos: () => base.getAll(ALMACEN_MUNDOS),
    obtener: (id) => base.get(ALMACEN_MUNDOS, id),
    guardar: (mundo) => base.put(ALMACEN_MUNDOS, mundo),
    guardarRespaldo: (respaldo) => base.put(ALMACEN_RESPALDOS, respaldo),
  };
}

async function abrirIndexedDBNativo() {
  if (!globalThis.indexedDB) {
    throw new Error("Este navegador no permite guardar mundos con IndexedDB.");
  }
  const base = await convertirPeticion(
    indexedDB.open(NOMBRE_BASE, VERSION_BASE),
    (evento) => {
      const db = evento.target.result;
      if (!db.objectStoreNames.contains(ALMACEN_MUNDOS)) {
        db.createObjectStore(ALMACEN_MUNDOS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ALMACEN_RESPALDOS)) {
        db.createObjectStore(ALMACEN_RESPALDOS, { keyPath: "id" });
      }
    },
  );
  return {
    obtenerTodos: () =>
      ejecutar(base, ALMACEN_MUNDOS, "readonly", (almacen) => almacen.getAll()),
    obtener: (id) =>
      ejecutar(base, ALMACEN_MUNDOS, "readonly", (almacen) => almacen.get(id)),
    guardar: (mundo) =>
      ejecutar(base, ALMACEN_MUNDOS, "readwrite", (almacen) => almacen.put(mundo)),
    guardarRespaldo: (respaldo) =>
      ejecutar(base, ALMACEN_RESPALDOS, "readwrite", (almacen) => almacen.put(respaldo)),
  };
}

function ejecutar(base, almacenId, modo, operacion) {
  return new Promise((resolve, reject) => {
    const transaccion = base.transaction(almacenId, modo);
    const peticion = operacion(transaccion.objectStore(almacenId));
    let resultado;
    peticion.onsuccess = () => {
      resultado = peticion.result;
    };
    peticion.onerror = () => reject(peticion.error);
    transaccion.oncomplete = () => resolve(resultado);
    transaccion.onerror = () => reject(transaccion.error);
    transaccion.onabort = () => reject(transaccion.error);
  });
}

function convertirPeticion(peticion, alActualizar) {
  return new Promise((resolve, reject) => {
    peticion.onupgradeneeded = alActualizar;
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
    peticion.onblocked = () => reject(new Error("Otra pestaña está bloqueando War 3D."));
  });
}

export function normalizarMundoGuardado(datos = {}) {
  const modo = datos.modo === "creativo" ? "creativo" : "supervivencia";
  const tamanoSolicitado = Number(datos.tamanoMundo);
  const semilla = Number.isFinite(Number(datos.semilla))
    ? Number(datos.semilla)
    : crearSemilla();
  const versionAnterior = Math.max(1, Math.floor(Number(datos.versionMundo) || 1));
  const mundoAntiguo = versionAnterior < VERSION_MUNDO_ACTUAL &&
    Boolean(datos.id || datos.progreso);
  const plantillaSolicitada = String(datos.plantillaId || "");
  const plantillaId = mundoAntiguo && !plantillaSolicitada
    ? ID_PLANTILLA_LEGADA
    : seleccionarPlantillaMundo({
        modo,
        plantillaId:
          modo === "creativo" && datos.tipoMundo === "plano"
            ? ID_PLANTILLA_PLANA
            : plantillaSolicitada,
        semilla,
      });
  const nombreMundo = String(datos.nombreMundo || "Mi mundo").trim().slice(0, 24) || "Mi mundo";
  const ahora = new Date().toISOString();
  return {
    versionMundo: VERSION_MUNDO_ACTUAL,
    id: String(datos.id || crearIdMundo()),
    nombreMundo,
    modo,
    tipoMundo:
      modo === "creativo" && plantillaId === ID_PLANTILLA_PLANA ? "plano" : "normal",
    plantillaId: esPlantillaPermitida(plantillaId, modo)
      ? plantillaId
      : seleccionarPlantillaMundo({ modo, semilla }),
    tamanoMundo: TAMANOS_VALIDOS.has(tamanoSolicitado) ? tamanoSolicitado : 128,
    dificultad: DIFICULTADES_VALIDAS.has(datos.dificultad)
      ? datos.dificultad
      : "normal",
    tiempo: TIEMPOS_VALIDOS.has(datos.tiempo) ? datos.tiempo : "normal",
    semilla,
    estiloVisual: ESTILOS_VISUALES_VALIDOS.has(datos.estiloVisual)
      ? datos.estiloVisual
      : "traditional",
    aguaExperimental: datos.aguaExperimental === true,
    perfilRendimiento: PERFILES_VALIDOS.has(datos.perfilRendimiento)
      ? datos.perfilRendimiento
      : "equilibrado",
    distanciaCarga: limitarEntero(datos.distanciaCarga, 2, 32, 6),
    joystickSkin: JOYSTICKS_VALIDOS.has(datos.joystickSkin)
      ? datos.joystickSkin
      : "traditional",
    colisionJugador: normalizarColisionJugador(datos.colisionJugador),
    creadoEn: fechaValida(datos.creadoEn) ? datos.creadoEn : ahora,
    modificadoEn: fechaValida(datos.modificadoEn) ? datos.modificadoEn : ahora,
    progreso: datos.progreso && typeof datos.progreso === "object"
      ? clonarSeguro(datos.progreso)
      : null,
  };
}

function normalizarColisionJugador(datos = {}) {
  return {
    height: limitarNumero(datos?.height, 3.2, 3.92, 3.72),
    width: limitarNumero(datos?.width, 0.78, 1.5, 1.24),
    eyeHeight: limitarNumero(datos?.eyeHeight, 2.8, 3.65, 3.34),
    stepHeight: limitarNumero(datos?.stepHeight, 0.2, 0.9, 0.72),
  };
}

function limitarEntero(valor, minimo, maximo, respaldo) {
  const numero = Math.floor(Number(valor));
  return Number.isFinite(numero)
    ? Math.max(minimo, Math.min(maximo, numero))
    : respaldo;
}

function limitarNumero(valor, minimo, maximo, respaldo) {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? Math.max(minimo, Math.min(maximo, numero))
    : respaldo;
}

function crearIdMundo() {
  const cryptoWeb = globalThis.crypto;
  if (typeof cryptoWeb?.randomUUID === "function") return cryptoWeb.randomUUID();
  return `mundo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function crearSemilla() {
  const valores = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(valores);
  return valores[0] || Math.floor(Math.random() * 0xffffffff);
}

function fechaValida(valor) {
  return typeof valor === "string" && Number.isFinite(Date.parse(valor));
}

function clonarSeguro(valor) {
  return typeof structuredClone === "function"
    ? structuredClone(valor)
    : JSON.parse(JSON.stringify(valor));
}
