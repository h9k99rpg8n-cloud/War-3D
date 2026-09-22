// @ts-check
export function crearMonitorRendimiento({
  ventanaMuestras = 180,
  intervaloPanelMs = 500,
} = {}) {
  /** @type {number[]} */
  const muestras = [];
  const acumulados = {
    frames: 0,
    aguaProcesada: 0,
    reconstruccionesMalla: 0,
    eventosTactiles: 0,
  };
  let ultimoPanel = 0;
  let cargaSostenidaMs = 0;
  let margenSostenidoMs = 0;
  /** @type {number | null} */
  let ultimoObjetivo = null;

  return {
    /** @param {number} deltaMs */
    registrarFrame(deltaMs, { objetivoMs = 1000 / 60, trabajoMs = deltaMs } = {}) {
      const valor = Math.max(0.01, Math.min(1_000, Number(deltaMs) || 16.67));
      const objetivo = Math.max(1, Number(objetivoMs) || 1000 / 60);
      const trabajo = Math.max(0, Number(trabajoMs) || 0);
      if (objetivo !== ultimoObjetivo) {
        cargaSostenidaMs = 0;
        margenSostenidoMs = 0;
        ultimoObjetivo = objetivo;
      }
      muestras.push(valor);
      if (muestras.length > ventanaMuestras) muestras.shift();
      acumulados.frames += 1;
      // La espera del limitador no es trabajo. El margen contempla la
      // cuantización de requestAnimationFrame (por ejemplo 45 FPS en 60 Hz).
      const lento = valor > objetivo * 1.5 + 1 || trabajo > objetivo;
      cargaSostenidaMs = lento
        ? Math.min(30_000, cargaSostenidaMs + valor)
        : Math.max(0, cargaSostenidaMs - valor * 2);
      margenSostenidoMs = !lento && trabajo < objetivo * 0.7
        ? Math.min(30_000, margenSostenidoMs + valor)
        : 0;
    },
    registrarAgua(cantidad = 1) {
      acumulados.aguaProcesada += Math.max(0, Math.floor(cantidad));
    },
    registrarReconstruccion(cantidad = 1) {
      acumulados.reconstruccionesMalla += Math.max(0, Math.floor(cantidad));
    },
    registrarEventoTactil(cantidad = 1) {
      acumulados.eventosTactiles += Math.max(0, Math.floor(cantidad));
    },
    /** @param {number} now */
    debeActualizarPanel(now) {
      if (now - ultimoPanel < intervaloPanelMs) return false;
      ultimoPanel = now;
      return true;
    },
    hayCargaSostenida() {
      return cargaSostenidaMs >= 8_000;
    },
    hayMargenSostenido() {
      return margenSostenidoMs >= 8_000;
    },
    reiniciarMedicion() {
      muestras.length = 0;
      cargaSostenidaMs = 0;
      margenSostenidoMs = 0;
    },
    obtenerResumen(extra = {}) {
      const ordenadas = [...muestras].sort((a, b) => a - b);
      const promedio = promedioNumeros(muestras);
      const p95 = percentil(ordenadas, 0.95);
      const maximo = ordenadas.at(-1) ?? 0;
      return Object.freeze({
        fpsPromedio: promedio > 0 ? 1_000 / promedio : 0,
        fpsMinimo: maximo > 0 ? 1_000 / maximo : 0,
        framePromedioMs: promedio,
        frameP95Ms: p95,
        framePicoMs: maximo,
        cargaSostenidaMs,
        margenSostenidoMs,
        ...acumulados,
        ...extra,
      });
    },
  };
}

/** @param {{info?: {memory?: {geometries?: number, textures?: number}}}} renderer */
export function estimarMemoriaRender(renderer) {
  const memoria = renderer?.info?.memory ?? {};
  const rendimiento = /** @type {Performance & {memory?: {usedJSHeapSize?: number}}} */ (globalThis.performance);
  return Object.freeze({
    geometries: Number(memoria.geometries) || 0,
    textures: Number(memoria.textures) || 0,
    heapBytes: Number(rendimiento?.memory?.usedJSHeapSize) || null,
  });
}

/** @param {number[]} valores */
function promedioNumeros(valores) {
  if (!valores.length) return 0;
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

/** @param {number[]} ordenadas @param {number} proporcion */
function percentil(ordenadas, proporcion) {
  if (!ordenadas.length) return 0;
  const indice = Math.min(
    ordenadas.length - 1,
    Math.max(0, Math.ceil(ordenadas.length * proporcion) - 1),
  );
  return ordenadas[indice] ?? 0;
}
