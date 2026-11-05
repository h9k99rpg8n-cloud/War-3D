/**
 * Catálogo de sonidos de War 3D.
 *
 * Cada sonido se construye por capas, como en un estudio real:
 *   1. transitorio  → el "golpe" seco que da el ataque
 *   2. cuerpo       → ruido filtrado que define el material
 *   3. cola         → pequeña reverberación que da espacio
 *
 * No hay archivos: todo sale de estas funciones. Cada entrada del catálogo
 * declara varias variantes para que el mismo golpe nunca suene idéntico.
 */
import {
  FRECUENCIA_MUESTREO,
  aplicar,
  crearAleatorio,
  envolvente,
  escalar,
  filtro,
  fundir,
  limitarMuestras,
  mezclar,
  multiplicar,
  normalizar,
  oscilador,
  reverberar,
  ruido,
  ruidoMarron,
  saturar,
  variarTono,
} from "./dsp.js";

const MS = 1000;

/* ------------------------------------------------------------------ *
 * Materiales: cada familia de bloque tiene una firma acústica distinta
 * ------------------------------------------------------------------ */

function transitorio(duracionMs, aleatorio, { frecuencia, q, ganancia = 1, tipo = "bandpass" } = {}) {
  const corto = ruido(duracionMs / MS, aleatorio);
  return aplicar(
    corto,
    (datos) => filtro(datos, { tipo, f: frecuencia, q }),
    (datos) => multiplicar(datos, envolvente(datos.length, { ataque: 0.0004, caida: 26, curva: 2 })),
    (datos) => escalar(datos, ganancia),
  );
}

function golpe(duracionMs, aleatorio, { desde = 150, hasta = 55, ganancia = 0.9 } = {}) {
  const duracion = duracionMs / MS;
  const cuerpo = oscilador(
    (t) => desde + (hasta - desde) * t,
    duracion,
    { tipo: "sine" },
  );
  return aplicar(
    cuerpo,
    (datos) => multiplicar(datos, envolvente(datos.length, { ataque: 0.0008, caida: 9, curva: 2.4 })),
    (datos) => escalar(datos, ganancia),
  );
}

function cuerpoFiltrado(
  duracionMs,
  aleatorio,
  { tipoRuido = "marron", filtroTipo = "bandpass", desde = 900, hasta = 500, q = 1.2, ganancia = 1, caida = 5, curva = 3 } = {},
) {
  const duracion = duracionMs / MS;
  const base = tipoRuido === "marron"
    ? ruidoMarron(duracion, aleatorio)
    : ruido(duracion, aleatorio);
  return aplicar(
    base,
    (datos) => filtro(datos, {
      tipo: filtroTipo,
      f: (t) => desde + (hasta - desde) * t,
      q,
    }),
    (datos) => multiplicar(datos, envolvente(datos.length, { ataque: 0.001, caida, curva })),
    (datos) => escalar(datos, ganancia),
  );
}

/* ------------------------------------------------------------------ *
 * Bloques
 * ------------------------------------------------------------------ */

const MATERIALES = {
  tierra: {
    duracion: 0.26,
    capas: (aleatorio) => [
      { datos: golpe(120, aleatorio, { desde: 128, hasta: 48, ganancia: 0.85 }), ganancia: 0.9 },
      { datos: cuerpoFiltrado(240, aleatorio, { desde: 720, hasta: 320, q: 0.9, ganancia: 1, caida: 5.5 }), ganancia: 0.7 },
      { datos: transitorio(40, aleatorio, { frecuencia: 1800, q: 0.9, ganancia: 0.5 }), ganancia: 0.5 },
    ],
  },
  piedra: {
    duracion: 0.3,
    capas: (aleatorio) => [
      { datos: transitorio(60, aleatorio, { frecuencia: 2900, q: 1.4, ganancia: 0.95 }), ganancia: 0.9 },
      { datos: golpe(150, aleatorio, { desde: 190, hasta: 70, ganancia: 0.6 }), ganancia: 0.55 },
      { datos: cuerpoFiltrado(280, aleatorio, { filtroTipo: "bandpass", desde: 2400, hasta: 900, q: 1.8, ganancia: 0.8, caida: 6 }), ganancia: 0.6 },
      { datos: aplicar(oscilador((t) => 1180 + t * 240, 0.18), (d) => multiplicar(d, envolvente(d.length, { ataque: 0.001, caida: 16, curva: 3 }))), ganancia: 0.12 },
    ],
  },
  madera: {
    duracion: 0.28,
    capas: (aleatorio) => [
      { datos: transitorio(45, aleatorio, { frecuencia: 1500, q: 3.2, ganancia: 0.9 }), ganancia: 0.7 },
      { datos: golpe(150, aleatorio, { desde: 240, hasta: 96, ganancia: 0.8 }), ganancia: 0.7 },
      { datos: cuerpoFiltrado(260, aleatorio, { desde: 1150, hasta: 520, q: 2.6, ganancia: 0.9, caida: 7 }), ganancia: 0.55 },
      { datos: aplicar(oscilador((t) => 430 + t * 120, 0.2, { tipo: "triangle" }), (d) => multiplicar(d, envolvente(d.length, { ataque: 0.002, caida: 14, curva: 3 }))), ganancia: 0.16 },
    ],
  },
  arena: {
    duracion: 0.24,
    capas: (aleatorio) => [
      { datos: cuerpoFiltrado(220, aleatorio, { filtroTipo: "highpass", desde: 2600, hasta: 1800, q: 0.7, ganancia: 0.9, caida: 4 }), ganancia: 0.8 },
      { datos: golpe(100, aleatorio, { desde: 96, hasta: 42, ganancia: 0.45 }), ganancia: 0.4 },
    ],
  },
  hojas: {
    duracion: 0.22,
    capas: (aleatorio) => [
      { datos: cuerpoFiltrado(200, aleatorio, { filtroTipo: "highpass", desde: 3200, hasta: 2400, q: 0.6, ganancia: 0.85, caida: 3.5 }), ganancia: 0.75 },
      { datos: cuerpoFiltrado(180, aleatorio, { desde: 2200, hasta: 1400, q: 1.1, ganancia: 0.5, caida: 5 }), ganancia: 0.45 },
    ],
  },
  cristal: {
    duracion: 0.42,
    capas: (aleatorio) => [
      { datos: transitorio(50, aleatorio, { frecuencia: 5200, q: 2.4, ganancia: 0.9 }), ganancia: 0.8 },
      { datos: aplicar(oscilador((t) => 2400 - t * 500, 0.35), (d) => multiplicar(d, envolvente(d.length, { ataque: 0.0008, caida: 12, curva: 3 }))), ganancia: 0.32 },
      { datos: aplicar(oscilador((t) => 3650 - t * 700, 0.3), (d) => multiplicar(d, envolvente(d.length, { ataque: 0.0008, caida: 15, curva: 3 })), (d) => escalar(d, 0.4)), ganancia: 0.24 },
      { datos: cuerpoFiltrado(300, aleatorio, { filtroTipo: "highpass", desde: 4200, hasta: 2600, q: 1, ganancia: 0.6, caida: 8 }), ganancia: 0.35 },
    ],
  },
  mineral: {
    duracion: 0.36,
    capas: (aleatorio) => [
      { datos: transitorio(60, aleatorio, { frecuencia: 3100, q: 1.6, ganancia: 0.95 }), ganancia: 0.85 },
      { datos: golpe(150, aleatorio, { desde: 200, hasta: 74, ganancia: 0.6 }), ganancia: 0.5 },
      { datos: aplicar(oscilador((t) => 1560 + t * 90, 0.28, { tipo: "triangle" }), (d) => multiplicar(d, envolvente(d.length, { ataque: 0.001, caida: 13, curva: 3 }))), ganancia: 0.3 },
      { datos: cuerpoFiltrado(260, aleatorio, { desde: 2700, hasta: 1100, q: 2, ganancia: 0.7, caida: 7 }), ganancia: 0.45 },
    ],
  },
  agua: {
    duracion: 0.4,
    capas: (aleatorio) => [
      { datos: cuerpoFiltrado(380, aleatorio, { filtroTipo: "lowpass", desde: 2600, hasta: 700, q: 1.2, ganancia: 0.9, caida: 4.5 }), ganancia: 0.8 },
      { datos: aplicar(oscilador((t) => 420 - t * 260, 0.3), (d) => multiplicar(d, envolvente(d.length, { ataque: 0.004, caida: 9, curva: 2 }))), ganancia: 0.2 },
    ],
  },
  estacion: {
    duracion: 0.3,
    capas: (aleatorio) => [
      { datos: transitorio(45, aleatorio, { frecuencia: 1300, q: 2.8, ganancia: 0.8 }), ganancia: 0.6 },
      { datos: golpe(140, aleatorio, { desde: 260, hasta: 90, ganancia: 0.75 }), ganancia: 0.6 },
      { datos: aplicar(oscilador((t) => 690 + t * 60, 0.22, { tipo: "triangle" }), (d) => multiplicar(d, envolvente(d.length, { ataque: 0.002, caida: 12, curva: 3 }))), ganancia: 0.22 },
    ],
  },
};

export const MATERIALES_SONIDO = Object.freeze(Object.keys(MATERIALES));

function construirMaterial(nombre, semilla) {
  const definicion = MATERIALES[nombre];
  const aleatorio = crearAleatorio(semilla);
  const capas = definicion.capas(aleatorio);
  const datos = mezclar(capas, definicion.duracion);
  return fundir(normalizar(limitarMuestras(datos), 0.86), { salidaMs: 14 });
}

/* ------------------------------------------------------------------ *
 * Criaturas
 * ------------------------------------------------------------------ */

/** Araña: clics quitinosos, frotamiento de mandíbulas y chirrido agudo. */
function aranaAtaque(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.62;
  const capas = [];

  // Chirrido: dos dientes de sierra disonantes con vibrato rápido.
  for (const [base, desvio] of [[640, 0.03], [910, 0.045]]) {
    const diente = oscilador(
      (t) => base * (1 + Math.sin(t * 92) * desvio) + Math.sin(t * 17) * 24,
      duracion,
      { tipo: "saw" },
    );
    const formado = aplicar(
      diente,
      (d) => filtro(d, { tipo: "bandpass", f: (t) => 1500 + 2600 * t, q: 3.4 }),
      (d) => multiplicar(d, envolvente(d.length, { ataque: 0.012, caida: 3.4, curva: 2.2 })),
      (d) => escalar(d, 0.3),
    );
    capas.push({ datos: formado, ganancia: 0.5 });
  }

  // Frotar quitina: ráfagas rápidas de ruido de banda alta.
  const frotar = ruido(duracion, aleatorio);
  const modulacion = new Float32Array(frotar.length);
  for (let i = 0; i < frotar.length; i += 1) {
    const t = i / FRECUENCIA_MUESTREO;
    modulacion[i] = 0.35 + 0.65 * Math.abs(Math.sin(Math.PI * 38 * t));
  }
  capas.push({
    datos: aplicar(
      multiplicar(frotar, modulacion),
      (d) => filtro(d, { tipo: "bandpass", f: (t) => 2600 + 1800 * t, q: 1.6 }),
      (d) => multiplicar(d, envolvente(d.length, { ataque: 0.01, caida: 2.6, curva: 1.8 })),
    ),
    ganancia: 0.42,
  });

  // Clic del quelícero al final del ataque.
  capas.push({
    datos: transitorio(70, aleatorio, { frecuencia: 3600, q: 4, ganancia: 0.8 }),
    desplazamiento: 0.36,
    ganancia: 0.55,
  });

  // Golpe de patas al saltar.
  capas.push({ datos: golpe(120, aleatorio, { desde: 120, hasta: 44, ganancia: 0.6 }), ganancia: 0.35 });

  return aplicar(
    mezclar(capas, duracion),
    (d) => reverberar(d, { mezcla: 0.2, tiempos: [0.021, 0.033, 0.047], realimentacion: 0.5 }),
    (d) => saturar(d, 1.25),
    (d) => fundir(normalizar(limitarMuestras(d), 0.9), { salidaMs: 30 }),
  );
}

function aranaPaso(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.12;
  const capas = [
    { datos: transitorio(30, aleatorio, { frecuencia: 3200, q: 3.5, ganancia: 0.8 }), ganancia: 0.6 },
    { datos: golpe(70, aleatorio, { desde: 190, hasta: 92, ganancia: 0.5 }), ganancia: 0.35 },
    { datos: cuerpoFiltrado(90, aleatorio, { desde: 2400, hasta: 1200, q: 2.2, ganancia: 0.5, caida: 9 }), ganancia: 0.3 },
  ];
  return aplicar(
    mezclar(capas, duracion),
    (d) => fundir(normalizar(d, 0.7), { salidaMs: 8 }),
  );
}

function aranaMuerte(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.85;
  const capas = [];
  // Caída de tono con temblor: el "chirrido agónico".
  capas.push({
    datos: aplicar(
      oscilador((t) => 900 * (1 - t * 0.62), duracion, { tipo: "saw" }),
      (d) => filtro(d, { tipo: "bandpass", f: (t) => 2200 - 1200 * t, q: 2.8 }),
      (d) => multiplicar(d, envolvente(d.length, { ataque: 0.006, caida: 2.6, curva: 1.6 })),
      (d) => escalar(d, 0.35),
    ),
    ganancia: 0.5,
  });
  // Crujido de patas que se recogen.
  for (const desplazamiento of [0.1, 0.24, 0.4, 0.58]) {
    capas.push({
      datos: transitorio(50, aleatorio, { frecuencia: 2200 + aleatorio() * 1600, q: 3, ganancia: 0.7 }),
      desplazamiento,
      ganancia: 0.3,
    });
  }
  capas.push({ datos: cuerpoFiltrado(700, aleatorio, { desde: 1400, hasta: 300, q: 1, ganancia: 0.5, caida: 3 }), ganancia: 0.3 });
  return aplicar(
    mezclar(capas, duracion),
    (d) => reverberar(d, { mezcla: 0.26 }),
    (d) => fundir(normalizar(limitarMuestras(d), 0.88), { salidaMs: 40 }),
  );
}

/** Zombi: gemido con formantes vocálicos, respiración y mandíbula. */
function zombieGemido(semilla, { agresivo = false } = {}) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = agresivo ? 0.85 : 1.35;
  const base = agresivo ? 104 : 84;

  // Fuente glotal: sierra con vibrato lento e inestable (voz "rota").
  const glotis = oscilador(
    (t) => base * (1 + Math.sin(t * 34) * 0.05 + Math.sin(t * 7.3) * 0.03),
    duracion,
    { tipo: "saw" },
  );

  // Tres formantes de "o/a" que se desplazan: eso es lo que hace sonar a voz.
  const capasFormantes = [
    { f: 430, q: 6, ganancia: 1 },
    { f: 780, q: 7, ganancia: 0.7 },
    { f: 1180, q: 8, ganancia: 0.35 },
  ].map(({ f, q, ganancia }) => ({
    datos: aplicar(
      glotis,
      (d) => filtro(d, { tipo: "bandpass", f: (t) => f * (1 + Math.sin(t * 3.1) * 0.09), q }),
      (d) => escalar(d, ganancia),
    ),
    ganancia: 0.34,
  }));

  // Aliento áspero encima de la voz.
  const aliento = aplicar(
    ruidoMarron(duracion, aleatorio),
    (d) => filtro(d, { tipo: "bandpass", f: 620, q: 0.8 }),
    (d) => multiplicar(d, envolvente(d.length, { ataque: 0.02, caida: 2, curva: 1.6 })),
    (d) => escalar(d, 0.22),
  );

  const capas = [
    ...capasFormantes,
    { datos: aliento, ganancia: 0.45 },
    // Crujido de garganta.
    {
      datos: aplicar(
        ruido(duracion, aleatorio),
        (d) => filtro(d, { tipo: "bandpass", f: 240, q: 2.5 }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.01, caida: 3, curva: 2 })),
        (d) => escalar(d, 0.12),
      ),
      ganancia: 0.5,
    },
  ];

  if (agresivo) {
    capas.push({ datos: transitorio(80, aleatorio, { frecuencia: 1900, q: 1.6, ganancia: 0.8 }), ganancia: 0.35 });
  }

  const salida = aplicar(
    mezclar(capas, duracion),
    (d) => filtro(d, { tipo: "highpass", f: 90, q: 0.7 }),
    (d) => saturar(d, agresivo ? 2.1 : 1.5),
    (d) => reverberar(d, { mezcla: 0.22, tiempos: [0.037, 0.051, 0.067] }),
    (d) => fundir(normalizar(limitarMuestras(d), 0.9), { salidaMs: 60 }),
  );
  // Pequeño temblor de cinta para que no suene sintético.
  return temblar(salida, 0.0035);
}

function zombieGolpe(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.4;
  const capas = [
    { datos: golpe(160, aleatorio, { desde: 150, hasta: 52, ganancia: 1 }), ganancia: 0.8 },
    { datos: cuerpoFiltrado(260, aleatorio, { desde: 900, hasta: 240, q: 1.1, ganancia: 0.8, caida: 6 }), ganancia: 0.5 },
    { datos: transitorio(50, aleatorio, { frecuencia: 1400, q: 1.2, ganancia: 0.7 }), ganancia: 0.4 },
    {
      datos: aplicar(
        oscilador((t) => 120 - t * 40, 0.3, { tipo: "saw" }),
        (d) => filtro(d, { tipo: "bandpass", f: 420, q: 5 }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.005, caida: 6, curva: 2 })),
      ),
      ganancia: 0.3,
    },
  ];
  return aplicar(
    mezclar(capas, duracion),
    (d) => saturar(d, 1.6),
    (d) => fundir(normalizar(limitarMuestras(d), 0.88), { salidaMs: 25 }),
  );
}

/** Esqueleto: arco tensado (crujido de madera) + silbido de flecha. */
function esqueletoArco(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.75;
  const capas = [
    // Roce de la cuerda.
    {
      datos: aplicar(
        ruido(0.34, aleatorio),
        (d) => filtro(d, { tipo: "bandpass", f: (t) => 1100 + 900 * t, q: 2.4 }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.05, caida: 3, curva: 1.4 })),
      ),
      ganancia: 0.4,
    },
    // Crujido del arco de hueso.
    {
      datos: aplicar(
        oscilador((t) => 320 + Math.sin(t * 60) * 14, 0.4, { tipo: "triangle" }),
        (d) => filtro(d, { tipo: "bandpass", f: 900, q: 6 }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.03, caida: 5, curva: 2 })),
      ),
      ganancia: 0.22,
    },
    // Silbido de la flecha al salir.
    {
      datos: aplicar(
        ruido(0.45, aleatorio),
        (d) => filtro(d, { tipo: "bandpass", f: (t) => 3400 - 2500 * t, q: 3.6 }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.004, caida: 5, curva: 2 })),
      ),
      desplazamiento: 0.28,
      ganancia: 0.5,
    },
    { datos: transitorio(40, aleatorio, { frecuencia: 2600, q: 3, ganancia: 0.7 }), desplazamiento: 0.26, ganancia: 0.3 },
  ];
  return aplicar(
    mezclar(capas, duracion),
    (d) => reverberar(d, { mezcla: 0.18 }),
    (d) => fundir(normalizar(limitarMuestras(d), 0.88), { salidaMs: 40 }),
  );
}

function esqueletoHuesos(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.55;
  const capas = [];
  for (let i = 0; i < 7; i += 1) {
    capas.push({
      datos: transitorio(35, aleatorio, {
        frecuencia: 1800 + aleatorio() * 2600,
        q: 4 + aleatorio() * 3,
        ganancia: 0.6 + aleatorio() * 0.4,
      }),
      desplazamiento: aleatorio() * 0.35,
      ganancia: 0.3 + aleatorio() * 0.25,
    });
  }
  capas.push({ datos: cuerpoFiltrado(400, aleatorio, { desde: 2200, hasta: 700, q: 1.4, ganancia: 0.5, caida: 5 }), ganancia: 0.3 });
  return aplicar(
    mezclar(capas, duracion),
    (d) => reverberar(d, { mezcla: 0.3, tiempos: [0.017, 0.029, 0.041] }),
    (d) => fundir(normalizar(limitarMuestras(d), 0.86), { salidaMs: 30 }),
  );
}

function temblar(datos, cantidad) {
  const salida = new Float32Array(datos.length);
  const aleatorio = crearAleatorio(1234);
  let desvio = 0;
  for (let i = 0; i < datos.length; i += 1) {
    if (i % 64 === 0) desvio = (aleatorio() * 2 - 1) * cantidad;
    const posicion = Math.max(0, Math.min(datos.length - 1, i + desvio * FRECUENCIA_MUESTREO));
    const indice = Math.floor(posicion);
    const resto = posicion - indice;
    salida[i] = datos[indice] * (1 - resto) + (datos[Math.min(indice + 1, datos.length - 1)] ?? 0) * resto;
  }
  return salida;
}

/* ------------------------------------------------------------------ *
 * Jugador, interfaz y ambiente
 * ------------------------------------------------------------------ */

function jugadorDano(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.42;
  const capas = [
    // Exclamación vocal corta.
    {
      datos: aplicar(
        oscilador((t) => 320 - t * 120, 0.3, { tipo: "saw" }),
        (d) => filtro(d, { tipo: "bandpass", f: (t) => 800 + 400 * t, q: 4 }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.006, caida: 7, curva: 2 })),
      ),
      ganancia: 0.4,
    },
    // Golpe seco del impacto.
    { datos: golpe(140, aleatorio, { desde: 170, hasta: 60, ganancia: 0.9 }), ganancia: 0.7 },
    { datos: transitorio(45, aleatorio, { frecuencia: 2100, q: 1.1, ganancia: 0.7 }), ganancia: 0.4 },
  ];
  return aplicar(
    mezclar(capas, duracion),
    (d) => saturar(d, 1.5),
    (d) => fundir(normalizar(limitarMuestras(d), 0.9), { salidaMs: 20 }),
  );
}

function jugadorMuerte(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 1.5;
  const capas = [
    {
      datos: aplicar(
        oscilador((t) => 280 * (1 - t * 0.75), duracion, { tipo: "saw" }),
        (d) => filtro(d, { tipo: "bandpass", f: (t) => 900 - 500 * t, q: 3 }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.01, caida: 2.2, curva: 1.5 })),
      ),
      ganancia: 0.4,
    },
    { datos: golpe(400, aleatorio, { desde: 120, hasta: 34, ganancia: 0.9 }), ganancia: 0.5 },
    { datos: cuerpoFiltrado(1200, aleatorio, { desde: 700, hasta: 180, q: 0.9, ganancia: 0.5, caida: 2.2 }), ganancia: 0.3 },
  ];
  return aplicar(
    mezclar(capas, duracion),
    (d) => reverberar(d, { mezcla: 0.3 }),
    (d) => fundir(normalizar(limitarMuestras(d), 0.9), { salidaMs: 70 }),
  );
}

function salto(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.26;
  const capas = [
    {
      datos: aplicar(
        ruido(duracion, aleatorio),
        (d) => filtro(d, { tipo: "bandpass", f: (t) => 900 + 1500 * t, q: 1.3 }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.004, caida: 5, curva: 2 })),
      ),
      ganancia: 0.6,
    },
    { datos: golpe(90, aleatorio, { desde: 150, hasta: 70, ganancia: 0.5 }), ganancia: 0.4 },
  ];
  return aplicar(mezclar(capas, duracion), (d) => fundir(normalizar(d, 0.7), { salidaMs: 16 }));
}

function recoger(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.16;
  const capas = [
    {
      datos: aplicar(
        oscilador((t) => 620 + 700 * t, 0.1, { tipo: "triangle" }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.002, caida: 9, curva: 2 })),
      ),
      ganancia: 0.35,
    },
    { datos: transitorio(30, aleatorio, { frecuencia: 2600, q: 2, ganancia: 0.6 }), desplazamiento: 0.04, ganancia: 0.3 },
  ];
  return aplicar(mezclar(capas, duracion), (d) => fundir(normalizar(d, 0.62), { salidaMs: 18 }));
}

function colocar(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.2;
  const capas = [
    { datos: golpe(120, aleatorio, { desde: 240, hasta: 96, ganancia: 0.8 }), ganancia: 0.7 },
    { datos: transitorio(40, aleatorio, { frecuencia: 1700, q: 2.2, ganancia: 0.7 }), ganancia: 0.5 },
    { datos: cuerpoFiltrado(160, aleatorio, { desde: 1300, hasta: 600, q: 1.6, ganancia: 0.6, caida: 8 }), ganancia: 0.35 },
  ];
  return aplicar(mezclar(capas, duracion), (d) => fundir(normalizar(d, 0.72), { salidaMs: 14 }));
}

function interfazClic(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.1;
  const capas = [
    { datos: transitorio(26, aleatorio, { frecuencia: 2400, q: 2.4, ganancia: 0.7 }), ganancia: 0.5 },
    {
      datos: aplicar(
        oscilador((t) => 880 - t * 300, 0.08, { tipo: "square" }),
        (d) => filtro(d, { tipo: "lowpass", f: 2600, q: 0.7 }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.001, caida: 16, curva: 2 })),
      ),
      ganancia: 0.18,
    },
  ];
  return aplicar(mezclar(capas, duracion), (d) => fundir(normalizar(d, 0.55), { salidaMs: 10 }));
}

function interfazAbrir(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.24;
  const capas = [
    {
      datos: aplicar(
        oscilador((t) => 420 + 320 * t, duracion, { tipo: "triangle" }),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.004, caida: 6, curva: 2 })),
      ),
      ganancia: 0.28,
    },
    { datos: transitorio(35, aleatorio, { frecuencia: 1800, q: 1.8, ganancia: 0.6 }), ganancia: 0.3 },
  ];
  return aplicar(mezclar(capas, duracion), (d) => fundir(normalizar(d, 0.6), { salidaMs: 24 }));
}

function crafteo(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.5;
  const capas = [];
  for (const [desplazamiento, frecuencia] of [[0, 1900], [0.1, 2400], [0.2, 2850]]) {
    capas.push({
      datos: transitorio(45, aleatorio, { frecuencia, q: 3.4, ganancia: 0.7 }),
      desplazamiento,
      ganancia: 0.28,
    });
  }
  capas.push({ datos: golpe(160, aleatorio, { desde: 210, hasta: 80, ganancia: 0.6 }), desplazamiento: 0.2, ganancia: 0.4 });
  return aplicar(
    mezclar(capas, duracion),
    (d) => reverberar(d, { mezcla: 0.2 }),
    (d) => fundir(normalizar(limitarMuestras(d), 0.8), { salidaMs: 30 }),
  );
}

function aguaSalpicar(semilla) {
  const aleatorio = crearAleatorio(semilla);
  const duracion = 0.5;
  const capas = [
    { datos: cuerpoFiltrado(450, aleatorio, { filtroTipo: "lowpass", desde: 3200, hasta: 600, q: 1.1, ganancia: 0.9, caida: 4 }), ganancia: 0.7 },
    {
      datos: aplicar(
        oscilador((t) => 520 - t * 320, 0.35),
        (d) => multiplicar(d, envolvente(d.length, { ataque: 0.004, caida: 8, curva: 2 })),
      ),
      ganancia: 0.2,
    },
  ];
  return aplicar(mezclar(capas, duracion), (d) => fundir(normalizar(d, 0.72), { salidaMs: 40 }));
}

/* ------------------------------------------------------------------ *
 * Catálogo
 * ------------------------------------------------------------------ */

/**
 * id                → identificador estable usado por el juego
 * claves            → variantes reproducidas al azar
 * categoria         → bus / bucle / criatura / interfaz
 * ganancia          → volumen relativo de la mezcla
 * distancia         → metros a los que empieza a atenuarse (solo criaturas)
 */
export const CATALOGO_SONIDOS = Object.freeze([
  ...MATERIALES_SONIDO.map((material) => ({
    id: `war:romper_${material}`,
    categoria: "bloque",
    ganancia: material === "cristal" ? 0.85 : 1,
    variantes: 4,
    generar: (semilla) => construirMaterial(material, semilla),
  })),
  {
    id: "war:colocar_bloque",
    categoria: "bloque",
    ganancia: 0.8,
    variantes: 3,
    generar: colocar,
  },
  {
    id: "war:paso_tierra",
    categoria: "paso",
    ganancia: 0.35,
    variantes: 4,
    generar: (semilla) => {
      const aleatorio = crearAleatorio(semilla);
      return aplicar(
        mezclar([
          { datos: golpe(90, aleatorio, { desde: 110, hasta: 46, ganancia: 0.7 }), ganancia: 0.6 },
          { datos: cuerpoFiltrado(140, aleatorio, { desde: 700, hasta: 300, q: 1, ganancia: 0.8, caida: 7 }), ganancia: 0.4 },
        ], 0.16),
        (d) => fundir(normalizar(d, 0.6), { salidaMs: 12 }),
      );
    },
  },
  {
    id: "war:paso_piedra",
    categoria: "paso",
    ganancia: 0.32,
    variantes: 4,
    generar: (semilla) => {
      const aleatorio = crearAleatorio(semilla);
      return aplicar(
        mezclar([
          { datos: transitorio(35, aleatorio, { frecuencia: 2600, q: 2.2, ganancia: 0.6 }), ganancia: 0.5 },
          { datos: golpe(80, aleatorio, { desde: 150, hasta: 62, ganancia: 0.5 }), ganancia: 0.4 },
        ], 0.14),
        (d) => fundir(normalizar(d, 0.55), { salidaMs: 10 }),
      );
    },
  },
  {
    id: "war:paso_madera",
    categoria: "paso",
    ganancia: 0.32,
    variantes: 3,
    generar: (semilla) => {
      const aleatorio = crearAleatorio(semilla);
      return aplicar(
        mezclar([
          { datos: golpe(90, aleatorio, { desde: 220, hasta: 92, ganancia: 0.5 }), ganancia: 0.5 },
          { datos: transitorio(32, aleatorio, { frecuencia: 1500, q: 3, ganancia: 0.5 }), ganancia: 0.35 },
        ], 0.14),
        (d) => fundir(normalizar(d, 0.55), { salidaMs: 10 }),
      );
    },
  },
  {
    id: "war:paso_arena",
    categoria: "paso",
    ganancia: 0.3,
    variantes: 3,
    generar: (semilla) => {
      const aleatorio = crearAleatorio(semilla);
      return aplicar(
        mezclar([
          { datos: cuerpoFiltrado(130, aleatorio, { filtroTipo: "highpass", desde: 2400, hasta: 1600, q: 0.7, ganancia: 0.7, caida: 6 }), ganancia: 0.6 },
          { datos: golpe(70, aleatorio, { desde: 90, hasta: 40, ganancia: 0.3 }), ganancia: 0.25 },
        ], 0.16),
        (d) => fundir(normalizar(d, 0.5), { salidaMs: 12 }),
      );
    },
  },
  {
    id: "war:arana_ataque",
    categoria: "criatura",
    ganancia: 0.95,
    distancia: 34,
    variantes: 3,
    generar: aranaAtaque,
  },
  {
    id: "war:arana_paso",
    categoria: "criatura",
    ganancia: 0.3,
    distancia: 20,
    variantes: 4,
    generar: aranaPaso,
  },
  {
    id: "war:arana_muerte",
    categoria: "criatura",
    ganancia: 0.85,
    distancia: 32,
    variantes: 2,
    generar: aranaMuerte,
  },
  {
    id: "war:zombie_gemido",
    categoria: "criatura",
    ganancia: 0.9,
    distancia: 40,
    variantes: 4,
    generar: (semilla) => zombieGemido(semilla),
  },
  {
    id: "war:zombie_ataque",
    categoria: "criatura",
    ganancia: 0.95,
    distancia: 34,
    variantes: 3,
    generar: (semilla) => zombieGemido(semilla, { agresivo: true }),
  },
  {
    id: "war:zombie_golpe",
    categoria: "criatura",
    ganancia: 0.8,
    distancia: 26,
    variantes: 3,
    generar: zombieGolpe,
  },
  {
    id: "war:esqueleto_arco",
    categoria: "criatura",
    ganancia: 0.85,
    distancia: 44,
    variantes: 3,
    generar: esqueletoArco,
  },
  {
    id: "war:esqueleto_huesos",
    categoria: "criatura",
    ganancia: 0.5,
    distancia: 24,
    variantes: 3,
    generar: esqueletoHuesos,
  },
  {
    id: "war:jugador_dano",
    categoria: "jugador",
    ganancia: 0.9,
    variantes: 3,
    generar: jugadorDano,
  },
  {
    id: "war:jugador_muerte",
    categoria: "jugador",
    ganancia: 1,
    variantes: 1,
    generar: jugadorMuerte,
  },
  {
    id: "war:salto",
    categoria: "jugador",
    ganancia: 0.45,
    variantes: 2,
    generar: salto,
  },
  {
    id: "war:recoger",
    categoria: "jugador",
    ganancia: 0.55,
    variantes: 3,
    generar: recoger,
  },
  {
    id: "war:crafteo",
    categoria: "interfaz",
    ganancia: 0.7,
    variantes: 1,
    generar: crafteo,
  },
  {
    id: "war:agua_salpicar",
    categoria: "jugador",
    ganancia: 0.6,
    variantes: 2,
    generar: aguaSalpicar,
  },
  {
    id: "war:ui_clic",
    categoria: "interfaz",
    ganancia: 0.5,
    variantes: 2,
    generar: interfazClic,
  },
  {
    id: "war:ui_abrir",
    categoria: "interfaz",
    ganancia: 0.55,
    variantes: 1,
    generar: interfazAbrir,
  },
]);

export const MAPA_MATERIAL_SONIDO = Object.freeze({
  pasto: "tierra",
  tierra: "tierra",
  arena: "arena",
  hojas: "hojas",
  madera: "madera",
  tablones: "madera",
  piedra: "piedra",
  piedra_lisa: "piedra",
  carbon_mineral: "mineral",
  hierro_mineral: "mineral",
  cristal: "cristal",
  mesa_crafteo: "estacion",
  horno: "estacion",
  agua: "agua",
});

export function sonidoDeMaterial(tipo) {
  const material = MAPA_MATERIAL_SONIDO[tipo] ?? "tierra";
  return `war:romper_${material}`;
}

export function sonidoDePaso(tipo) {
  const material = MAPA_MATERIAL_SONIDO[tipo] ?? "tierra";
  if (material === "cristal" || material === "mineral" || material === "estacion") {
    return "war:paso_piedra";
  }
  if (material === "hojas") return "war:paso_arena";
  if (material === "agua") return "war:paso_arena";
  return `war:paso_${material}`;
}

export function variantesDe(id) {
  const entrada = CATALOGO_SONIDOS.find((sonido) => sonido.id === id);
  return entrada ? entrada.variantes : 1;
}

export function obtenerEntradaSonido(id) {
  return CATALOGO_SONIDOS.find((sonido) => sonido.id === id) ?? null;
}

/**
 * Genera todas las variantes de un sonido. Se usa tanto en el navegador como
 * en las pruebas y en el exportador WAV.
 */
export function generarVariantes(id) {
  const entrada = obtenerEntradaSonido(id);
  if (!entrada) return [];
  const salida = [];
  for (let indice = 0; indice < entrada.variantes; indice += 1) {
    const semilla = semillaDe(id, indice);
    const datos = entrada.generar(semilla);
    // Cada variante se desafina un poco para que la repetición no se note.
    const factor = 1 + (indice - (entrada.variantes - 1) / 2) * 0.045;
    const variante = indice === 0 ? datos : variarTono(datos, factor);
    salida.push({
      datos: variante,
      frecuenciaMuestreo: FRECUENCIA_MUESTREO,
      ganancia: entrada.ganancia ?? 1,
    });
  }
  return salida;
}

function semillaDe(id, indice) {
  let hash = 2166136261;
  const texto = `${id}:${indice}`;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}
