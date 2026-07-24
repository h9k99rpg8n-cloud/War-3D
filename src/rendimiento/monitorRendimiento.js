export function crearMonitorRendimiento({
  ventanaMuestras = 180,
  intervaloPanelMs = 500,
} = {}) {
  const muestras = [];
  const acumulados = {
    frames: 0,
    aguaProcesada: 0,
    reconstruccionesMalla: 0,
    eventosTactiles: 0,
  };
  let ultimoPanel = 0;
  let cargaSostenidaMs = 0;

  return {
    registrarFrame(deltaMs) {
      const valor = Math.max(0.01, Math.min(1_000, Number(deltaMs) || 16.67));
      muestras.push(valor);
      if (muestras.length > ventanaMuestras) muestras.shift();
      acumulados.frames += 1;
      cargaSostenidaMs =
        valor > 25 ? Math.min(30_000, cargaSostenidaMs + valor) : Math.max(0, cargaSostenidaMs - 50);
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
    debeActualizarPanel(now) {
      if (now - ultimoPanel < intervaloPanelMs) return false;
      ultimoPanel = now;
      return true;
    },
    hayCargaSostenida() {
      return cargaSostenidaMs >= 8_000;
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
        ...acumulados,
        ...extra,
      });
    },
  };
}

export function estimarMemoriaRender(renderer) {
  const memoria = renderer?.info?.memory ?? {};
  return Object.freeze({
    geometries: Number(memoria.geometries) || 0,
    textures: Number(memoria.textures) || 0,
    heapBytes: Number(globalThis.performance?.memory?.usedJSHeapSize) || null,
  });
}

function promedioNumeros(valores) {
  if (!valores.length) return 0;
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function percentil(ordenadas, proporcion) {
  if (!ordenadas.length) return 0;
  const indice = Math.min(
    ordenadas.length - 1,
    Math.max(0, Math.ceil(ordenadas.length * proporcion) - 1),
  );
  return ordenadas[indice];
}
