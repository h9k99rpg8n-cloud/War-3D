/**
 * Motor de audio de War 3D.
 *
 * No descarga archivos: sintetiza cada sonido con el DSP de `dsp.js` y lo
 * convierte a `AudioBuffer` en el navegador. La generación se reparte en
 * pequeñas tareas para que no haya tirones al empezar la partida.
 */
import { CATALOGO_SONIDOS, generarVariantes } from "./catalogoSonidos.js";

const ORDEN_PRIORIDAD = [
  "war:ui_clic",
  "war:ui_abrir",
  "war:romper_piedra",
  "war:romper_tierra",
  "war:romper_madera",
  "war:romper_arena",
  "war:romper_hojas",
  "war:romper_cristal",
  "war:romper_mineral",
  "war:romper_estacion",
  "war:colocar_bloque",
  "war:salto",
  "war:recoger",
  "war:arana_ataque",
  "war:zombie_gemido",
  "war:zombie_ataque",
  "war:zombie_golpe",
  "war:jugador_dano",
  "war:paso_tierra",
  "war:paso_piedra",
  "war:paso_madera",
  "war:paso_arena",
  "war:esqueleto_arco",
  "war:esqueleto_huesos",
  "war:arana_muerte",
  "war:jugador_muerte",
  "war:crafteo",
  "war:arena",
  "war:agua_salpicar",
  "war:arana_paso",
];

const GANANCIAS_CATEGORIA = {
  bloque: 1,
  paso: 0.9,
  criatura: 1,
  jugador: 1,
  interfaz: 1,
};

export function crearMotorAudio(opciones = {}) {
  const estado = {
    contexto: null,
    maestro: null,
    compresor: null,
    volumen: normalizarVolumen(opciones.volumen, 80),
    silenciado: opciones.silenciado === true,
    buffers: new Map(),
    pendientes: [],
    generando: false,
    generados: 0,
    total: 0,
    ultimoUso: new Map(),
    listo: false,
    fallo: null,
  };

  actualizarMezcla();

  return {
    /** Debe llamarse desde un gesto del usuario (clic o toque). */
    activar,
    desbloquear: activar,
    reproducir,
    reproducirEn,
    actualizarOyente,
    detenerTodo,
    establecerVolumen,
    alternarSilencio,
    obtenerEstado,
    precargar,
    crearPannerDePrueba,
    _estado: estado,
  };

  /* ---------------------------------------------------------------- */

  function actualizarMezcla() {
    if (!estado.maestro) return;
    const ganancia = estado.silenciado ? 0 : estado.volumen / 100;
    const ahora = estado.contexto.currentTime;
    estado.maestro.gain.cancelScheduledValues(ahora);
    estado.maestro.gain.setTargetAtTime(ganancia * 0.9, ahora, 0.02);
  }

  function activar() {
    if (estado.fallo) return false;
    try {
      if (!estado.contexto) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) {
          estado.fallo = "sin_audiocontext";
          return false;
        }
        const contexto = new Ctor({ latencyHint: "interactive" });
        estado.contexto = contexto;

        // Cadena: fuentes → maestro → compresor → salida
        const maestro = contexto.createGain();
        maestro.gain.value = 0;
        const compresor = contexto.createDynamicsCompressor();
        compresor.threshold.value = -16;
        compresor.knee.value = 22;
        compresor.ratio.value = 5;
        compresor.attack.value = 0.004;
        compresor.release.value = 0.18;
        maestro.connect(compresor);
        compresor.connect(contexto.destination);
        estado.maestro = maestro;
        estado.compresor = compresor;
        actualizarMezcla();
        programarGeneracion();
      }
      if (estado.contexto.state === "suspended") {
        estado.contexto.resume().catch(() => {});
      }
      return true;
    } catch (error) {
      estado.fallo = String(error?.message || error);
      return false;
    }
  }

  function programarGeneracion() {
    if (estado.generando) return;
    estado.generando = true;

    const cola = [...CATALOGO_SONIDOS].sort((a, b) => {
      const ia = ORDEN_PRIORIDAD.indexOf(a.id);
      const ib = ORDEN_PRIORIDAD.indexOf(b.id);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    estado.total = cola.reduce((suma, entrada) => suma + entrada.variantes, 0);

    let indice = 0;
    const paso = () => {
      if (!estado.contexto) return;
      const inicio = performance.now();
      // Genera durante ~6 ms por tarea y cede el hilo.
      while (indice < cola.length && performance.now() - inicio < 6) {
        const entrada = cola[indice];
        const variantes = generarVariantes(entrada.id);
        estado.buffers.set(
          entrada.id,
          variantes.map((variante) => ({
            buffer: convertirABuffer(estado.contexto, variante),
            distancia: entrada.distancia ?? 0,
          })),
        );
        estado.generados += variantes.length;
        indice += 1;
      }
      if (indice < cola.length) {
        aplazar(paso);
      } else {
        estado.generando = false;
        estado.listo = true;
      }
    };
    aplazar(paso);
  }

  function precargar(id) {
    if (!estado.contexto || estado.buffers.has(id)) return;
    const entrada = CATALOGO_SONIDOS.find((sonido) => sonido.id === id);
    if (!entrada) return;
    const variantes = generarVariantes(id);
    estado.buffers.set(
      id,
      variantes.map((variante) => ({
        buffer: convertirABuffer(estado.contexto, variante),
        distancia: entrada.distancia ?? 0,
      })),
    );
  }

  function reproducir(id, opciones2 = {}) {
    if (!estado.contexto || estado.silenciado) return null;
    const variantes = estado.buffers.get(id);
    if (!variantes || variantes.length === 0) {
      if (!estado.generando) precargar(id);
      return null;
    }
    const minimoEntre = opciones2.minimoEntreMs ?? 55;
    const ahora = performance.now();
    const ultimo = estado.ultimoUso.get(id) ?? 0;
    if (ahora - ultimo < minimoEntre) return null;
    estado.ultimoUso.set(id, ahora);

    const elegida = variantes[Math.floor(Math.random() * variantes.length)];
    const fuente = estado.contexto.createBufferSource();
    fuente.buffer = elegida.buffer;
    fuente.playbackRate.value = 0.94 + Math.random() * 0.12;

    const ganancia = estado.contexto.createGain();
    ganancia.gain.value = (opciones2.volumen ?? 1) * (opciones2.ganancia ?? 1);
    fuente.connect(ganancia);
    ganancia.connect(estado.maestro);
    if (opciones2.retardo) {
      try {
        fuente.start(estado.contexto.currentTime + opciones2.retardo);
      } catch {
        fuente.start();
      }
    } else {
      fuente.start();
    }
    return fuente;
  }

  /** Sonido posicional: atenúa y panea según la cámara del jugador. */
  function reproducirEn(id, posicion, opciones2 = {}) {
    if (!estado.contexto || estado.silenciado || !posicion) return null;
    const variantes = estado.buffers.get(id);
    if (!variantes || variantes.length === 0) {
      if (!estado.generando) precargar(id);
      return null;
    }
    const distanciaMaxima = variantes[0].distancia || 28;
    const lugar = redondear(posicion);
    if (opciones2.oyente) {
      const dx = lugar.x - opciones2.oyente.x;
      const dz = lugar.z - opciones2.oyente.z;
      const distancia = Math.hypot(dx, dz);
      if (distancia > distanciaMaxima) return null;
    }

    const minimoEntre = opciones2.minimoEntreMs ?? 60;
    const ahora = performance.now();
    const ultimo = estado.ultimoUso.get(id) ?? 0;
    if (ahora - ultimo < minimoEntre) return null;
    estado.ultimoUso.set(id, ahora);

    const elegida = variantes[Math.floor(Math.random() * variantes.length)];
    const fuente = estado.contexto.createBufferSource();
    fuente.buffer = elegida.buffer;
    fuente.playbackRate.value = 0.9 + Math.random() * 0.16;

    const panner = estado.contexto.createPanner();
    panner.panningModel = "equalpower";
    panner.distanceModel = "inverse";
    panner.refDistance = 6;
    panner.maxDistance = distanciaMaxima;
    panner.rolloffFactor = 1.15;
    colocarPanner(panner, lugar);

    const ganancia = estado.contexto.createGain();
    ganancia.gain.value = (opciones2.volumen ?? 1) * (opciones2.ganancia ?? 1);
    fuente.connect(ganancia);
    ganancia.connect(panner);
    panner.connect(estado.maestro);
    fuente.start();
    return fuente;
  }

  function actualizarOyente(posicion, giro = 0) {
    if (!estado.contexto || !posicion) return;
    const oyente = estado.contexto.listener;
    const x = Number(posicion.x) || 0;
    const y = Number(posicion.y) || 0;
    const z = Number(posicion.z) || 0;
    const adelanteX = -Math.sin(Number(giro) || 0);
    const adelanteZ = -Math.cos(Number(giro) || 0);
    if (oyente.positionX) {
      oyente.positionX.setTargetAtTime(x, estado.contexto.currentTime, 0.01);
      oyente.positionY.setTargetAtTime(y, estado.contexto.currentTime, 0.01);
      oyente.positionZ.setTargetAtTime(z, estado.contexto.currentTime, 0.01);
      oyente.forwardX.setTargetAtTime(adelanteX, estado.contexto.currentTime, 0.01);
      oyente.forwardY.setTargetAtTime(0, estado.contexto.currentTime, 0.01);
      oyente.forwardZ.setTargetAtTime(adelanteZ, estado.contexto.currentTime, 0.01);
      oyente.upX.setTargetAtTime(0, estado.contexto.currentTime, 0.01);
      oyente.upY.setTargetAtTime(1, estado.contexto.currentTime, 0.01);
      oyente.upZ.setTargetAtTime(0, estado.contexto.currentTime, 0.01);
    } else if (oyente.setPosition) {
      oyente.setPosition(x, y, z);
      oyente.setOrientation(adelanteX, 0, adelanteZ, 0, 1, 0);
    }
  }

  function detenerTodo() {
    if (!estado.maestro) return;
    const ahora = estado.contexto.currentTime;
    estado.maestro.gain.cancelScheduledValues(ahora);
    estado.maestro.gain.setTargetAtTime(0, ahora, 0.03);
    estado.maestro.gain.setTargetAtTime(
      estado.silenciado ? 0 : (estado.volumen / 100) * 0.9,
      ahora + 0.12,
      0.05,
    );
  }

  function establecerVolumen(porcentaje) {
    estado.volumen = normalizarVolumen(porcentaje, estado.volumen);
    actualizarMezcla();
  }

  function alternarSilencio(silenciado) {
    estado.silenciado = silenciado === undefined ? !estado.silenciado : Boolean(silenciado);
    actualizarMezcla();
    return estado.silenciado;
  }

  function obtenerEstado() {
    return {
      activo: Boolean(estado.contexto),
      generados: estado.generados,
      total: estado.total,
      listo: estado.listo,
      silenciado: estado.silenciado,
      volumen: estado.volumen,
      fallo: estado.fallo,
    };
  }

  /** Solo para pruebas de esfuerzo del panner. */
  function crearPannerDePrueba() {
    if (!estado.contexto) return null;
    const panner = estado.contexto.createPanner();
    panner.panningModel = "equalpower";
    return panner;
  }
}

function normalizarVolumen(valor, respaldo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return respaldo;
  return Math.max(0, Math.min(100, numero));
}

function aplazar(tarea) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => tarea(), { timeout: 60 });
  } else {
    setTimeout(tarea, 0);
  }
}

function convertirABuffer(contexto, { datos, frecuenciaMuestreo }) {
  const buffer = contexto.createBuffer(1, datos.length, frecuenciaMuestreo);
  buffer.copyToChannel(datos, 0);
  return buffer;
}

function redondear(posicion) {
  return {
    x: Number(posicion.x) || 0,
    y: Number(posicion.y) || 0,
    z: Number(posicion.z) || 0,
  };
}

function colocarPanner(panner, { x, y, z }) {
  if (panner.positionX) {
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  } else if (panner.setPosition) {
    panner.setPosition(x, y, z);
  }
}

export { GANANCIAS_CATEGORIA };
