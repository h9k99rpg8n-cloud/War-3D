const NOMBRE_BASE = "war-3d";
const VERSION_BASE = 1;
const ALMACEN_MUNDOS = "mundos";
const TAMANOS_VALIDOS = new Set([64, 96, 128]);
const DIFICULTADES_VALIDAS = new Set(["pacifica", "normal", "dificil"]);
const TIEMPOS_VALIDOS = new Set(["normal", "siempre_dia", "siempre_noche"]);

export async function crearAlmacenMundos(openDB) {
  const base = typeof openDB === "function"
    ? await abrirConIdb(openDB)
    : await abrirIndexedDBNativo();

  navigator.storage?.persist?.().catch(() => false);

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
    },
  });
  return {
    obtenerTodos: () => base.getAll(ALMACEN_MUNDOS),
    obtener: (id) => base.get(ALMACEN_MUNDOS, id),
    guardar: (mundo) => base.put(ALMACEN_MUNDOS, mundo),
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
    },
  );
  return {
    obtenerTodos: () => ejecutar(base, "readonly", (almacen) => almacen.getAll()),
    obtener: (id) => ejecutar(base, "readonly", (almacen) => almacen.get(id)),
    guardar: (mundo) => ejecutar(base, "readwrite", (almacen) => almacen.put(mundo)),
  };
}

function ejecutar(base, modo, operacion) {
  return new Promise((resolve, reject) => {
    const transaccion = base.transaction(ALMACEN_MUNDOS, modo);
    const peticion = operacion(transaccion.objectStore(ALMACEN_MUNDOS));
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

function normalizarMundoGuardado(datos = {}) {
  const modo = datos.modo === "creativo" ? "creativo" : "supervivencia";
  const tamanoSolicitado = Number(datos.tamanoMundo);
  const nombreMundo = String(datos.nombreMundo || "Mi mundo").trim().slice(0, 24) || "Mi mundo";
  const ahora = new Date().toISOString();
  return {
    id: String(datos.id || crearIdMundo()),
    nombreMundo,
    modo,
    tipoMundo:
      modo === "creativo" && datos.tipoMundo === "plano" ? "plano" : "normal",
    tamanoMundo: TAMANOS_VALIDOS.has(tamanoSolicitado) ? tamanoSolicitado : 128,
    dificultad: DIFICULTADES_VALIDAS.has(datos.dificultad)
      ? datos.dificultad
      : "normal",
    tiempo: TIEMPOS_VALIDOS.has(datos.tiempo) ? datos.tiempo : "normal",
    semilla: Number.isFinite(Number(datos.semilla)) ? Number(datos.semilla) : crearSemilla(),
    creadoEn: fechaValida(datos.creadoEn) ? datos.creadoEn : ahora,
    modificadoEn: fechaValida(datos.modificadoEn) ? datos.modificadoEn : ahora,
    progreso: datos.progreso && typeof datos.progreso === "object"
      ? clonarSeguro(datos.progreso)
      : null,
  };
}

function crearIdMundo() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `mundo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function crearSemilla() {
  const valores = new Uint32Array(1);
  crypto.getRandomValues?.(valores);
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
